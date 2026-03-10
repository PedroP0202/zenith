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
};

const app = new Hono<{ Bindings: Bindings }>();

// Enable CORS for the Capacitor iOS App
app.use('*', cors());

app.get('/', (c) => {
    return c.text('Zenith Global API is running at the Edge!');
});

// --- AUTHENTICATION ROUTES ---

const registerSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    code: z.string().length(6),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

const sendCodeSchema = z.object({
    email: z.string().email(),
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

        let user = await db.prepare('SELECT id, name, email, language FROM users WHERE google_id = ? OR email = ?').bind(googleId, email).first() as any;

        const now = Date.now();
        let userId;
        let userLanguage = user?.language || 'pt';

        if (user) {
            userId = user.id;
            await db.prepare('UPDATE users SET google_id = ? WHERE id = ?').bind(googleId, userId).run();
        } else {
            userId = crypto.randomUUID();
            await db.prepare('INSERT INTO users (id, name, email, password_hash, google_id, is_verified, created_at, language) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
                .bind(userId, name || 'User', email, 'OAUTH_USER', googleId, 1, now, userLanguage).run();
        }

        const secret = c.env.JWT_SECRET || 'zenith-local-dev-secret';
        const token = await sign({ id: userId, name: user?.name || name, email, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 }, secret);

        return c.json({ token, user: { id: userId, name: user?.name || name, email, language: userLanguage } });
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

        let user = await db.prepare('SELECT id, name, email, language FROM users WHERE google_id = ? OR email = ?').bind(googleId, email).first() as any;

        const now = Date.now();
        let userId;
        let userLanguage = user?.language || 'pt';

        if (user) {
            userId = user.id;
            await db.prepare('UPDATE users SET google_id = ? WHERE id = ?').bind(googleId, userId).run();
        } else {
            userId = crypto.randomUUID();
            await db.prepare('INSERT INTO users (id, name, email, password_hash, google_id, is_verified, created_at, language) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
                .bind(userId, name || 'User', email, 'OAUTH_USER', googleId, 1, now, userLanguage).run();
        }

        const secret = c.env.JWT_SECRET || 'zenith-local-dev-secret';
        const token = await sign({ id: userId, name: user?.name || name, email, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 }, secret);

        return c.json({ token, user: { id: userId, name: user?.name || name, email, language: userLanguage } });
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
        let query = 'SELECT id, name, email, language FROM users WHERE apple_id = ?';
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
            await db.prepare('INSERT INTO users (id, name, email, password_hash, apple_id, is_verified, created_at, language) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
                .bind(userId, finalName, finalEmail, 'OAUTH_USER', appleId, 1, now, userLanguage).run();
        }

        const secret = c.env.JWT_SECRET || 'zenith-local-dev-secret';
        const token = await sign({ id: userId, name: finalName, email: finalEmail, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 }, secret);

        console.log(`[ZENITH_AUTH] Apple Login success for ${finalEmail}`);
        return c.json({ token, user: { id: userId, name: finalName, email: finalEmail, language: userLanguage } });
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
        let user = await db.prepare('SELECT id, name, email, language FROM users WHERE apple_id = ? OR email = ?').bind(appleId, email).first() as any;

        const now = Date.now();
        let userId;
        let userLanguage = user?.language || 'pt';

        if (user) {
            userId = user.id;
            await db.prepare('UPDATE users SET apple_id = ? WHERE id = ?').bind(appleId, userId).run();
        } else {
            userId = crypto.randomUUID();
            await db.prepare('INSERT INTO users (id, name, email, password_hash, apple_id, is_verified, created_at, language) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
                .bind(userId, name, email, 'OAUTH_USER', appleId, 1, now, userLanguage).run();
        }

        const secret = c.env.JWT_SECRET || 'zenith-local-dev-secret';
        const token = await sign({ id: userId, name: user?.name || name, email, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 }, secret);

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
    const { email } = c.req.valid('json');
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

app.post('/auth/register', zValidator('json', registerSchema.extend({ language: z.string().optional() })), async (c) => {
    const { name, email, password, code, language } = c.req.valid('json');
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

    try {
        await db.prepare('INSERT INTO users (id, name, email, password_hash, is_verified, created_at, language) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .bind(id, userName, email, passwordHash, 1, createdAt, userLanguage)
            .run();

        // Delete the code after use
        await db.prepare('DELETE FROM verification_codes WHERE email = ?').bind(email).run();

        // Generate JWT (Valid for 30 days)
        const secret = c.env.JWT_SECRET || 'zenith-local-dev-secret';
        const token = await sign({ id, name: userName, email, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 }, secret);

        return c.json({ token, user: { id, name: userName, email, language: userLanguage } });
    } catch (error: any) {
        return c.json({ error: error.message }, 500);
    }
});

app.post('/auth/login', zValidator('json', loginSchema), async (c) => {
    const { email, password } = c.req.valid('json');
    const db = c.env.DB;

    type UserRow = { id: string, name: string, email: string, password_hash: string, language: string };
    const user = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<UserRow>();

    if (!user) {
        return c.json({ error: 'Conta não encontrada. Por favor, cria conta em baixo.' }, 404);
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
        return c.json({ error: 'Password incorreta.' }, 401);
    }

    const secret = c.env.JWT_SECRET || 'zenith-local-dev-secret';
    const token = await sign({ id: user.id, name: user.name, email: user.email, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 }, secret);

    return c.json({ token, user: { id: user.id, name: user.name, email: user.email, language: user.language || 'pt' } });
});

// User Profile Sync Endpoint
app.patch('/auth/profile', async (c) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'Não autorizado' }, 401);
    }
    const token = authHeader.split(' ')[1];
    const secret = c.env.JWT_SECRET || 'zenith-local-dev-secret';
    let payload;
    try {
        payload = await verify(token, secret, 'HS256');
    } catch {
        return c.json({ error: 'Token inválido' }, 401);
    }

    const userId = payload.id;
    const body = await c.req.json().catch(() => ({}));
    const { name, language } = body;

    console.log(`[AUTH_PROFILE] User=${userId}, PayloadName=${name}, PayloadLang=${language}`);

    const db = c.env.DB;

    try {
        let result;
        if (name && language) {
            result = await db.prepare('UPDATE users SET name = ?, language = ? WHERE id = ?').bind(name, language, userId).run();
        } else if (name) {
            result = await db.prepare('UPDATE users SET name = ? WHERE id = ?').bind(name, userId).run();
        } else if (language) {
            result = await db.prepare('UPDATE users SET language = ? WHERE id = ?').bind(language, userId).run();
        }

        console.log(`[AUTH_PROFILE] DB Result:`, JSON.stringify(result));
        return c.json({ success: true, result });
    } catch (e: any) {
        console.error(`[AUTH_PROFILE] Error:`, e.message);
        return c.json({ error: 'Erro ao atualizar perfil: ' + e.message }, 500);
    }
});

app.delete('/auth/account', async (c) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'Não autorizado' }, 401);
    }
    const token = authHeader.split(' ')[1];
    const secret = c.env.JWT_SECRET || 'zenith-local-dev-secret';
    let payload;
    try {
        payload = await verify(token, secret, 'HS256');
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

app.post('/auth/forgot-password', async (c) => {
    try {
        const { email } = await c.req.json();
        const db = c.env.DB;

        const user = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
        if (!user) return c.json({ error: 'Conta não encontrada.' }, 404);

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 15 * 60 * 1000;

        await db.prepare('INSERT OR REPLACE INTO verification_codes (email, code, expires_at) VALUES (?, ?, ?)')
            .bind(email, code, expiresAt)
            .run();

        if (c.env.RESEND_API_KEY) {
            await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${c.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    from: 'Zenith <onboarding@resend.dev>',
                    to: email,
                    subject: 'Código de Recuperação - Zenith',
                    html: `<p>O teu código de recuperação de palavra-passe é: <strong>${code}</strong></p><p>Este código expira em 15 minutos.</p>`
                })
            });
            return c.json({ message: 'Código enviado.' });
        } else {
            return c.json({ testCode: code });
        }
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

// Zod schemas for the sync payloads to heavily validate incoming edge data
const habitSchema = z.object({
    id: z.string().uuid(),
    title: z.string(),
    frequency: z.array(z.number()),
    isHardMode: z.boolean().optional(),
    reminderTime: z.string().nullable().optional(),
    isActive: z.boolean(),
    createdAt: z.number(),
    updatedAt: z.number().optional(),
});

const logSchema = z.object({
    id: z.string().uuid(),
    habitId: z.string().uuid(),
    completedAt: z.number(),
});

const pushSchema = z.object({
    habits: z.array(habitSchema),
    logs: z.array(logSchema),
    lastSyncedAt: z.number(),
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
        INSERT INTO habits (id, user_id, title, frequency, is_hard_mode, reminder_time, is_active, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET 
          title=excluded.title, 
          frequency=excluded.frequency, 
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
                habit.isHardMode ? 1 : 0,
                habit.reminderTime || null,
                habit.isActive ? 1 : 0,
                habit.createdAt,
                habit.updatedAt || now
            )
        );
    }

    // Upsert Logs (Logs are immutable in Zenith, so simple INSERT OR IGNORE is fine)
    for (const log of payload.logs) {
        stmts.push(
            db.prepare(`
        INSERT OR IGNORE INTO logs (id, habit_id, completed_at, synced_at)
        VALUES (?, ?, ?, ?)
      `).bind(log.id, log.habitId, log.completedAt, now)
        );
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
        // D1 nested queries can be tricky, so we join on habits
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
        }));

        return c.json({ habits, logs, timestamp: Date.now() });
    } catch (err: any) {
        return c.json({ error: 'Pull failed: ' + err.message }, 500);
    }
});

// --- BETA FEEDBACK ROUTES ---

const feedbackSchema = z.object({
    feedback: z.string().min(1),
    user: z.string().optional(),
    platform: z.string().optional(),
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
const ADMIN_SECRET = 'zenith-admin-only-2025'; // This should come from c.env.ADMIN_SECRET ideally

app.get('/admin/feedbacks', async (c) => {
    const authHeader = c.req.header('Authorization');

    // Check if the provided secret matches our Admin Secret
    if (!authHeader || authHeader !== `Bearer ${ADMIN_SECRET}`) {
        return c.json({ error: 'Acesso Restrito Admnistrativo.' }, 401);
    }

    const db = c.env.DB;
    try {
        const { results } = await db.prepare('SELECT * FROM beta_feedbacks ORDER BY created_at DESC').all();
        return c.json({ feedbacks: results });
    } catch (err: any) {
        return c.json({ error: 'Erro ao carregar feedbacks: ' + err.message }, 500);
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

export default app;
