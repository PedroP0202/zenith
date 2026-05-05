import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { decode, sign } from 'hono/jwt';
import { z } from 'zod';
import { hashPassword, verifyPassword } from '../crypto';
import { authenticateRequest, getTokenSecret } from '../middleware/auth';
import { checkRateLimit, createKvRateLimitBackend } from '../middleware/rateLimit';
import { loginSchema, registerSchema, sendCodeSchema } from '../schemas/auth';
import type { Bindings } from '../types';

const authRoutes = new Hono<{ Bindings: Bindings }>();

type AuthUserRow = {
    id: string;
    name: string;
    email: string;
    password_hash: string;
    language: string;
    login_attempts: number;
    lockout_until: number;
    is_verified: number;
    opt_in_leaderboard: number;
    username: string;
    total_xp: number;
    level: number;
    arena_points: number;
    last_login_reward_date: string | null;
};

async function createSessionToken(c: { env: Bindings }, payload: { id: string; name: string; email: string }) {
    return sign(
        {
            id: payload.id,
            name: payload.name,
            email: payload.email,
            exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
        },
        getTokenSecret(c)
    );
}

function authConfigErrorResponse(c: any) {
    console.error('[AUTH] MISSING JWT_SECRET IN PRODUCTION!');
    return c.json({ error: 'Erro de configuração do servidor.' }, 500);
}

function rateLimitBackend(c: { env: Bindings }) {
    return createKvRateLimitBackend(c.env.RATE_LIMIT_KV);
}

function serializeAuthUser(user: any, overrides: { id?: string; name?: string; email?: string; language?: string; username?: string | null } = {}) {
    return {
        id: overrides.id || user?.id,
        name: overrides.name || user?.name,
        email: overrides.email || user?.email,
        language: overrides.language || user?.language || 'pt',
        username: overrides.username !== undefined ? overrides.username : user?.username,
        optInLeaderboard: user?.opt_in_leaderboard === 1,
        total_xp: user?.total_xp || 0,
        level: user?.level || 1,
        arena_points: user?.arena_points || 0,
        lastLoginRewardDate: user?.last_login_reward_date || null,
    };
}

async function generateUniqueUsername(db: D1Database, name: string): Promise<string> {
    const base = name.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 15);

    let isUnique = false;
    let finalUsername = '';
    let attempts = 0;

    while (!isUnique && attempts < 5) {
        const random = Math.floor(1000 + Math.random() * 9000);
        finalUsername = attempts === 0 ? (base || 'zen') : `${base}${random}`;

        const existing = await db.prepare('SELECT id FROM users WHERE username = ?').bind(finalUsername).first();
        if (!existing) {
            isUnique = true;
        } else {
            attempts++;
        }
    }

    if (!isUnique) {
        finalUsername = `${base}${Date.now().toString().slice(-4)}`;
    }

    return finalUsername;
}

authRoutes.post('/google', async (c) => {
    try {
        const { idToken } = await c.req.json();
        if (!idToken) return c.json({ error: 'Falta o token do Google.' }, 400);

        const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
        if (!response.ok) return c.json({ error: 'Token do Google inválido.' }, 401);
        const googleUser = await response.json() as any;

        const { email, name, sub: googleId } = googleUser;
        const db = c.env.DB;

        let user = await db.prepare('SELECT id, name, email, language, username, total_xp, level, last_login_reward_date, opt_in_leaderboard, arena_points FROM users WHERE google_id = ? OR email = ?').bind(googleId, email).first() as any;

        const now = Date.now();
        let userId;
        let userLanguage = user?.language || 'pt';
        let currentUsername = user?.username;

        if (user) {
            userId = user.id;
            await db.prepare('UPDATE users SET google_id = ? WHERE id = ?').bind(googleId, userId).run();
        } else {
            userId = crypto.randomUUID();
            currentUsername = await generateUniqueUsername(db, name || 'User');
            await db.prepare('INSERT INTO users (id, name, email, password_hash, google_id, is_verified, created_at, language, username, last_login_reward_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
                .bind(userId, name || 'User', email, 'OAUTH_USER', googleId, 1, now, userLanguage, currentUsername, null).run();
        }

        const token = await createSessionToken(c, { id: userId, name: user?.name || name, email });
        return c.json({ token, user: serializeAuthUser(user, { id: userId, name: user?.name || name, email, language: userLanguage, username: currentUsername }) });
    } catch (e: any) {
        if (e?.message === 'MISSING_JWT_SECRET') return authConfigErrorResponse(c);
        return c.json({ error: 'Erro de Autenticação Google: ' + e.message }, 500);
    }
});

authRoutes.post('/google/web', async (c) => {
    try {
        const { accessToken } = await c.req.json();
        if (!accessToken) return c.json({ error: 'Falta o token de acesso do Google (Web).' }, 400);

        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!response.ok) return c.json({ error: 'Token de acesso do Google inválido.' }, 401);
        const googleUser = await response.json() as any;

        const { email, name, sub: googleId } = googleUser;
        const db = c.env.DB;

        let user = await db.prepare('SELECT id, name, email, language, username, total_xp, level, last_login_reward_date, opt_in_leaderboard, arena_points FROM users WHERE google_id = ? OR email = ?').bind(googleId, email).first() as any;

        const now = Date.now();
        let userId;
        let userLanguage = user?.language || 'pt';
        let currentUsername = user?.username;

        if (user) {
            userId = user.id;
            await db.prepare('UPDATE users SET google_id = ? WHERE id = ?').bind(googleId, userId).run();
        } else {
            userId = crypto.randomUUID();
            currentUsername = await generateUniqueUsername(db, name || 'User');
            await db.prepare('INSERT INTO users (id, name, email, password_hash, google_id, is_verified, created_at, language, username, last_login_reward_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
                .bind(userId, name || 'User', email, 'OAUTH_USER', googleId, 1, now, userLanguage, currentUsername, null).run();
        }

        const token = await createSessionToken(c, { id: userId, name: user?.name || name, email });
        return c.json({ token, user: serializeAuthUser(user, { id: userId, name: user?.name || name, email, language: userLanguage, username: currentUsername }) });
    } catch (e: any) {
        if (e?.message === 'MISSING_JWT_SECRET') return authConfigErrorResponse(c);
        return c.json({ error: 'Erro de Autenticação Google (Web): ' + e.message }, 500);
    }
});

authRoutes.post('/apple', async (c) => {
    try {
        const { appleId, email, name, identityToken } = await c.req.json();

        if (!appleId || !identityToken) {
            console.error('[ZENITH_AUTH] Missing Apple credentials:', { appleId, hasToken: !!identityToken });
            return c.json({ error: 'Faltam dados da Apple.' }, 400);
        }

        const db = c.env.DB;
        let query = 'SELECT id, name, email, language, username, total_xp, level, last_login_reward_date, opt_in_leaderboard, arena_points FROM users WHERE apple_id = ?';
        let bindParams = [appleId] as string[];
        if (email) {
            query += ' OR email = ?';
            bindParams.push(email);
        }

        let user = await db.prepare(query).bind(...bindParams).first() as any;

        const now = Date.now();
        let userId;
        let finalEmail = email || (user ? user.email : `${appleId}@privaterelay.appleid.com`);
        let finalName = name || (user ? user.name : 'Utilizador Apple');
        let userLanguage = user?.language || 'pt';

        if (user) {
            userId = user.id;
            await db.prepare('UPDATE users SET apple_id = ? WHERE id = ?').bind(appleId, userId).run();
            finalEmail = user.email;
            finalName = user.name;
        } else {
            userId = crypto.randomUUID();
            const username = await generateUniqueUsername(db, finalName);
            await db.prepare('INSERT INTO users (id, name, email, password_hash, apple_id, is_verified, created_at, language, username, last_login_reward_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
                .bind(userId, finalName, finalEmail, 'OAUTH_USER', appleId, 1, now, userLanguage, username, null).run();
        }

        const token = await createSessionToken(c, { id: userId, name: finalName, email: finalEmail });
        console.log(`[ZENITH_AUTH] Apple Login success for ${finalEmail}`);
        const currentUsername = user?.username || (await db.prepare('SELECT username FROM users WHERE id = ?').bind(userId).first() as any)?.username || null;

        return c.json({ token, user: serializeAuthUser(user, { id: userId, name: finalName, email: finalEmail, language: userLanguage, username: currentUsername }) });
    } catch (e: any) {
        if (e?.message === 'MISSING_JWT_SECRET') return authConfigErrorResponse(c);
        console.error('[ZENITH_AUTH] Apple Auth Error:', e.message);
        return c.json({ error: 'Erro de Autenticação Apple: ' + e.message }, 500);
    }
});

authRoutes.post('/apple/callback', async (c) => {
    try {
        const formData = await c.req.formData();
        const idToken = formData.get('id_token') as string;
        const userJson = formData.get('user') as string;
        const state = formData.get('state') as string;

        if (!idToken) return c.text('Missing id_token', 400);

        const { payload } = decode(idToken);
        const appleId = payload.sub as string;
        const email = payload.email as string;

        let name = 'Zenith User';
        if (userJson) {
            try {
                const parsedUser = JSON.parse(userJson);
                if (parsedUser.name) {
                    name = `${parsedUser.name.firstName || ''} ${parsedUser.name.lastName || ''}`.trim() || name;
                }
            } catch (e) {
                console.error('Failed to parse Apple User JSON', e);
            }
        }

        const db = c.env.DB;
        let user = await db.prepare('SELECT id, name, email, language, total_xp, level FROM users WHERE apple_id = ? OR email = ?').bind(appleId, email).first() as any;

        const now = Date.now();
        let userId;
        let userLanguage = user?.language || 'pt';

        if (user) {
            userId = user.id;
            await db.prepare('UPDATE users SET apple_id = ? WHERE id = ?').bind(appleId, userId).run();
        } else {
            userId = crypto.randomUUID();
            const username = await generateUniqueUsername(db, name || 'Utilizador Apple');
            await db.prepare('INSERT INTO users (id, name, email, password_hash, apple_id, is_verified, created_at, language, username) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
                .bind(userId, name, email, 'OAUTH_USER', appleId, 1, now, userLanguage, username).run();
        }

        const token = await createSessionToken(c, { id: userId, name: user?.name || name, email });

        let frontendUrl = 'https://zenith-rsnv.vercel.app';
        if (state && state.includes('localhost')) frontendUrl = 'http://localhost:3000';

        return c.redirect(`${frontendUrl}/login?token=${token}&language=${userLanguage}`);
    } catch (e: any) {
        if (e?.message === 'MISSING_JWT_SECRET') return c.text('Server configuration error', 500);
        return c.text('Error during Apple Callback: ' + e.message, 500);
    }
});

authRoutes.post('/send-code', zValidator('json', sendCodeSchema), async (c) => {
    const { email, hp } = c.req.valid('json');
    if (hp) return c.json({ message: 'Código enviado com sucesso.' });

    const ip = c.req.header('CF-Connecting-IP') || 'local';
    if (!(await checkRateLimit(`send-code-${ip}`, 5, 5 * 60 * 1000, rateLimitBackend(c)))) {
        return c.json({ error: 'Muitos códigos pedidos. Tenta novamente em 5 minutos.' }, 429);
    }

    const db = c.env.DB;
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    try {
        await db.prepare('INSERT OR REPLACE INTO verification_codes (email, code, expires_at) VALUES (?, ?, ?)')
            .bind(email, code, expiresAt)
            .run();

        if (c.env.RESEND_API_KEY && !email.endsWith('@dronee.blog')) {
            const resendRes = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${c.env.RESEND_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: 'Zenith App <hello@dronee.blog>',
                    to: email,
                    subject: 'O teu Código de Verificação Zenith',
                    html: `
                        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">
                            <h1 style="color: #111; font-weight: 800; letter-spacing: -0.05em;">Verifica a tua Identidade.</h1>
                            <p style="color: #666; font-size: 16px; margin-bottom: 30px;">Bem-vindo ao <b>Zenith</b>. Usa o código mágico abaixo para forjares a tua conta na nuvem:</p>
                            <div style="background-color: #000; color: #fff; padding: 24px; border-radius: 16px; margin-bottom: 30px;">
                                <span style="font-size: 40px; font-weight: 900; letter-spacing: 0.2em;">${code}</span>
                            </div>
                            <p style="color: #999; font-size: 13px;">O código expira em 10 minutos. Se não pediste este código de acesso, ignora este email.</p>
                        </div>
                    `
                })
            });

            if (!resendRes.ok) {
                const errorText = await resendRes.text();
                console.error(`[ZENITH_AUTH] Resend failed for ${email}:`, errorText);
            } else {
                console.log(`[ZENITH_AUTH] Email successfully sent to ${email} via Resend.`);
            }
        } else {
            console.log(`[ZENITH_AUTH] NO RESEND KEY (or Test Email). CODE FOR ${email}: ${code}`);
        }

        const responseData: any = { message: 'Código enviado com sucesso.' };
        if (email.endsWith('@dronee.blog')) {
            responseData.testCode = code;
        }

        return c.json(responseData);
    } catch (error: any) {
        return c.json({ error: error.message }, 500);
    }
});

authRoutes.post('/register', zValidator('json', registerSchema.extend({ language: z.string().optional() })), async (c) => {
    const { name, email, password, code, language, username, hp } = c.req.valid('json');
    if (hp) return c.json({ error: 'Erro ao processar registo.' }, 400);

    const ip = c.req.header('CF-Connecting-IP') || 'local';
    if (!(await checkRateLimit(`register-${ip}`, 5, 60 * 60 * 1000, rateLimitBackend(c)))) {
        return c.json({ error: 'Muitos registos. Tenta novamente mais tarde.' }, 429);
    }

    const db = c.env.DB;
    const userLanguage = language || 'pt';

    const stored = await db.prepare('SELECT code, expires_at FROM verification_codes WHERE email = ?').bind(email).first<{ code: string, expires_at: number }>();
    if (!stored || stored.code !== code) return c.json({ error: 'Código de verificação inválido.' }, 400);
    if (Date.now() > stored.expires_at) return c.json({ error: 'Código expirado. Pede um novo.' }, 400);

    const existing = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
    if (existing) return c.json({ error: 'Email já registado.' }, 400);

    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    const createdAt = Date.now();
    const userName = name || 'User';
    let finalUsername = username || await generateUniqueUsername(db, userName);

    try {
        await db.prepare('INSERT INTO users (id, name, email, password_hash, is_verified, created_at, language, username) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
            .bind(id, userName, email, passwordHash, 1, createdAt, userLanguage, finalUsername)
            .run();

        await db.prepare('DELETE FROM verification_codes WHERE email = ?').bind(email).run();

        const token = await createSessionToken(c, { id, name: userName, email });
        return c.json({ token, user: { id, name: userName, email, language: userLanguage, username: finalUsername, optInLeaderboard: false, total_xp: 0, level: 1, arena_points: 0, lastLoginRewardDate: null } });
    } catch (error: any) {
        if (error?.message === 'MISSING_JWT_SECRET') return authConfigErrorResponse(c);
        return c.json({ error: error.message }, 500);
    }
});

authRoutes.post('/login', zValidator('json', loginSchema), async (c) => {
    const { email, password } = c.req.valid('json');
    const ip = c.req.header('CF-Connecting-IP') || 'local';

    if (!(await checkRateLimit(`login-${ip}`, 10, 60 * 1000, rateLimitBackend(c)))) {
        return c.json({ error: 'Muitas tentativas de login. Tenta novamente em 1 minuto.' }, 429);
    }

    const db = c.env.DB;
    const user = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<AuthUserRow>();

    if (!user) return c.json({ error: 'Conta não encontrada. Por favor, cria conta em baixo.' }, 404);
    if (!user.is_verified) return c.json({ error: 'Email não verificado. Por favor, regista-te novamente ou verifica o código.' }, 403);

    if (user.lockout_until && Date.now() < user.lockout_until) {
        const remainingMinutes = Math.ceil((user.lockout_until - Date.now()) / (60 * 1000));
        return c.json({ error: `Conta bloqueada temporariamente. Tenta novamente em ${remainingMinutes} minutos.` }, 403);
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
        const newAttempts = (user.login_attempts || 0) + 1;
        const lockoutUntil = newAttempts >= 5 ? Date.now() + 15 * 60 * 1000 : 0;

        await db.prepare('UPDATE users SET login_attempts = ?, lockout_until = ? WHERE id = ?')
            .bind(newAttempts, lockoutUntil, user.id)
            .run();

        if (newAttempts >= 5) return c.json({ error: 'Muitas tentativas falhadas. Conta bloqueada por 15 minutos.' }, 403);
        return c.json({ error: `Password incorreta. Tens mais ${5 - newAttempts} tentativas.` }, 401);
    }

    await db.prepare('UPDATE users SET login_attempts = 0, lockout_until = 0 WHERE id = ?')
        .bind(user.id)
        .run();

    try {
        const token = await createSessionToken(c, { id: user.id, name: user.name, email: user.email });
        return c.json({ token, user: serializeAuthUser(user) });
    } catch (error: any) {
        if (error?.message === 'MISSING_JWT_SECRET') return authConfigErrorResponse(c);
        throw error;
    }
});

authRoutes.patch('/profile', async (c) => {
    const auth = await authenticateRequest(c);
    if ('error' in auth) return auth.error;

    const userId = auth.payload.id;
    const db = c.env.DB;

    try {
        const body = await c.req.json().catch(() => ({}));
        const { name, language, optInLeaderboard, username, lastLoginRewardDate } = body;

        const updates: string[] = [];
        const binds: any[] = [];
        if (name !== undefined) { updates.push('name = ?'); binds.push(name); }
        if (language !== undefined) { updates.push('language = ?'); binds.push(language); }
        if (optInLeaderboard !== undefined) {
            updates.push('opt_in_leaderboard = ?');
            binds.push(optInLeaderboard ? 1 : 0);

            if (!optInLeaderboard) {
                updates.push('arena_points = ?');
                binds.push(0);
            }
        }

        if (username !== undefined && username !== null) {
            const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '');
            if (cleanUsername.length < 3) return c.json({ error: 'Username muito curto (mínimo 3 caracteres).' }, 400);

            const existing = await db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').bind(cleanUsername, userId).first();
            if (existing) return c.json({ error: 'Este @username já está a ser usado.' }, 400);
            updates.push('username = ?');
            binds.push(cleanUsername);
        }

        if (lastLoginRewardDate !== undefined) { updates.push('last_login_reward_date = ?'); binds.push(lastLoginRewardDate); }

        let result = null;
        if (updates.length > 0) {
            binds.push(userId);
            result = await db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).bind(...binds).run();
        }

        return c.json({ success: true, result });
    } catch (e: any) {
        return c.json({ error: 'Erro ao atualizar perfil: ' + e.message }, 500);
    }
});

authRoutes.get('/check-username', async (c) => {
    const username = c.req.query('q');
    if (!username || username.length < 3) return c.json({ available: false, error: 'Mínimo 3 caracteres.' });

    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '');
    const db = c.env.DB;

    try {
        const existing = await db.prepare('SELECT id FROM users WHERE username = ?').bind(cleanUsername).first();
        return c.json({ available: !existing });
    } catch (e: any) {
        return c.json({ error: 'Erro ao verificar disponibilidade.' }, 500);
    }
});

authRoutes.delete('/account', async (c) => {
    const auth = await authenticateRequest(c);
    if ('error' in auth) return auth.error;

    const userId = auth.payload.id;
    const body = await c.req.json().catch(() => ({}));
    const password = body.password;
    if (!password) return c.json({ error: 'A password é obrigatória para esta ação.' }, 400);

    const db = c.env.DB;
    const user = await db.prepare('SELECT id, password_hash FROM users WHERE id = ?').bind(userId).first<{ id: string, password_hash: string }>();
    if (!user) return c.json({ error: 'Conta não encontrada.' }, 404);

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) return c.json({ error: 'Password incorreta.' }, 401);

    try {
        await db.batch([
            db.prepare('DELETE FROM logs WHERE habit_id IN (SELECT id FROM habits WHERE user_id = ?)').bind(userId),
            db.prepare('DELETE FROM habits WHERE user_id = ?').bind(userId),
            db.prepare('DELETE FROM users WHERE id = ?').bind(userId)
        ]);
        return c.json({ success: true, message: 'Conta apagada com sucesso.' });
    } catch (e: any) {
        return c.json({ error: 'Erro ao apagar conta: ' + e.message }, 500);
    }
});

authRoutes.post('/change-password', async (c) => {
    const auth = await authenticateRequest(c);
    if ('error' in auth) return auth.error;

    const userId = auth.payload.id;
    const { currentPassword, newPassword } = await c.req.json().catch(() => ({}));
    if (!currentPassword || !newPassword) return c.json({ error: 'Dados incompletos.' }, 400);

    const db = c.env.DB;
    const user = await db.prepare('SELECT id, password_hash FROM users WHERE id = ?').bind(userId).first<{ id: string, password_hash: string }>();
    if (!user) return c.json({ error: 'Conta não encontrada.' }, 404);

    const isValid = await verifyPassword(currentPassword, user.password_hash);
    if (!isValid) return c.json({ error: 'Palavra-passe atual incorreta.' }, 401);

    try {
        const hashed = await hashPassword(newPassword);
        await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(hashed, userId).run();
        return c.json({ success: true, message: 'Palavra-passe alterada com sucesso.' });
    } catch (e: any) {
        return c.json({ error: 'Erro ao alterar palavra-passe.' }, 500);
    }
});

authRoutes.post('/forgot-password', async (c) => {
    try {
        const { email, hp } = await c.req.json().catch(() => ({}));
        if (hp) return c.json({ message: 'Código enviado com sucesso.' });

        const ip = c.req.header('CF-Connecting-IP') || 'local';
        if (!(await checkRateLimit(`forgot-${ip}`, 3, 10 * 60 * 1000, rateLimitBackend(c)))) {
            return c.json({ error: 'Muitos pedidos de recuperação. Tenta novamente mais tarde.' }, 429);
        }

        const db = c.env.DB;
        const user = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
        if (!user) return c.json({ error: 'Conta não encontrada.' }, 404);

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 15 * 60 * 1000;

        await db.prepare('INSERT OR REPLACE INTO verification_codes (email, code, expires_at) VALUES (?, ?, ?)')
            .bind(email, code, expiresAt)
            .run();

        if (c.env.RESEND_API_KEY && !email.endsWith('@dronee.blog')) {
            const resendRes = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${c.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    from: 'Zenith App <hello@dronee.blog>',
                    to: email,
                    subject: 'Código de Recuperação - Zenith',
                    html: `
                        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">
                            <h1 style="color: #111; font-weight: 800; letter-spacing: -0.05em;">Recupera o teu acesso.</h1>
                            <p style="color: #666; font-size: 16px; margin-bottom: 30px;">Foi pedido um reset de palavra-passe para a tua conta. Usa o código abaixo:</p>
                            <div style="background-color: #000; color: #fff; padding: 24px; border-radius: 16px; margin-bottom: 30px;">
                                <span style="font-size: 40px; font-weight: 900; letter-spacing: 0.2em;">${code}</span>
                            </div>
                            <p style="color: #999; font-size: 13px;">O código expira em 15 minutos. Se não foste tu, ignora este email.</p>
                        </div>
                    `
                })
            });
            if (!resendRes.ok) console.error(`[ZENITH_AUTH] Resend failed for ${email}`);
        }

        const responseData: any = { message: 'Código enviado com sucesso.' };
        if (email.endsWith('@dronee.blog') || !c.env.RESEND_API_KEY) {
            responseData.testCode = code;
        }

        return c.json(responseData);
    } catch (e) {
        return c.json({ error: 'Erro interno.' }, 500);
    }
});

authRoutes.post('/reset-password', async (c) => {
    try {
        const { email, code, newPassword } = await c.req.json();
        if (!email || !code || !newPassword) return c.json({ error: 'Dados incompletos.' }, 400);

        const db = c.env.DB;
        const record = await db.prepare('SELECT code, expires_at FROM verification_codes WHERE email = ?').bind(email).first() as any;

        if (!record || record.code !== code) return c.json({ error: 'Código inválido.' }, 401);
        if (Date.now() > record.expires_at) return c.json({ error: 'Código expirado.' }, 401);

        const hashed = await hashPassword(newPassword);
        await db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').bind(hashed, email).run();
        await db.prepare('DELETE FROM verification_codes WHERE email = ?').bind(email).run();

        return c.json({ message: 'Palavra-passe atualizada com sucesso.' });
    } catch (e) {
        return c.json({ error: 'Erro ao repor palavra-passe.' }, 500);
    }
});

export default authRoutes;
