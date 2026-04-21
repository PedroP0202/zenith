import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { sign, jwt, verify, decode } from 'hono/jwt';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { hashPassword, verifyPassword } from './crypto';

export type Bindings = {
    DB: D1Database;
    JWT_SECRET: string;
    RESEND_API_KEY: string;
    ENVIRONMENT?: string;
};

export type ArenaWinner = {
    id: string;
    user_id: string;
    season_id: string;
    rank_name: string;
    position: number | null;
    created_at: number;
};

const app = new Hono<{ Bindings: Bindings }>();

type AuthPayload = {
    id: string;
    [key: string]: unknown;
};

// Enable CORS for the Capacitor iOS App
app.use('*', cors());

app.get('/', (c) => {
    return c.text('Zenith Global API is running at the Edge!');
});

// Simple In-Memory Rate Limiter for sensitive routes
// Note: In massive production, use Cloudflare KV or Durable Objects.
const RATE_LIMIT_STORE = new Map<string, { count: number, resetAt: number }>();

const checkRateLimit = (key: string, limit: number, windowMs: number) => {
    const now = Date.now();
    const record = RATE_LIMIT_STORE.get(key);

    if (!record || now > record.resetAt) {
        RATE_LIMIT_STORE.set(key, { count: 1, resetAt: now + windowMs });
        return true;
    }

    if (record.count >= limit) return false;

    record.count++;
    return true;
};

const getTokenSecret = (c: { env: Bindings }) => {
    const secret = c.env.JWT_SECRET;
    if (!secret && c.env.ENVIRONMENT === 'production') {
        throw new Error('MISSING_JWT_SECRET');
    }
    return secret || 'zenith-local-dev-secret';
};

const authenticateRequest = async (c: any): Promise<{ payload: AuthPayload; error?: never } | { error: any; payload?: never }> => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { error: c.json({ error: 'Não autorizado' }, 401) };
    }

    let payload: AuthPayload;
    try {
        payload = await verify(authHeader.replace('Bearer ', ''), getTokenSecret(c), 'HS256') as AuthPayload;
    } catch (error: any) {
        if (error?.message === 'MISSING_JWT_SECRET') {
            console.error('[AUTH] MISSING JWT_SECRET IN PRODUCTION!');
            return { error: c.json({ error: 'Erro de configuração do servidor.' }, 500) };
        }
        return { error: c.json({ error: 'Token inválido' }, 401) };
    }

    return { payload };
};

const isAcceptedFriend = async (db: D1Database, userId: string, friendId: string) => {
    const friendship = await db.prepare(`
        SELECT id FROM friendships
        WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))
          AND status = 'accepted'
    `).bind(userId, friendId, friendId, userId).first();

    return !!friendship;
};

const getGroupMembership = async (db: D1Database, groupId: string, userId: string) => {
    return db.prepare(`
        SELECT gm.id, gm.role, sg.owner_user_id
        FROM group_members gm
        JOIN social_groups sg ON sg.id = gm.group_id
        WHERE gm.group_id = ? AND gm.user_id = ?
    `).bind(groupId, userId).first<{ id: string; role: string; owner_user_id: string }>();
};

const ARENA_TIERS = [
    { name: 'Zenith', minScore: 2500 },
    { name: 'Avatar', minScore: 1500 },
    { name: 'Soberano', minScore: 900 },
    { name: 'Astre', minScore: 550 },
    { name: 'Pulsar', minScore: 350 },
    { name: 'Nova', minScore: 200 },
    { name: 'Núcleo', minScore: 120 },
    { name: 'Órbita', minScore: 70 },
    { name: 'Vetor', minScore: 40 },
    { name: 'Flux', minScore: 20 },
    { name: 'Vácuo', minScore: 5 },
    { name: 'Spark', minScore: 0 },
] as const;

const getArenaTierFromScore = (score: number) => {
    const normalizedScore = Number.isFinite(score) ? Math.max(0, Math.floor(score)) : 0;
    return ARENA_TIERS.find((tier) => normalizedScore >= tier.minScore) || ARENA_TIERS[ARENA_TIERS.length - 1];
};

const getArenaPodiumRankName = (position: number) => {
    if (position === 1) return 'Arena Champion';
    if (position === 2) return 'Arena Vanguard';
    if (position === 3) return 'Arena Sentinel';
    return 'Arena Finalist';
};

// --- AUTHENTICATION ROUTES ---

const registerSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
    code: z.string().length(6),
    username: z.string().min(3).max(20).optional(),
    hp: z.string().optional()
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
});

const sendCodeSchema = z.object({
    email: z.string().email(),
    hp: z.string().optional(),
});

const groupSchema = z.object({
    name: z.string().trim().min(2).max(40),
    memberIds: z.array(z.string().uuid()).max(20).default([]),
});

const groupMemberSchema = z.object({
    friendId: z.string().uuid(),
});

const groupHabitSchema = z.object({
    title: z.string().trim().min(2).max(80),
    frequency: z.array(z.number().int().min(0).max(6)).min(1).max(7),
});

app.post('/auth/google', async (c) => {
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

        const secret = c.env.JWT_SECRET;
        if (!secret && c.env.ENVIRONMENT === 'production') {
            console.error('[AUTH] MISSING JWT_SECRET IN PRODUCTION!');
            return c.json({ error: 'Erro de configuração do servidor.' }, 500);
        }
        const tokenSecret = secret || 'zenith-local-dev-secret';
        const token = await sign({ id: userId, name: user?.name || name, email, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 }, tokenSecret);

        return c.json({ token, user: { id: userId, name: user?.name || name, email, language: userLanguage, username: currentUsername, optInLeaderboard: user?.opt_in_leaderboard === 1, total_xp: user?.total_xp || 0, level: user?.level || 1, arena_points: user?.arena_points || 0, lastLoginRewardDate: user?.last_login_reward_date || null } });
    } catch (e: any) {
        return c.json({ error: 'Erro de Autenticação Google: ' + e.message }, 500);
    }
});

app.post('/auth/google/web', async (c) => {
    try {
        const { accessToken } = await c.req.json();
        if (!accessToken) return c.json({ error: 'Falta o token de acesso do Google (Web).' }, 400);

        // Fetch user profile using the access token
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

        const secret = c.env.JWT_SECRET;
        if (!secret && c.env.ENVIRONMENT === 'production') {
            console.error('[AUTH] MISSING JWT_SECRET IN PRODUCTION!');
            return c.json({ error: 'Erro de configuração do servidor.' }, 500);
        }
        const tokenSecret = secret || 'zenith-local-dev-secret';
        const token = await sign({ id: userId, name: user?.name || name, email, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 }, tokenSecret);

        return c.json({ token, user: { id: userId, name: user?.name || name, email, language: userLanguage, username: currentUsername, optInLeaderboard: user?.opt_in_leaderboard === 1, total_xp: user?.total_xp || 0, level: user?.level || 1, arena_points: user?.arena_points || 0, lastLoginRewardDate: user?.last_login_reward_date || null } });
    } catch (e: any) {
        return c.json({ error: 'Erro de Autenticação Google (Web): ' + e.message }, 500);
    }
});

app.post('/auth/apple', async (c) => {
    try {
        const { appleId, email, name, identityToken } = await c.req.json();

        // Basic presence check for critical Apple data
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
        let finalName = name || (user ? user.name : "Utilizador Apple");
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

        const secret = c.env.JWT_SECRET;
        if (!secret && c.env.ENVIRONMENT === 'production') {
            console.error('[AUTH] MISSING JWT_SECRET IN PRODUCTION!');
            return c.json({ error: 'Erro de configuração do servidor.' }, 500);
        }
        const tokenSecret = secret || 'zenith-local-dev-secret';
        const token = await sign({ id: userId, name: finalName, email: finalEmail, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 }, tokenSecret);

        console.log(`[ZENITH_AUTH] Apple Login success for ${finalEmail}`);
        // If it was a new user, we need to get the generated username. 
        // If it's an existing one, it's user.username.
        const currentUsername = user?.username || (await db.prepare('SELECT username FROM users WHERE id = ?').bind(userId).first() as any)?.username || null;
        
        return c.json({ token, user: { id: userId, name: finalName, email: finalEmail, language: userLanguage, username: currentUsername, optInLeaderboard: user?.opt_in_leaderboard === 1, total_xp: user?.total_xp || 0, level: user?.level || 1, arena_points: user?.arena_points || 0, lastLoginRewardDate: user?.last_login_reward_date || null } });
    } catch (e: any) {
        console.error('[ZENITH_AUTH] Apple Auth Error:', e.message);
        return c.json({ error: 'Erro de Autenticação Apple: ' + e.message }, 500);
    }
});

// Apple Web Redirect Callback (Always POST from Apple)
app.post('/auth/apple/callback', async (c) => {
    try {
        const formData = await c.req.formData();
        const idToken = formData.get('id_token') as string;
        const userJson = formData.get('user') as string; // Only comes on first sign-in
        const state = formData.get('state') as string; // Used to determine redirect back

        if (!idToken) return c.text('Missing id_token', 400);

        // Decode Apple JWT
        const { payload } = decode(idToken);
        const appleId = payload.sub as string;
        const email = payload.email as string;

        // Extract name if provided
        let name = "Zenith User";
        if (userJson) {
            try {
                const parsedUser = JSON.parse(userJson);
                if (parsedUser.name) {
                    name = `${parsedUser.name.firstName || ''} ${parsedUser.name.lastName || ''}`.trim() || name;
                }
            } catch (e) {
                console.error("Failed to parse Apple User JSON", e);
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
            const username = await generateUniqueUsername(db, name || "Utilizador Apple");
            await db.prepare('INSERT INTO users (id, name, email, password_hash, apple_id, is_verified, created_at, language, username) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
                .bind(userId, name, email, 'OAUTH_USER', appleId, 1, now, userLanguage, username).run();
        }

        const secret = c.env.JWT_SECRET;
        if (!secret && c.env.ENVIRONMENT === 'production') {
            console.error('[AUTH] MISSING JWT_SECRET IN PRODUCTION!');
            return c.json({ error: 'Erro de configuração do servidor.' }, 500);
        }
        const tokenSecret = secret || 'zenith-local-dev-secret';
        const token = await sign({ id: userId, name: user?.name || name, email, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 }, tokenSecret);

        // Redirect back to frontend. We assume state might contain the original origin, or we use defaults.
        // For security, usually we should check standard origins.
        let frontendUrl = "https://zenith-rsnv.vercel.app";
        if (state && state.includes('localhost')) frontendUrl = "http://localhost:3000";

        return c.redirect(`${frontendUrl}/login?token=${token}&language=${userLanguage}`);
    } catch (e: any) {
        return c.text('Error during Apple Callback: ' + e.message, 500);
    }
});

app.post('/auth/send-code', zValidator('json', sendCodeSchema), async (c) => {
    const { email, hp } = c.req.valid('json');
    if (hp) return c.json({ message: 'Código enviado com sucesso.' }); // Silent fail for bots

    const ip = c.req.header('CF-Connecting-IP') || 'local';
    
    // Rate limit: 5 requests per 5 minutes per IP
    if (!checkRateLimit(`send-code-${ip}`, 5, 5 * 60 * 1000)) {
        return c.json({ error: 'Muitos códigos pedidos. Tenta novamente em 5 minutos.' }, 429);
    }

    const db = c.env.DB;

    // Generate a 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes from now

    try {
        await db.prepare('INSERT OR REPLACE INTO verification_codes (email, code, expires_at) VALUES (?, ?, ?)')
            .bind(email, code, expiresAt)
            .run();

        // Send email via Resend API if API key is provided and email isn't a test email
        if (c.env.RESEND_API_KEY && !email.endsWith('@dronee.blog')) {
            const resendRes = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${c.env.RESEND_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: 'Zenith App <hello@dronee.blog>', // Must be a verified domain in production
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

        // For testing purposes, if email ends with @zenith.test, we return the code
        const responseData: any = { message: 'Código enviado com sucesso.' };
        if (email.endsWith('@dronee.blog')) {
            responseData.testCode = code;
        }

        return c.json(responseData);
    } catch (error: any) {
        return c.json({ error: error.message }, 500);
    }
});

// Generate a unique username based on the person's name
async function generateUniqueUsername(db: D1Database, name: string): Promise<string> {
    const base = name.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 15);
    
    let isUnique = false;
    let finalUsername = "";
    let attempts = 0;

    while (!isUnique && attempts < 5) {
        const random = Math.floor(1000 + Math.random() * 9000);
        finalUsername = attempts === 0 ? (base || 'zen') : `${base}${random}`;
        
        // Check uniqueness
        const existing = await db.prepare('SELECT id FROM users WHERE username = ?').bind(finalUsername).first();
        if (!existing) {
            isUnique = true;
        } else {
            attempts++;
        }
    }

    // fallback to uuid-like if still not unique
    if (!isUnique) {
        finalUsername = `${base}${Date.now().toString().slice(-4)}`;
    }

    return finalUsername;
}

app.post('/auth/register', zValidator('json', registerSchema.extend({ language: z.string().optional() })), async (c) => {
    const { name, email, password, code, language, username, hp } = c.req.valid('json');
    if (hp) return c.json({ error: 'Erro ao processar registo.' }, 400); // Or silent fail

    const ip = c.req.header('CF-Connecting-IP') || 'local';

    // Rate limit: 5 registrations per hour per IP (strict)
    if (!checkRateLimit(`register-${ip}`, 5, 60 * 60 * 1000)) {
        return c.json({ error: 'Muitos registos. Tenta novamente mais tarde.' }, 429);
    }

    const db = c.env.DB;
    const userLanguage = language || 'pt';

    // 1. Verify Code
    const stored = await db.prepare('SELECT code, expires_at FROM verification_codes WHERE email = ?').bind(email).first<{ code: string, expires_at: number }>();

    if (!stored || stored.code !== code) {
        return c.json({ error: 'Código de verificação inválido.' }, 400);
    }

    if (Date.now() > stored.expires_at) {
        return c.json({ error: 'Código expirado. Pede um novo.' }, 400);
    }

    // 2. Check if email is already taken (by a verified user)
    const existing = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
    if (existing) {
        return c.json({ error: 'Email já registado.' }, 400);
    }

    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    const createdAt = Date.now();
    const userName = name || 'User';

    // Generate a unique username if not provided
    let finalUsername = username;
    if (!finalUsername) {
        finalUsername = await generateUniqueUsername(db, userName);
    }

    try {
        await db.prepare('INSERT INTO users (id, name, email, password_hash, is_verified, created_at, language, username) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
            .bind(id, userName, email, passwordHash, 1, createdAt, userLanguage, finalUsername)
            .run();

        // Delete the code after use
        await db.prepare('DELETE FROM verification_codes WHERE email = ?').bind(email).run();

        // Generate JWT (Valid for 30 days)
        const secret = c.env.JWT_SECRET;
        if (!secret && c.env.ENVIRONMENT === 'production') {
            console.error('[AUTH] MISSING JWT_SECRET IN PRODUCTION!');
            return c.json({ error: 'Erro de configuração do servidor.' }, 500);
        }
        const tokenSecret = secret || 'zenith-local-dev-secret';
        const token = await sign({ id, name: userName, email, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 }, tokenSecret);

        return c.json({ token, user: { id, name: userName, email, language: userLanguage, username: finalUsername, optInLeaderboard: false, total_xp: 0, level: 1, arena_points: 0, lastLoginRewardDate: null } });
    } catch (error: any) {
        return c.json({ error: error.message }, 500);
    }
});

app.post('/auth/login', zValidator('json', loginSchema), async (c) => {
    const { email, password } = c.req.valid('json');
    const ip = c.req.header('CF-Connecting-IP') || 'local';

    // Rate limit: 10 logins per minute per IP
    if (!checkRateLimit(`login-${ip}`, 10, 60 * 1000)) {
        return c.json({ error: 'Muitas tentativas de login. Tenta novamente em 1 minuto.' }, 429);
    }

    const db = c.env.DB;

    type UserRow = { id: string, name: string, email: string, password_hash: string, language: string, login_attempts: number, lockout_until: number, is_verified: number, opt_in_leaderboard: number, username: string, total_xp: number, level: number, arena_points: number, last_login_reward_date: string | null };
    const user = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<UserRow>();

    if (!user) {
        return c.json({ error: 'Conta não encontrada. Por favor, cria conta em baixo.' }, 404);
    }

    // 0. Check Verification
    if (!user.is_verified) {
        return c.json({ error: 'Email não verificado. Por favor, regista-te novamente ou verifica o código.' }, 403);
    }

    // 1. Check Lockout
    if (user.lockout_until && Date.now() < user.lockout_until) {
        const remainingMinutes = Math.ceil((user.lockout_until - Date.now()) / (60 * 1000));
        return c.json({ error: `Conta bloqueada temporariamente. Tenta novamente em ${remainingMinutes} minutos.` }, 403);
    }

    const isValid = await verifyPassword(password, user.password_hash);
    
    if (!isValid) {
        // 2. Increment attempts
        const newAttempts = (user.login_attempts || 0) + 1;
        let lockoutUntil = 0;
        
        if (newAttempts >= 5) {
            lockoutUntil = Date.now() + 15 * 60 * 1000; // 15 minutes lockout
        }

        await db.prepare('UPDATE users SET login_attempts = ?, lockout_until = ? WHERE id = ?')
            .bind(newAttempts, lockoutUntil, user.id)
            .run();

        if (newAttempts >= 5) {
            return c.json({ error: 'Muitas tentativas falhadas. Conta bloqueada por 15 minutos.' }, 403);
        }

        return c.json({ error: `Password incorreta. Tens mais ${5 - newAttempts} tentativas.` }, 401);
    }

    // 3. Reset attempts on success
    await db.prepare('UPDATE users SET login_attempts = 0, lockout_until = 0 WHERE id = ?')
        .bind(user.id)
        .run();

    const secret = c.env.JWT_SECRET;
    if (!secret && c.env.ENVIRONMENT === 'production') {
        console.error('[AUTH] MISSING JWT_SECRET IN PRODUCTION!');
        return c.json({ error: 'Erro de configuração do servidor.' }, 500);
    }
    const tokenSecret = secret || 'zenith-local-dev-secret';
    const token = await sign({ id: user.id, name: user.name, email: user.email, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 }, tokenSecret);

    return c.json({ token, user: { id: user.id, name: user.name, email: user.email, language: user.language || 'pt', optInLeaderboard: user.opt_in_leaderboard === 1, username: user.username, total_xp: user.total_xp || 0, level: user.level || 1, arena_points: user.arena_points || 0, lastLoginRewardDate: user.last_login_reward_date || null } });
});

// User Profile Sync Endpoint
app.patch('/auth/profile', async (c) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'Não autorizado' }, 401);
    }
    const token = authHeader.split(' ')[1];
    const secret = c.env.JWT_SECRET;
    if (!secret && c.env.ENVIRONMENT === 'production') {
        console.error('[AUTH] MISSING JWT_SECRET IN PRODUCTION!');
        return c.json({ error: 'Erro de configuração do servidor.' }, 500);
    }
    const tokenSecret = secret || 'zenith-local-dev-secret';
    let payload;
    try {
        payload = await verify(token, tokenSecret, 'HS256');
    } catch {
        return c.json({ error: 'Token inválido' }, 401);
    }

    const userId = payload.id;
    const db = c.env.DB;

    try {
        const body = await c.req.json().catch(() => ({}));
        const { name, language, optInLeaderboard, username, lastLoginRewardDate, arenaPoints } = body;

        const updates: string[] = [];
        const binds: any[] = [];
        if (name !== undefined) { updates.push('name = ?'); binds.push(name); }
        if (language !== undefined) { updates.push('language = ?'); binds.push(language); }
        if (optInLeaderboard !== undefined) { updates.push('opt_in_leaderboard = ?'); binds.push(optInLeaderboard ? 1 : 0); }
        
        if (username !== undefined && username !== null) {
            const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '');
            if (cleanUsername.length < 3) return c.json({ error: 'Username muito curto (mínimo 3 caracteres).' }, 400);

            // Check if username is already taken by another user
            const existing = await db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').bind(cleanUsername, userId).first();
            if (existing) {
                return c.json({ error: 'Este @username já está a ser usado.' }, 400);
            }
            updates.push('username = ?');
            binds.push(cleanUsername);
        }

        // NOTE: total_xp and level are NOT accepted from the client.
        // They are authoritatively calculated in /sync/pull from actual logs.
        // arenaPoints IS client-controlled (they track arena participation separately)
        if (arenaPoints !== undefined) { updates.push('arena_points = ?'); binds.push(arenaPoints); }
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

app.get('/auth/check-username', async (c) => {
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


// --- SOCIAL & FRIENDS ROUTES ---

app.get('/users/search', async (c) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return c.json({ error: 'Não autorizado' }, 401);

    const token = authHeader.replace('Bearer ', '');
    const secret = c.env.JWT_SECRET;
    if (!secret && c.env.ENVIRONMENT === 'production') {
        console.error('[AUTH] MISSING JWT_SECRET IN PRODUCTION!');
        return c.json({ error: 'Erro de configuração do servidor.' }, 500);
    }
    const tokenSecret = secret || 'zenith-local-dev-secret';
    let payload;
    try {
        payload = await verify(token, tokenSecret, 'HS256');
    } catch {
        return c.json({ error: 'Token inválido' }, 401);
    }

    const userId = payload.id;
    const query = c.req.query('q');
    if (!query || query.length < 2) return c.json({ results: [] });

    const db = c.env.DB;
    try {
        // Search by username or name, excluding:
        // - the current user themselves
        // - users blocked by the current user
        // - users who have blocked the current user
        // - users who are already accepted friends
        const { results } = await db.prepare(`
            SELECT id, name, username 
            FROM users 
            WHERE (username LIKE ? OR name LIKE ?) 
              AND id != ?
              AND id NOT IN (
                SELECT friend_id FROM friendships WHERE user_id = ? AND status = 'blocked'
              )
              AND id NOT IN (
                SELECT user_id FROM friendships WHERE friend_id = ? AND status = 'blocked'
              )
              AND id NOT IN (
                SELECT friend_id FROM friendships WHERE user_id = ? AND status = 'accepted'
              )
              AND id NOT IN (
                SELECT user_id FROM friendships WHERE friend_id = ? AND status = 'accepted'
              )
              AND id NOT IN (
                SELECT friend_id FROM friendships WHERE user_id = ? AND status = 'pending'
              )
              AND id NOT IN (
                SELECT user_id FROM friendships WHERE friend_id = ? AND status = 'pending'
              )
            LIMIT 10
        `).bind(`%${query}%`, `%${query}%`, userId, userId, userId, userId, userId, userId, userId).all();
        
        return c.json({ results });
    } catch (e: any) {
        return c.json({ error: 'Erro na pesquisa: ' + e.message }, 500);
    }
});

app.post('/friends/request', async (c) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return c.json({ error: 'Não autorizado' }, 401);

    const token = authHeader.replace('Bearer ', '');
    const secret = c.env.JWT_SECRET;
    if (!secret && c.env.ENVIRONMENT === 'production') {
        console.error('[AUTH] MISSING JWT_SECRET IN PRODUCTION!');
        return c.json({ error: 'Erro de configuração do servidor.' }, 500);
    }
    const tokenSecret = secret || 'zenith-local-dev-secret';
    let payload;
    try {
        payload = await verify(token, tokenSecret, 'HS256');
    } catch {
        return c.json({ error: 'Token inválido' }, 401);
    }

    const { friendId } = await c.req.json().catch(() => ({}));
    if (!friendId) return c.json({ error: 'ID do amigo em falta.' }, 400);
    
    const userId = payload.id;
    if (userId === friendId) return c.json({ error: 'Não te podes adicionar a ti próprio.' }, 400);

    const db = c.env.DB;
    const now = Date.now();
    try {
        await db.prepare(`
            INSERT INTO friendships (id, user_id, friend_id, status, created_at, updated_at)
            VALUES (?, ?, ?, 'pending', ?, ?)
        `).bind(crypto.randomUUID(), userId, friendId, now, now).run();
        
        return c.json({ success: true, message: 'Pedido enviado.' });
    } catch (e: any) {
        if (e.message.includes('UNIQUE')) {
            return c.json({ error: 'Já existe um pedido ou amizade pendente.' }, 400);
        }
        return c.json({ error: 'Erro ao enviar pedido: ' + e.message }, 500);
    }
});

app.get('/friends/requests', async (c) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return c.json({ error: 'Não autorizado' }, 401);

    const token = authHeader.replace('Bearer ', '');
    const secret = c.env.JWT_SECRET;
    if (!secret && c.env.ENVIRONMENT === 'production') {
        console.error('[AUTH] MISSING JWT_SECRET IN PRODUCTION!');
        return c.json({ error: 'Erro de configuração do servidor.' }, 500);
    }
    const tokenSecret = secret || 'zenith-local-dev-secret';
    let payload;
    try {
        payload = await verify(token, tokenSecret, 'HS256');
    } catch {
        return c.json({ error: 'Token inválido' }, 401);
    }

    const userId = payload.id;
    const db = c.env.DB;
    try {
        // List incoming requests
        const incoming = await db.prepare(`
            SELECT f.id, f.user_id as from_id, u.name, u.username, f.created_at
            FROM friendships f
            JOIN users u ON u.id = f.user_id
            WHERE f.friend_id = ? AND f.status = 'pending'
        `).bind(userId).all();

        // List outgoing requests
        const outgoing = await db.prepare(`
            SELECT f.id, f.friend_id as to_id, u.name, u.username, f.created_at
            FROM friendships f
            JOIN users u ON u.id = f.friend_id
            WHERE f.user_id = ? AND f.status = 'pending'
        `).bind(userId).all();
        
        return c.json({ 
            incoming: incoming.results, 
            outgoing: outgoing.results 
        });
    } catch (e: any) {
        return c.json({ error: 'Erro ao listar pedidos: ' + e.message }, 500);
    }
});

app.patch('/friends/request/:id', async (c) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return c.json({ error: 'Não autorizado' }, 401);

    const requestId = c.req.param('id');
    const { action } = await c.req.json().catch(() => ({})); // 'accept' or 'reject'

    const token = authHeader.replace('Bearer ', '');
    const secret = c.env.JWT_SECRET;
    if (!secret && c.env.ENVIRONMENT === 'production') {
        console.error('[AUTH] MISSING JWT_SECRET IN PRODUCTION!');
        return c.json({ error: 'Erro de configuração do servidor.' }, 500);
    }
    const tokenSecret = secret || 'zenith-local-dev-secret';
    let payload;
    try {
        payload = await verify(token, tokenSecret, 'HS256');
    } catch {
        return c.json({ error: 'Token inválido' }, 401);
    }

    const userId = payload.id;
    const db = c.env.DB;
    const now = Date.now();

    try {
        if (action === 'accept') {
            const res = await db.prepare(`
                UPDATE friendships 
                SET status = 'accepted', updated_at = ? 
                WHERE id = ? AND friend_id = ?
            `).bind(now, requestId, userId).run();
            
            if (res.meta.changes === 0) return c.json({ error: 'Pedido não encontrado ou já processado.' }, 404);

            return c.json({ success: true, message: 'Pedido aceite.' });
        } else if (action === 'cancel') {
            // Requester cancels their own request
            const res = await db.prepare('DELETE FROM friendships WHERE id = ? AND user_id = ? AND status = \'pending\'').bind(requestId, userId).run();
            if (res.meta.changes === 0) return c.json({ error: 'Pedido não encontrado ou não tens permissão para cancelar.' }, 404);
            return c.json({ success: true, message: 'Pedido cancelado.' });
        } else {
            // Receiver rejects an incoming request
            await db.prepare('DELETE FROM friendships WHERE id = ? AND friend_id = ?').bind(requestId, userId).run();
            return c.json({ success: true, message: 'Pedido rejeitado.' });
        }
    } catch (e: any) {
        return c.json({ error: 'Erro ao processar pedido: ' + e.message }, 500);
    }
});

app.delete('/friends/:id', async (c) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return c.json({ error: 'Não autorizado' }, 401);

    const friendIdToRemove = c.req.param('id');
    const token = authHeader.replace('Bearer ', '');
    const secret = c.env.JWT_SECRET || 'zenith-local-dev-secret';
    
    let payload;
    try {
        payload = await verify(token, secret, 'HS256');
    } catch {
        return c.json({ error: 'Token inválido' }, 401);
    }

    const userId = payload.id;
    const db = c.env.DB;

    try {
        const result = await db.prepare(`
            DELETE FROM friendships 
            WHERE status = 'accepted' AND 
            ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))
        `).bind(userId, friendIdToRemove, friendIdToRemove, userId).run();

        if (result.meta.changes === 0) {
             return c.json({ error: 'Amizade não encontrada.' }, 404);
        }

        return c.json({ success: true, message: 'Amigo removido com sucesso.' });
    } catch (e: any) {
        return c.json({ error: 'Erro ao remover amigo: ' + e.message }, 500);
    }
});

app.get('/friends', async (c) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return c.json({ error: 'Não autorizado' }, 401);

    const token = authHeader.replace('Bearer ', '');
    const secret = c.env.JWT_SECRET;
    if (!secret && c.env.ENVIRONMENT === 'production') {
        console.error('[AUTH] MISSING JWT_SECRET IN PRODUCTION!');
        return c.json({ error: 'Erro de configuração do servidor.' }, 500);
    }
    const tokenSecret = secret || 'zenith-local-dev-secret';
    let payload;
    try {
        payload = await verify(token, tokenSecret, 'HS256');
    } catch {
        return c.json({ error: 'Token inválido' }, 401);
    }

    const userId = payload.id;
    const db = c.env.DB;
    try {
        // Query both directions for accepted friendships
        const { results } = await db.prepare(`
            SELECT u.id, u.name, u.username, 
                   (SELECT COUNT(*) FROM logs l JOIN habits h ON h.id = l.habit_id WHERE h.user_id = u.id) as score
            FROM users u
            JOIN friendships f ON (f.user_id = u.id AND f.friend_id = ?) OR (f.friend_id = u.id AND f.user_id = ?)
            WHERE f.status = 'accepted'
        `).bind(userId, userId).all();
        
        return c.json({ friends: results });
    } catch (e: any) {
        return c.json({ error: 'Erro ao listar amigos: ' + e.message }, 500);
    }
});

app.get('/groups', async (c) => {
    const auth = await authenticateRequest(c);
    if ('error' in auth) return auth.error;

    const userId = String(auth.payload.id);
    const db = c.env.DB;

    try {
        const { results } = await db.prepare(`
            SELECT
                sg.id,
                sg.name,
                sg.owner_user_id as ownerUserId,
                sg.created_at as createdAt,
                (
                    SELECT COUNT(*)
                    FROM group_members gm2
                    WHERE gm2.group_id = sg.id
                ) as memberCount,
                (
                    SELECT COUNT(*)
                    FROM group_habits gh
                    WHERE gh.group_id = sg.id AND gh.is_active = 1
                ) as habitCount
            FROM social_groups sg
            JOIN group_members gm ON gm.group_id = sg.id
            WHERE gm.user_id = ?
            ORDER BY sg.updated_at DESC, sg.created_at DESC
        `).bind(userId).all();

        return c.json({ groups: results || [] });
    } catch (e: any) {
        return c.json({ error: 'Erro ao listar grupos: ' + e.message }, 500);
    }
});

app.post('/groups', zValidator('json', groupSchema), async (c) => {
    const auth = await authenticateRequest(c);
    if ('error' in auth) return auth.error;

    const userId = String(auth.payload.id);
    const { name, memberIds } = c.req.valid('json') as z.infer<typeof groupSchema>;
    const db = c.env.DB;
    const now = Date.now();
    const groupId = crypto.randomUUID();

    try {
        const uniqueMembers = Array.from(new Set(memberIds.filter((id) => String(id) !== userId))).map((id) => String(id));

        for (const memberId of uniqueMembers) {
            const areFriends = await isAcceptedFriend(db, userId, memberId);
            if (!areFriends) {
                return c.json({ error: 'Só podes adicionar amigos aceites ao grupo.' }, 403);
            }
        }

        await db.prepare(`
            INSERT INTO social_groups (id, name, owner_user_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
        `).bind(groupId, name.trim(), userId, now, now).run();

        await db.prepare(`
            INSERT INTO group_members (id, group_id, user_id, role, invited_by_user_id, created_at)
            VALUES (?, ?, ?, 'owner', ?, ?)
        `).bind(crypto.randomUUID(), groupId, userId, userId, now).run();

        for (const memberId of uniqueMembers) {
            await db.prepare(`
                INSERT INTO group_members (id, group_id, user_id, role, invited_by_user_id, created_at)
                VALUES (?, ?, ?, 'member', ?, ?)
            `).bind(crypto.randomUUID(), groupId, memberId, userId, now).run();
        }

        return c.json({ success: true, groupId });
    } catch (e: any) {
        return c.json({ error: 'Erro ao criar grupo: ' + e.message }, 500);
    }
});

app.get('/groups/:id', async (c) => {
    const auth = await authenticateRequest(c);
    if ('error' in auth) return auth.error;

    const userId = String(auth.payload.id);
    const groupId = c.req.param('id');
    const db = c.env.DB;

    try {
        const membership = await getGroupMembership(db, groupId, userId);
        if (!membership) return c.json({ error: 'Não tens acesso a este grupo.' }, 403);

        const group = await db.prepare(`
            SELECT id, name, owner_user_id as ownerUserId, created_at as createdAt
            FROM social_groups
            WHERE id = ?
        `).bind(groupId).first();
        if (!group) return c.json({ error: 'Grupo não encontrado.' }, 404);

        const membersRes = await db.prepare(`
            SELECT
                gm.user_id as id,
                u.name,
                u.username,
                gm.role
            FROM group_members gm
            JOIN users u ON u.id = gm.user_id
            WHERE gm.group_id = ?
            ORDER BY CASE WHEN gm.role = 'owner' THEN 0 ELSE 1 END, u.name COLLATE NOCASE ASC
        `).bind(groupId).all();

        const habitsRes = await db.prepare(`
            SELECT
                gh.id,
                gh.title,
                gh.frequency,
                gh.created_at as createdAt,
                gh.created_by_user_id as createdByUserId,
                EXISTS (
                    SELECT 1
                    FROM group_habit_logs ghl
                    WHERE ghl.group_habit_id = gh.id
                      AND ghl.user_id = ?
                      AND ghl.completed_at = ?
                ) as myCompletedToday,
                (
                    SELECT COUNT(*)
                    FROM group_habit_logs ghl
                    WHERE ghl.group_habit_id = gh.id
                      AND ghl.completed_at = ?
                ) as completedTodayCount
            FROM group_habits gh
            WHERE gh.group_id = ? AND gh.is_active = 1
            ORDER BY gh.created_at DESC
        `).bind(
            userId,
            new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime(),
            new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime(),
            groupId
        ).all();

        const todayStart = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime();
        const participantsRes = await db.prepare(`
            SELECT
                ghl.group_habit_id as habitId,
                u.id,
                u.name,
                u.username
            FROM group_habit_logs ghl
            JOIN users u ON u.id = ghl.user_id
            JOIN group_habits gh ON gh.id = ghl.group_habit_id
            WHERE gh.group_id = ?
              AND ghl.completed_at = ?
        `).bind(groupId, todayStart).all();

        const participantsByHabit = new Map<string, any[]>();
        for (const row of participantsRes.results || []) {
            const habitId = (row as any).habitId;
            if (!participantsByHabit.has(habitId)) participantsByHabit.set(habitId, []);
            participantsByHabit.get(habitId)!.push({
                id: (row as any).id,
                name: (row as any).name,
                username: (row as any).username,
            });
        }

        const habits = (habitsRes.results || []).map((habit: any) => ({
            ...habit,
            frequency: JSON.parse(habit.frequency || '[]'),
            myCompletedToday: !!habit.myCompletedToday,
            completedTodayCount: Number(habit.completedTodayCount || 0),
            participantsToday: participantsByHabit.get(habit.id) || [],
        }));

        return c.json({
            group,
            membership,
            members: membersRes.results || [],
            habits,
        });
    } catch (e: any) {
        return c.json({ error: 'Erro ao carregar grupo: ' + e.message }, 500);
    }
});

app.post('/groups/:id/members', zValidator('json', groupMemberSchema), async (c) => {
    const auth = await authenticateRequest(c);
    if ('error' in auth) return auth.error;

    const userId = String(auth.payload.id);
    const groupId = c.req.param('id');
    const { friendId } = c.req.valid('json') as z.infer<typeof groupMemberSchema>;
    const db = c.env.DB;
    const now = Date.now();

    try {
        const membership = await getGroupMembership(db, groupId, userId);
        if (!membership) return c.json({ error: 'Não tens acesso a este grupo.' }, 403);
        if (membership.role !== 'owner' && membership.owner_user_id !== userId) {
            return c.json({ error: 'Só o criador pode adicionar novos membros.' }, 403);
        }

        const areFriends = await isAcceptedFriend(db, userId, friendId);
        if (!areFriends) return c.json({ error: 'Só podes adicionar amigos aceites.' }, 403);

        const existing = await db.prepare(`
            SELECT id FROM group_members WHERE group_id = ? AND user_id = ?
        `).bind(groupId, friendId).first();
        if (existing) return c.json({ error: 'Este amigo já faz parte do grupo.' }, 400);

        await db.prepare(`
            INSERT INTO group_members (id, group_id, user_id, role, invited_by_user_id, created_at)
            VALUES (?, ?, ?, 'member', ?, ?)
        `).bind(crypto.randomUUID(), groupId, friendId, userId, now).run();

        await db.prepare(`UPDATE social_groups SET updated_at = ? WHERE id = ?`).bind(now, groupId).run();

        return c.json({ success: true });
    } catch (e: any) {
        return c.json({ error: 'Erro ao adicionar membro: ' + e.message }, 500);
    }
});

app.post('/groups/:id/habits', zValidator('json', groupHabitSchema), async (c) => {
    const auth = await authenticateRequest(c);
    if ('error' in auth) return auth.error;

    const userId = String(auth.payload.id);
    const groupId = c.req.param('id');
    const { title, frequency } = c.req.valid('json') as z.infer<typeof groupHabitSchema>;
    const db = c.env.DB;
    const now = Date.now();

    try {
        const membership = await getGroupMembership(db, groupId, userId);
        if (!membership) return c.json({ error: 'Não tens acesso a este grupo.' }, 403);

        await db.prepare(`
            INSERT INTO group_habits (id, group_id, title, frequency, is_active, created_by_user_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, 1, ?, ?, ?)
        `).bind(crypto.randomUUID(), groupId, title.trim(), JSON.stringify(Array.from(new Set(frequency)).sort()), userId, now, now).run();

        await db.prepare(`UPDATE social_groups SET updated_at = ? WHERE id = ?`).bind(now, groupId).run();

        return c.json({ success: true });
    } catch (e: any) {
        return c.json({ error: 'Erro ao criar hábito do grupo: ' + e.message }, 500);
    }
});

app.post('/groups/:id/habits/:habitId/toggle', async (c) => {
    const auth = await authenticateRequest(c);
    if ('error' in auth) return auth.error;

    const userId = String(auth.payload.id);
    const groupId = c.req.param('id');
    const habitId = c.req.param('habitId');
    const db = c.env.DB;
    const now = Date.now();
    const todayStart = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime();

    try {
        const membership = await getGroupMembership(db, groupId, userId);
        if (!membership) return c.json({ error: 'Não tens acesso a este grupo.' }, 403);

        const habit = await db.prepare(`
            SELECT id, frequency
            FROM group_habits
            WHERE id = ? AND group_id = ? AND is_active = 1
        `).bind(habitId, groupId).first<{ id: string; frequency: string }>();
        if (!habit) return c.json({ error: 'Hábito do grupo não encontrado.' }, 404);

        const frequency = JSON.parse(habit.frequency || '[]') as number[];
        if (!frequency.includes(new Date().getDay())) {
            return c.json({ error: 'Este hábito não está agendado para hoje.' }, 400);
        }

        const existing = await db.prepare(`
            SELECT id FROM group_habit_logs
            WHERE group_habit_id = ? AND user_id = ? AND completed_at = ?
        `).bind(habitId, userId, todayStart).first();

        if (existing) {
            await db.prepare(`
                DELETE FROM group_habit_logs
                WHERE group_habit_id = ? AND user_id = ? AND completed_at = ?
            `).bind(habitId, userId, todayStart).run();
        } else {
            await db.prepare(`
                INSERT INTO group_habit_logs (id, group_habit_id, user_id, completed_at, created_at)
                VALUES (?, ?, ?, ?, ?)
            `).bind(crypto.randomUUID(), habitId, userId, todayStart, now).run();
        }

        await db.prepare(`UPDATE social_groups SET updated_at = ? WHERE id = ?`).bind(now, groupId).run();

        return c.json({ success: true, completed: !existing });
    } catch (e: any) {
        return c.json({ error: 'Erro ao atualizar progresso do grupo: ' + e.message }, 500);
    }
});

// --- POST /friends/nudge: Send a Zap/incentive to a friend ---
app.post('/friends/nudge', async (c) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return c.json({ error: 'Não autorizado' }, 401);

    const token = authHeader.replace('Bearer ', '');
    const secret = c.env.JWT_SECRET || 'zenith-local-dev-secret';
    let payload;
    try { payload = await verify(token, secret, 'HS256'); } catch { return c.json({ error: 'Token inválido' }, 401); }

    const { targetUserId } = await c.req.json().catch(() => ({}));
    if (!targetUserId) return c.json({ error: 'targetUserId é obrigatório.' }, 400);

    const db = c.env.DB;
    const userId = payload.id;
    const now = Date.now();

    try {
        // Verify friendship exists
        const friendship = await db.prepare(`
            SELECT id FROM friendships 
            WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))
            AND status = 'accepted'
        `).bind(userId, targetUserId, targetUserId, userId).first();

        if (!friendship) return c.json({ error: 'Só podes enviar incentivos a amigos.' }, 403);

        // Rate limit: max 1 nudge per hour per pair
        const recentNudge = await db.prepare(`
            SELECT id FROM nudges 
            WHERE from_user_id = ? AND to_user_id = ? AND created_at > ?
        `).bind(userId, targetUserId, now - 3600000).first();
        
        if (recentNudge) return c.json({ error: 'Já enviaste um incentivo recentemente. Aguarda 1 hora.' }, 429);

        // Save nudge
        await db.prepare('INSERT INTO nudges (id, from_user_id, to_user_id, created_at) VALUES (?, ?, ?, ?)')
            .bind(crypto.randomUUID(), userId, targetUserId, now).run();

        // Get sender name for the notification
        const sender = await db.prepare('SELECT name, username FROM users WHERE id = ?').bind(userId).first() as any;

        return c.json({ 
            success: true, 
            message: `Incentivo enviado a ${targetUserId}!`,
            senderName: sender?.name || 'Um amigo'
        });
    } catch (e: any) {
        // If nudges table doesn't exist yet, just return success (graceful degradation)
        if (e.message.includes('no such table')) {
            return c.json({ success: true, message: 'Incentivo enviado!' });
        }
        return c.json({ error: 'Erro ao enviar incentivo: ' + e.message }, 500);
    }
});

// --- GET /friends/nudges: Get incoming nudges for the current user ---
app.get('/friends/nudges', async (c) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return c.json({ error: 'Não autorizado' }, 401);

    const token = authHeader.replace('Bearer ', '');
    const secret = c.env.JWT_SECRET || 'zenith-local-dev-secret';
    let payload;
    try { payload = await verify(token, secret, 'HS256'); } catch { return c.json({ error: 'Token inválido' }, 401); }

    const db = c.env.DB;
    const userId = payload.id;
    const since = parseInt(c.req.query('since') || '0', 10);

    try {
        const { results } = await db.prepare(`
            SELECT n.id, n.from_user_id, u.name as from_name, u.username as from_username, n.created_at
            FROM nudges n
            JOIN users u ON u.id = n.from_user_id
            WHERE n.to_user_id = ? AND n.created_at > ?
            ORDER BY n.created_at DESC LIMIT 10
        `).bind(userId, since).all();
        return c.json({ nudges: results });
    } catch (e: any) {
        if (e.message.includes('no such table')) return c.json({ nudges: [] });
        return c.json({ error: 'Erro ao buscar incentivos: ' + e.message }, 500);
    }
});

// --- POST /users/report: Report a user ---
app.post('/users/report', async (c) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return c.json({ error: 'Não autorizado' }, 401);

    const token = authHeader.replace('Bearer ', '');
    const secret = c.env.JWT_SECRET || 'zenith-local-dev-secret';
    let payload;
    try { payload = await verify(token, secret, 'HS256'); } catch { return c.json({ error: 'Token inválido' }, 401); }

    const { reportedUserId, reason } = await c.req.json().catch(() => ({}));
    if (!reportedUserId) return c.json({ error: 'reportedUserId é obrigatório.' }, 400);

    const db = c.env.DB;
    const now = Date.now();

    try {
        await db.prepare(`
            INSERT OR IGNORE INTO beta_feedbacks (id, user_name, platform, content, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
            crypto.randomUUID(),
            `REPORT from ${payload.id}`,
            'user_report',
            `Reported user: ${reportedUserId}. Reason: ${reason || 'Not specified'}`,
            'unread',
            now
        ).run();

        return c.json({ success: true, message: 'Denúncia enviada com sucesso.' });
    } catch (e: any) {
        return c.json({ error: 'Erro ao enviar denúncia: ' + e.message }, 500);
    }
});

// --- POST /friends/block: Block a user (removes friendship + blocks) ---
app.post('/friends/block', async (c) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return c.json({ error: 'Não autorizado' }, 401);

    const token = authHeader.replace('Bearer ', '');
    const secret = c.env.JWT_SECRET || 'zenith-local-dev-secret';
    let payload;
    try { payload = await verify(token, secret, 'HS256'); } catch { return c.json({ error: 'Token inválido' }, 401); }

    const { blockedUserId } = await c.req.json().catch(() => ({}));
    if (!blockedUserId) return c.json({ error: 'blockedUserId é obrigatório.' }, 400);

    const db = c.env.DB;
    const userId = payload.id;
    const now = Date.now();

    try {
        // Remove/update friendship to blocked status
        await db.prepare(`
            UPDATE friendships SET status = 'blocked', updated_at = ?
            WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))
        `).bind(now, userId, blockedUserId, blockedUserId, userId).run();

        // Also delete any pending requests
        await db.prepare(`
            DELETE FROM friendships 
            WHERE status = 'pending' AND 
            ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))
        `).bind(userId, blockedUserId, blockedUserId, userId).run();

        return c.json({ success: true, message: 'Utilizador bloqueado.' });
    } catch (e: any) {
        return c.json({ error: 'Erro ao bloquear utilizador: ' + e.message }, 500);
    }
});

// --- GET /friends/blocked: List all blocked users ---
app.get('/friends/blocked', async (c) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return c.json({ error: 'Não autorizado' }, 401);

    const token = authHeader.replace('Bearer ', '');
    const secret = c.env.JWT_SECRET || 'zenith-local-dev-secret';
    let payload;
    try { payload = await verify(token, secret, 'HS256'); } catch { return c.json({ error: 'Token inválido' }, 401); }

    const db = c.env.DB;
    const userId = payload.id;

    try {
        // Only show users that THIS user blocked (user_id = userId, status = blocked)
        const { results } = await db.prepare(`
            SELECT f.id as friendship_id, u.id, u.name, u.username
            FROM friendships f
            JOIN users u ON u.id = f.friend_id
            WHERE f.user_id = ? AND f.status = 'blocked'
        `).bind(userId).all();

        return c.json({ blocked: results });
    } catch (e: any) {
        return c.json({ error: 'Erro ao listar bloqueados: ' + e.message }, 500);
    }
});

// --- POST /friends/unblock: Unblock a user (deletes the blocked friendship row) ---
app.post('/friends/unblock', async (c) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return c.json({ error: 'Não autorizado' }, 401);

    const token = authHeader.replace('Bearer ', '');
    const secret = c.env.JWT_SECRET || 'zenith-local-dev-secret';
    let payload;
    try { payload = await verify(token, secret, 'HS256'); } catch { return c.json({ error: 'Token inválido' }, 401); }

    const { unblockedUserId } = await c.req.json().catch(() => ({}));
    if (!unblockedUserId) return c.json({ error: 'unblockedUserId é obrigatório.' }, 400);

    const db = c.env.DB;
    const userId = payload.id;

    try {
        // The blocker is always user_id when blocking, so we only delete where user_id = the requester
        const res = await db.prepare(`
            DELETE FROM friendships 
            WHERE user_id = ? AND friend_id = ? AND status = 'blocked'
        `).bind(userId, unblockedUserId).run();

        if (res.meta.changes === 0) {
            return c.json({ error: 'Utilizador não encontrado na lista de bloqueados.' }, 404);
        }

        return c.json({ success: true, message: 'Utilizador desbloqueado.' });
    } catch (e: any) {
        return c.json({ error: 'Erro ao desbloquear utilizador: ' + e.message }, 500);
    }
});


app.get('/friends/compare/:username', async (c) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return c.json({ error: 'Não autorizado' }, 401);

    const friendUsername = c.req.param('username');
    const token = authHeader.replace('Bearer ', '');
    const secret = c.env.JWT_SECRET;
    if (!secret && c.env.ENVIRONMENT === 'production') {
        console.error('[AUTH] MISSING JWT_SECRET IN PRODUCTION!');
        return c.json({ error: 'Erro de configuração do servidor.' }, 500);
    }
    const tokenSecret = secret || 'zenith-local-dev-secret';
    let payload;
    try {
        payload = await verify(token, tokenSecret, 'HS256');
    } catch {
        return c.json({ error: 'Token inválido' }, 401);
    }

    const db = c.env.DB;
    try {
        // Find friend first and verify friendship
        const friend = await db.prepare('SELECT id, name, username FROM users WHERE username = ?').bind(friendUsername).first();
        if (!friend) return c.json({ error: 'Utilizador não encontrado.' }, 404);

        // Verification of friendship can be added here if we want private stats
        
        const { results: friendHabits } = await db.prepare(`
            SELECT h.id, h.title, COUNT(l.id) as completions
            FROM habits h
            LEFT JOIN logs l ON l.habit_id = h.id
            WHERE h.user_id = ? AND h.is_active = 1
            GROUP BY h.id
        `).bind(friend.id as any).all();

        return c.json({ 
            friend: {
                name: friend.name,
                username: friend.username,
                habits: friendHabits
            }
        });
    } catch (e: any) {
        return c.json({ error: 'Erro ao comparar stats: ' + e.message }, 500);
    }
});

app.get('/users/:username/profile', async (c) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return c.json({ error: 'Não autorizado' }, 401);

    const rawUsername = c.req.param('username');
    const targetUsername = rawUsername.startsWith('@') ? rawUsername.substring(1) : rawUsername;

    const token = authHeader.replace('Bearer ', '');
    const secret = c.env.JWT_SECRET;
    const tokenSecret = secret || 'zenith-local-dev-secret';
    
    let payload;
    try {
        payload = await verify(token, tokenSecret, 'HS256');
    } catch {
        return c.json({ error: 'Token inválido' }, 401);
    }

    const requesterId = payload.id;
    const db = c.env.DB;

    try {
        // Find target user (Case-insensitive lookup)
        const user = await db.prepare('SELECT id, name, username, level, total_xp, arena_points FROM users WHERE LOWER(username) = LOWER(?)').bind(targetUsername).first() as any;
        if (!user) return c.json({ error: 'Utilizador não encontrado.' }, 404);

        // Check if requester is friends with target (or is the target themselves)
        if (user.id !== requesterId) {
            const friendship = await db.prepare(`
                SELECT status FROM friendships 
                WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))
                AND status = 'accepted'
            `).bind(requesterId, user.id, user.id, requesterId).first();
            
            if (!friendship) return c.json({ error: 'Apenas amigos podem ver este perfil.' }, 403);
        }

        // Get Arena History
        const { results: arenaWinners } = await db.prepare(`
            SELECT
                w.season_id,
                w.rank_name,
                w.position,
                w.created_at,
                s.name as season_name,
                s.start_at as season_start_at,
                s.end_at as season_end_at
            FROM arena_winners w
            LEFT JOIN arena_seasons s ON s.id = w.season_id
            WHERE w.user_id = ?
            ORDER BY w.created_at DESC
        `).bind(user.id as any).all();

        // Get Habit Summary
        const habitsRes = await db.prepare('SELECT id, title, is_hard_mode, is_active FROM habits WHERE user_id = ?').bind(user.id as any).all();
        const habits = habitsRes.results || [];
        const habitIds = habits.map((h: any) => h.id);

        // Get Stats: Total Completions
        const logsCount = await db.prepare('SELECT COUNT(*) as total FROM logs WHERE habit_id IN (SELECT id FROM habits WHERE user_id = ?)').bind(user.id as any).first();

        // Get Weekly Stats (Last 7 Days exactly, ending today)
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Today at midnight
        now.setDate(now.getDate() + 1); // Midnight of tomorrow (exclusive boundary)
        const endOfToday = now.getTime();

        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const startOf7Days = sevenDaysAgo.getTime();

        // Group by YYYY-MM-DD
        const weekdayStats = await db.prepare(`
            SELECT date(completed_at / 1000, 'unixepoch') as log_date, COUNT(*) as count 
            FROM logs 
            WHERE habit_id IN (SELECT id FROM habits WHERE user_id = ?)
            AND completed_at >= ? AND completed_at < ?
            GROUP BY log_date
        `).bind(user.id as any, startOf7Days, endOfToday).all();

        // activeWeekdays [day-6, day-5, day-4, day-3, day-2, day-1, today]
        const activeWeekdays = [0, 0, 0, 0, 0, 0, 0];
        let weeklyCompletions = 0;
        
        if (weekdayStats.results) {
            weekdayStats.results.forEach((row: any) => {
                const count = parseInt(row.count);
                weeklyCompletions += count;

                // Determine which of the 7 days this log falls into
                const logTime = new Date(row.log_date + "T12:00:00Z").getTime();
                const daysDiff = Math.floor((endOfToday - logTime) / (1000 * 60 * 60 * 24));
                
                // daysDiff: 0 = today (since endOfToday is tomorrow midnight)
                // daysDiff: 6 = 6 days ago
                const arrayIndex = 6 - daysDiff; // 6-0 = 6 (today), 6-6 = 0 (6 days ago)
                
                if (arrayIndex >= 0 && arrayIndex <= 6) {
                    activeWeekdays[arrayIndex] += count;
                }
            });
        }

        // Basic Achievement Checks (Replicating some frontend logic)
        const unlockedTrophies = [];
        const totalCompletions = (logsCount?.total as number) || 0;
        
        if (totalCompletions >= 100) unlockedTrophies.push('checkin_master');
        if (habits.length > 0 && totalCompletions > 0) unlockedTrophies.push('zen_beginner');
        if (habitIds.length >= 5) unlockedTrophies.push('habit_architect');
        
        // Friendship count for 'socializer'
        const friendsCountRes = await db.prepare("SELECT COUNT(*) as total FROM friendships WHERE (user_id = ? OR friend_id = ?) AND status = 'accepted'").bind(user.id as any, user.id as any).first();
        if (((friendsCountRes?.total as number) || 0) >= 5) unlockedTrophies.push('socializer');

        // Best Streak (Simplified for now: return max completions per specific days etc or just a mock)
        // Finding real streak in one SQL is hard, so we return 0 and let frontend handle if it has enough data, 
        // but for friends we don't send all logs. For now we just return a placeholder or totalXP based rank.
        
        return c.json({
            user: {
                id: user.id,
                name: user.name,
                username: user.username,
                level: user.level,
                totalXp: user.total_xp
            },
            arenaHistory: arenaWinners,
            stats: {
                totalCompletions,
                weeklyCompletions,
                activeWeekdays,
                activeHabitsCount: habitIds.length
            },
            unlockedTrophies
        });

    } catch (e: any) {
        console.error('Error in /users/:username/profile:', e);
        return c.json({ error: 'Erro interno ao carregar perfil: ' + e.message }, 500);
    }
});

app.get('/leaderboard', async (c) => {
    const auth = await authenticateRequest(c);
    if ('error' in auth) return auth.error;

    const userId = String(auth.payload.id);
    const db = c.env.DB;
    const now = Date.now();
    const period = c.req.query('period') === 'historical' ? 'historical' : 'seasonal';

    try {
        // 1) Find current active season.
        let activeSeason = await db.prepare(
            'SELECT * FROM arena_seasons WHERE is_finalized = 0 AND start_at <= ? AND end_at > ? ORDER BY end_at ASC LIMIT 1'
        ).bind(now, now).first<any>();

        // 2) If no active season exists, finalize the latest expired one and create current month season.
        if (!activeSeason) {
            const expiredSeason = await db.prepare(
                'SELECT * FROM arena_seasons WHERE is_finalized = 0 AND end_at <= ? ORDER BY end_at DESC LIMIT 1'
            ).bind(now).first<any>();

            if (expiredSeason) {
                const topPlayers = await db.prepare(`
                    SELECT u.id, u.name, u.username, u.arena_points as score
                    FROM users u
                    WHERE u.opt_in_leaderboard = 1 AND u.arena_points > 0
                    ORDER BY u.arena_points DESC, u.total_xp DESC, u.created_at ASC, u.id ASC
                    LIMIT 3
                `).all<any>();

                if (topPlayers.results && topPlayers.results.length > 0) {
                    for (let i = 0; i < topPlayers.results.length; i++) {
                        const winner = topPlayers.results[i];
                        const winnerId = crypto.randomUUID();
                        await db.prepare(
                            'INSERT INTO arena_winners (id, user_id, season_id, rank_name, position, created_at) VALUES (?, ?, ?, ?, ?, ?)'
                        )
                            .bind(
                                winnerId,
                                winner.id,
                                expiredSeason.id,
                                getArenaPodiumRankName(i + 1),
                                i + 1,
                                now
                            )
                            .run();
                    }
                }

                await db.prepare('UPDATE arena_seasons SET is_finalized = 1 WHERE id = ?').bind(expiredSeason.id).run();
                await db.prepare('UPDATE users SET arena_points = 0').run();
            }

            const currentDate = new Date();
            const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1, 0, 0, 0, 0).getTime();
            const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

            const nextSeasonId = `SEASON-${startOfMonth}`;
            const monthName = new Intl.DateTimeFormat('pt-PT', { month: 'long', year: 'numeric' }).format(currentDate);

            await db.prepare(
                'INSERT OR IGNORE INTO arena_seasons (id, name, start_at, end_at, is_finalized, created_at) VALUES (?, ?, ?, ?, ?, ?)'
            )
                .bind(nextSeasonId, `Arena ${monthName}`, startOfMonth, endOfMonth, 0, now)
                .run();

            activeSeason = await db.prepare('SELECT * FROM arena_seasons WHERE id = ?').bind(nextSeasonId).first<any>();
        }

        if (period === 'historical') {
            const historicalQuery = `
                SELECT
                    w.id,
                    w.user_id as userId,
                    w.season_id as season_id,
                    w.rank_name as rank_name,
                    w.position,
                    w.created_at as created_at,
                    u.name,
                    u.username,
                    s.name as season_name,
                    s.start_at as season_start_at,
                    s.end_at as season_end_at
                FROM arena_winners w
                JOIN users u ON w.user_id = u.id
                LEFT JOIN arena_seasons s ON w.season_id = s.id
                ORDER BY s.end_at DESC, w.position ASC, w.created_at DESC
            `;
            const { results: winners } = await db.prepare(historicalQuery).all<any>();

            const uniqueSeasons = new Set((winners || []).map((winner: any) => String(winner.season_id || 'unknown')));

            return c.json({
                leaderboard: winners || [],
                type: 'historical',
                meta: {
                    seasonsCount: uniqueSeasons.size,
                    totalWinners: (winners || []).length,
                },
            });
        }

        const seasonalRes = await db.prepare(`
            SELECT u.id, u.name, u.username, u.arena_points as score
            FROM users u
            WHERE u.opt_in_leaderboard = 1
            ORDER BY u.arena_points DESC, u.total_xp DESC, u.created_at ASC, u.id ASC
            LIMIT 100
        `).all<any>();

        const leaderboard = seasonalRes.results || [];

        const participantsRow = await db.prepare(
            'SELECT COUNT(*) as total FROM users WHERE opt_in_leaderboard = 1'
        ).first<{ total: number }>();
        const statsRow = await db.prepare(
            'SELECT MAX(arena_points) as topScore, AVG(arena_points) as averageScore FROM users WHERE opt_in_leaderboard = 1'
        ).first<{ topScore: number | null; averageScore: number | null }>();

        const participantsCount = Number(participantsRow?.total || 0);
        const topScore = Number(statsRow?.topScore || 0);
        const averageScore = Number(statsRow?.averageScore || 0);

        const meRow = await db.prepare(`
            SELECT id, name, username, opt_in_leaderboard as optedIn, arena_points as score
            FROM users
            WHERE id = ?
        `).bind(userId).first<{ id: string; name: string; username: string; optedIn: number; score: number }>();

        let me: {
            userId: string;
            name: string;
            username: string;
            score: number;
            position: number;
            percentile: number;
            pointsToNext: number;
            tier: string;
            isInTop: boolean;
        } | null = null;

        if (meRow && Number(meRow.optedIn) === 1) {
            const myScore = Number(meRow.score || 0);

            const aheadRow = await db.prepare(`
                SELECT COUNT(*) as ahead
                FROM users
                WHERE opt_in_leaderboard = 1
                  AND (arena_points > ? OR (arena_points = ? AND id < ?))
            `).bind(myScore, myScore, userId).first<{ ahead: number }>();

            const position = Number(aheadRow?.ahead || 0) + 1;

            const nextHigherRow = await db.prepare(`
                SELECT arena_points as score
                FROM users
                WHERE opt_in_leaderboard = 1 AND arena_points > ?
                ORDER BY arena_points ASC
                LIMIT 1
            `).bind(myScore).first<{ score: number }>();

            const pointsToNext = nextHigherRow ? Math.max(0, Number(nextHigherRow.score) - myScore + 1) : 0;
            const percentile = participantsCount > 0
                ? Math.max(1, Math.round(((participantsCount - position + 1) / participantsCount) * 100))
                : 0;

            me = {
                userId: meRow.id,
                name: meRow.name,
                username: meRow.username,
                score: myScore,
                position,
                percentile,
                pointsToNext,
                tier: getArenaTierFromScore(myScore).name,
                isInTop: leaderboard.some((entry: any) => String(entry.id) === meRow.id),
            };
        }

        return c.json({
            leaderboard,
            type: 'seasonal',
            season: activeSeason
                ? {
                    id: activeSeason.id,
                    name: activeSeason.name,
                    endsAt: activeSeason.end_at,
                    startsAt: activeSeason.start_at,
                }
                : null,
            meta: {
                participantsCount,
                topScore,
                averageScore: Math.round(averageScore),
            },
            me,
        });
    } catch (e: any) {
        console.error('Leaderboard error:', e);
        return c.json({ error: 'Erro ao carregar arena: ' + e.message }, 500);
    }
});

app.delete('/auth/account', async (c) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'Não autorizado' }, 401);
    }
    const token = authHeader.split(' ')[1];
    const secret = c.env.JWT_SECRET;
    if (!secret && c.env.ENVIRONMENT === 'production') {
        console.error('[AUTH] MISSING JWT_SECRET IN PRODUCTION!');
        return c.json({ error: 'Erro de configuração do servidor.' }, 500);
    }
    const tokenSecret = secret || 'zenith-local-dev-secret';
    let payload;
    try {
        payload = await verify(token, tokenSecret, 'HS256');
    } catch {
        return c.json({ error: 'Token inválido' }, 401);
    }

    const userId = payload.id;
    const body = await c.req.json().catch(() => ({}));
    const password = body.password;

    if (!password) {
        return c.json({ error: 'A password é obrigatória para esta ação.' }, 400);
    }

    const db = c.env.DB;
    type UserRow = { id: string, password_hash: string };
    const user = await db.prepare('SELECT id, password_hash FROM users WHERE id = ?').bind(userId).first<UserRow>();

    if (!user) {
        return c.json({ error: 'Conta não encontrada.' }, 404);
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
        return c.json({ error: 'Password incorreta.' }, 401);
    }

    try {
        // Apaga em cascata (Logs -> Hábitos -> Utilizador)
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

app.post('/auth/change-password', async (c) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return c.json({ error: 'Não autorizado' }, 401);

    const token = authHeader.replace('Bearer ', '');
    const secret = c.env.JWT_SECRET;
    if (!secret && c.env.ENVIRONMENT === 'production') {
        console.error('[AUTH] MISSING JWT_SECRET IN PRODUCTION!');
        return c.json({ error: 'Erro de configuração do servidor.' }, 500);
    }
    const tokenSecret = secret || 'zenith-local-dev-secret';
    let payload;
    try {
        payload = await verify(token, tokenSecret, 'HS256');
    } catch {
        return c.json({ error: 'Token inválido' }, 401);
    }

    const userId = payload.id;
    const { currentPassword, newPassword } = await c.req.json().catch(() => ({}));

    if (!currentPassword || !newPassword) {
        return c.json({ error: 'Dados incompletos.' }, 400);
    }

    const db = c.env.DB;
    type UserRow = { id: string, password_hash: string };
    const user = await db.prepare('SELECT id, password_hash FROM users WHERE id = ?').bind(userId).first<UserRow>();

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

app.post('/auth/forgot-password', async (c) => {
    try {
        const { email, hp } = await c.req.json().catch(() => ({}));
        if (hp) return c.json({ message: 'Código enviado com sucesso.' }); // Silent fail for bots

        const ip = c.req.header('CF-Connecting-IP') || 'local';
        // Rate limit: 3 requests per 10 minutes per IP
        if (!checkRateLimit(`forgot-${ip}`, 3, 10 * 60 * 1000)) {
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
            if (!resendRes.ok) {
                console.error(`[ZENITH_AUTH] Resend failed for ${email}`);
            }
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

app.post('/auth/reset-password', async (c) => {
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

// --- SYNC ROUTES ---
// Protect all /sync/* routes with JWT middleware

app.use('/sync/*', (c, next) => {
    const secret = c.env.JWT_SECRET || 'zenith-local-dev-secret';
    const jwtMiddleware = jwt({ secret, alg: 'HS256' });
    return jwtMiddleware(c, next);
});

function normalizeHabitFrequency(rawFrequency: string): number[] {
    try {
        const parsed = JSON.parse(rawFrequency) as unknown;
        if (Array.isArray(parsed)) {
            return parsed
                .filter((value): value is number => typeof value === 'number' && value >= 0 && value <= 6)
                .sort((a, b) => a - b);
        }
    } catch {
        return [0, 1, 2, 3, 4, 5, 6];
    }

    return [0, 1, 2, 3, 4, 5, 6];
}

function getStartOfDayMs(timestamp: number) {
    const date = new Date(timestamp);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
}

function getStartOfWeekMs(timestamp: number) {
    const date = new Date(timestamp);
    date.setHours(0, 0, 0, 0);
    const currentDay = date.getDay();
    const diffToMonday = (currentDay + 6) % 7;
    date.setDate(date.getDate() - diffToMonday);
    return date.getTime();
}

function calculateCanonicalXp(habitsRaw: any[], logsRaw: any[]) {
    const logsByHabit = new Map<string, any[]>();

    for (const log of logsRaw) {
        const currentLogs = logsByHabit.get(log.habit_id) || [];
        currentLogs.push(log);
        logsByHabit.set(log.habit_id, currentLogs);
    }

    return habitsRaw.reduce((totalXp, habit) => {
        const habitLogs = logsByHabit.get(habit.id) || [];
        if (habitLogs.length === 0) return totalXp;

        const scheduleType = habit.schedule_type === 'times_per_week' ? 'times_per_week' : 'specific_days';
        const goalType = habit.goal_type === 'count' ? 'count' : 'complete';
        const targetValue = scheduleType === 'times_per_week'
            ? Math.min(7, Math.max(1, Number(habit.weekly_target || 1)))
            : goalType === 'count'
                ? Math.max(1, Number(habit.target_value || 1))
                : 1;
        const xpPerCompletion = habit.is_hard_mode === 1 ? 20 : 10;
        const frequency = normalizeHabitFrequency(habit.frequency);
        const progressByPeriod = new Map<number, number>();

        for (const log of habitLogs) {
            const dayMs = getStartOfDayMs(Number(log.completed_at));
            const dayOfWeek = new Date(dayMs).getDay();
            if (scheduleType === 'specific_days' && !frequency.includes(dayOfWeek)) {
                continue;
            }

            const periodKey = scheduleType === 'times_per_week' ? getStartOfWeekMs(dayMs) : dayMs;
            const logValue = Math.max(0, Number(log.value ?? 1));
            progressByPeriod.set(periodKey, (progressByPeriod.get(periodKey) || 0) + logValue);
        }

        const completedPeriods = Array.from(progressByPeriod.values()).filter((value) => value >= targetValue).length;
        return totalXp + (completedPeriods * xpPerCompletion);
    }, 0);
}

// Zod schemas for the sync payloads to heavily validate incoming edge data
const habitSchema = z.object({
    id: z.string().uuid(),
    title: z.string().min(1).max(200),
    frequency: z.array(z.number().min(0).max(6)).max(7),
    scheduleType: z.enum(['specific_days', 'times_per_week']).optional(),
    weeklyTarget: z.number().int().min(1).max(7).nullable().optional(),
    goalType: z.enum(['complete', 'count']).optional(),
    targetValue: z.number().int().min(1).nullable().optional(),
    unitLabel: z.string().max(24).nullable().optional(),
    isHardMode: z.boolean().optional(),
    reminderTime: z.string().regex(/^([01]\d|2[0-3]):?([0-5]\d)$/).nullable().optional(),
    isActive: z.boolean(),
    createdAt: z.number(),
    updatedAt: z.number().optional(),
});

const logSchema = z.object({
    id: z.string().uuid(),
    habitId: z.string().uuid(),
    completedAt: z.number(),
    value: z.number().int().min(1).optional(),
});

const pushSchema = z.object({
    habits: z.array(habitSchema),
    logs: z.array(logSchema),
    lastSyncedAt: z.number(),
    deletedHabitIds: z.array(z.string().uuid()).optional(),
    deletedLogIds: z.array(z.string().uuid()).optional(),
});

app.post('/sync/push', zValidator('json', pushSchema), async (c) => {
    const payload = c.req.valid('json');
    const user = c.get('jwtPayload') as { id: string, name: string, email: string, exp: number };
    const db = c.env.DB;

    const now = Date.now();
    const stmts: D1PreparedStatement[] = [];

    // Upsert Habits safely
    for (const habit of payload.habits) {
        stmts.push(
            db.prepare(`
        INSERT INTO habits (id, user_id, title, frequency, schedule_type, weekly_target, goal_type, target_value, unit_label, is_hard_mode, reminder_time, is_active, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET 
          title=excluded.title, 
          frequency=excluded.frequency, 
          schedule_type=excluded.schedule_type,
          weekly_target=excluded.weekly_target,
          goal_type=excluded.goal_type,
          target_value=excluded.target_value,
          unit_label=excluded.unit_label,
          is_hard_mode=excluded.is_hard_mode, 
          reminder_time=excluded.reminder_time, 
          is_active=excluded.is_active, 
          updated_at=excluded.updated_at 
        WHERE updated_at < excluded.updated_at
      `).bind(
                habit.id,
                user.id,
                habit.title,
                JSON.stringify(habit.frequency),
                habit.scheduleType || 'specific_days',
                habit.scheduleType === 'times_per_week' ? (habit.weeklyTarget || 1) : null,
                habit.goalType || 'complete',
                habit.goalType === 'count' ? (habit.targetValue || 1) : null,
                habit.goalType === 'count' ? (habit.unitLabel || null) : null,
                habit.isHardMode ? 1 : 0,
                habit.reminderTime || null,
                habit.isActive ? 1 : 0,
                habit.createdAt,
                habit.updatedAt || now
            )
        );
    }

    // Upsert Logs (Logs are immutable in Zenith, so simple INSERT OR IGNORE is fine)
    // SECURITY: We must ensure the habitId belongs to the authenticated user!
    for (const log of payload.logs) {
        stmts.push(
            db.prepare(`
        INSERT OR IGNORE INTO logs (id, habit_id, completed_at, value, synced_at)
        SELECT ?, ?, ?, ?, ?
        WHERE EXISTS (SELECT 1 FROM habits WHERE id = ? AND user_id = ?)
      `).bind(log.id, log.habitId, log.completedAt, log.value || null, now, log.habitId, user.id)
        );
    }

    // Handle Deletions (Tombstones)
    if (payload.deletedHabitIds && payload.deletedHabitIds.length > 0) {
        for (const habitId of payload.deletedHabitIds) {
            // SECURITY: Only delete logs and habit if owned by the user
            stmts.push(db.prepare(`
                DELETE FROM logs 
                WHERE habit_id = ? 
                AND habit_id IN (SELECT id FROM habits WHERE user_id = ?)
            `).bind(habitId, user.id));

            stmts.push(db.prepare('DELETE FROM habits WHERE id = ? AND user_id = ?').bind(habitId, user.id));
        }
    }

    if (payload.deletedLogIds && payload.deletedLogIds.length > 0) {
        for (const logId of payload.deletedLogIds) {
            stmts.push(db.prepare(`
                DELETE FROM logs 
                WHERE id = ? 
                AND habit_id IN (SELECT id FROM habits WHERE user_id = ?)
            `).bind(logId, user.id));
        }
    }

    try {
        if (stmts.length > 0) {
            await db.batch(stmts);
        }
        return c.json({ success: true, timestamp: now });
    } catch (err: any) {
        return c.json({ error: 'Sync failed: ' + err.message }, 500);
    }
});

app.get('/sync/pull', async (c) => {
    const user = c.get('jwtPayload') as { id: string, name: string, email: string, exp: number };
    const lastSyncedAt = parseInt(c.req.query('lastSyncedAt') || '0', 10);
    const db = c.env.DB;

    try {
        // 1. Get updated habits for this user
        const { results: habitsRaw } = await db.prepare(`
      SELECT * FROM habits WHERE user_id = ? AND updated_at > ?
    `).bind(user.id, lastSyncedAt).all();

        // 2. Get updated logs for this user's habits
        const { results: logsRaw } = await db.prepare(`
      SELECT l.* FROM logs l
      JOIN habits h ON l.habit_id = h.id
      WHERE h.user_id = ? AND l.synced_at > ?
    `).bind(user.id, lastSyncedAt).all();

        // Map rows to frontend-expected format
        const habits = habitsRaw.map((r: any) => ({
            id: r.id,
            title: r.title,
            frequency: JSON.parse(r.frequency),
            scheduleType: r.schedule_type || 'specific_days',
            weeklyTarget: r.weekly_target || undefined,
            goalType: r.goal_type || 'complete',
            targetValue: r.target_value || undefined,
            unitLabel: r.unit_label || undefined,
            isHardMode: r.is_hard_mode === 1,
            reminderTime: r.reminder_time || undefined,
            isActive: r.is_active === 1,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
        }));

        const logs = logsRaw.map((r: any) => ({
            id: r.id,
            habitId: r.habit_id,
            completedAt: r.completed_at,
            value: r.value || undefined,
        }));

        const { results: allHabitsRaw } = await db.prepare(`
            SELECT * FROM habits WHERE user_id = ?
        `).bind(user.id).all();

        const { results: allLogsRaw } = await db.prepare(`
            SELECT l.* FROM logs l
            JOIN habits h ON l.habit_id = h.id
            WHERE h.user_id = ?
        `).bind(user.id).all();

        // 3. AUTHORITATIVE: Recalculate total_xp and level directly from the completed periods in DB.
        const correctXp = calculateCanonicalXp(allHabitsRaw as any[], allLogsRaw as any[]);
        const correctLevel = Math.max(1, Math.floor(correctXp / 100) + 1);

        // Also get arena_points and lastLoginRewardDate (these remain client-controlled)
        const userProfile = await db.prepare('SELECT arena_points, last_login_reward_date FROM users WHERE id = ?').bind(user.id).first() as any;

        // Update DB with canonical XP/Level (heals any corruption)
        await db.prepare('UPDATE users SET total_xp = ?, level = ? WHERE id = ?')
            .bind(correctXp, correctLevel, user.id)
            .run();

        return c.json({ 
            habits, 
            logs,
            timestamp: Date.now(),
            user: {
                total_xp: correctXp,
                level: correctLevel,
                arena_points: userProfile?.arena_points || 0,
                lastLoginRewardDate: userProfile?.last_login_reward_date || null
            }
        });
    } catch (err: any) {
        return c.json({ error: 'Pull failed: ' + err.message }, 500);
    }
});

// --- BETA FEEDBACK ROUTES ---

const feedbackSchema = z.object({
    feedback: z.string().min(1).max(2000),
    user: z.string().max(100).optional(),
    platform: z.string().max(100).optional(),
});

app.post('/beta/feedback', zValidator('json', feedbackSchema), async (c) => {
    const { feedback, user, platform } = c.req.valid('json');
    const db = c.env.DB;

    const userName = user || 'Unknown';
    const plat = platform || 'Unknown';

    console.log(`[ZENITH_BETA] Feedback from ${userName}: ${feedback} (${plat})`);

    try {
        await db.prepare(
            'INSERT INTO beta_feedbacks (id, user_name, platform, content, status, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(
            crypto.randomUUID(),
            userName,
            plat,
            feedback,
            'unread',
            Date.now()
        ).run();

        return c.json({ success: true, message: 'Obrigado pelo feedback!' });
    } catch (err: any) {
        console.error('[ZENITH_BETA_ERROR]', err.message);
        return c.json({ error: 'Falha ao guardar feedback internamente.' }, 500);
    }
});

// --- ADMIN ROUTES ---
// Simple Admin Auth (in production, use a more secure approach or Cloudflare Access)
const ADMIN_SECRET = 'zenith-admin'; // This should come from c.env.ADMIN_SECRET ideally

app.get('/admin/feedbacks', async (c) => {
    const authHeader = c.req.header('Authorization');

    // Check if the provided secret matches our Admin Secret
    if (!authHeader || authHeader !== `Bearer ${ADMIN_SECRET}`) {
        return c.json({ error: 'Acesso Restrito Admnistrativo.' }, 401);
    }

    const db = c.env.DB;
    try {
        const { results } = await db.prepare('SELECT * FROM beta_feedbacks ORDER BY created_at DESC').all();
        c.header('Cache-Control', 'public, max-age=10');
        return c.json({ feedbacks: results });
    } catch (err: any) {
        return c.json({ error: 'Erro ao carregar feedbacks: ' + err.message }, 500);
    }
});

app.get('/admin/stats', async (c) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || authHeader !== `Bearer ${ADMIN_SECRET}`) {
        return c.json({ error: 'Acesso Restrito Admnistrativo.' }, 401);
    }

    const db = c.env.DB;
    try {
        // Aggregate Metrics
        const totalUsers = await db.prepare('SELECT COUNT(*) as count FROM users').first() as any;
        const totalHabits = await db.prepare('SELECT COUNT(*) as count FROM habits').first() as any;
        const totalLogs = await db.prepare('SELECT COUNT(*) as count FROM logs').first() as any;

        const last24h = Date.now() - (24 * 60 * 60 * 1000);
        const activeUsers24h = await db.prepare('SELECT COUNT(DISTINCT user_id) as count FROM habits WHERE updated_at > ?').bind(last24h).first() as any;
        const logs24h = await db.prepare('SELECT COUNT(*) as count FROM logs WHERE completed_at > ?').bind(last24h).first() as any;

        // Get Recent Activity (Anonymized)
        const recentUsers = await db.prepare('SELECT name, created_at FROM users ORDER BY created_at DESC LIMIT 5').all();

        c.header('Cache-Control', 'public, max-age=10');
        return c.json({
            stats: {
                totalUsers: totalUsers.count,
                totalHabits: totalHabits.count,
                totalLogs: totalLogs.count,
                activeUsers24h: activeUsers24h.count,
                logs24h: logs24h.count,
            },
            recentEvents: recentUsers.results
        });
    } catch (err: any) {
        return c.json({ error: 'Erro ao carregar estatísticas: ' + err.message }, 500);
    }
});

app.post('/admin/feedbacks/:id/status', async (c) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || authHeader !== `Bearer ${ADMIN_SECRET}`) {
        return c.json({ error: 'Acesso Restrito Admnistrativo.' }, 401);
    }

    const id = c.req.param('id');
    const { status } = await c.req.json().catch(() => ({ status: '' }));

    if (!['unread', 'read', 'resolved'].includes(status)) {
        return c.json({ error: 'Estado inválido.' }, 400);
    }

    const db = c.env.DB;
    try {
        await db.prepare('UPDATE beta_feedbacks SET status = ? WHERE id = ?').bind(status, id).run();
        return c.json({ success: true, message: `Estado atualizado para ${status}` });
    } catch (err: any) {
        return c.json({ error: 'Erro ao atualizar feedback: ' + err.message }, 500);
    }
});

// --- ARENA REWARDS & DECORATIONS ---

app.get('/users/me/rewards', async (c) => {
    try {
        const auth = await authenticateRequest(c);
        if ('error' in auth) return auth.error;

        const userId = String(auth.payload.id);
        const db = c.env.DB;

        const rewards = await db.prepare(`
            SELECT
                w.id,
                w.user_id,
                w.season_id,
                w.rank_name,
                w.position,
                w.created_at,
                s.name as season_name,
                s.start_at as season_start_at,
                s.end_at as season_end_at
            FROM arena_winners w
            LEFT JOIN arena_seasons s ON s.id = w.season_id
            WHERE w.user_id = ?
            ORDER BY w.created_at DESC
        `)
            .bind(userId)
            .all();

        return c.json(rewards.results || []);
    } catch (e: any) {
        return c.json({ error: 'Erro ao carregar recompensas: ' + e.message }, 500);
    }
});

// Admin/Internal Mock: Award an Arena Decoration (For testing/simulation)
app.post('/admin/award-arena', async (c) => {
    try {
        const { userId, seasonId, rankName, position } = await c.req.json();
        const db = c.env.DB;
        const id = crypto.randomUUID();
        const now = Date.now();

        await db.prepare('INSERT INTO arena_winners (id, user_id, season_id, rank_name, position, created_at) VALUES (?, ?, ?, ?, ?, ?)')
            .bind(id, userId, seasonId, rankName, position || null, now)
            .run();

        return c.json({ success: true, id });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

app.notFound((c) => {
    return c.json({ error: 'Endpoint não encontrado no servidor Zenith.' }, 404);
});

export default app;
