import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { sign, jwt } from 'hono/jwt';
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

app.post('/auth/register', zValidator('json', registerSchema), async (c) => {
    const { name, email, password, code } = c.req.valid('json');
    const db = c.env.DB;

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
        await db.prepare('INSERT INTO users (id, name, email, password_hash, is_verified, created_at) VALUES (?, ?, ?, ?, ?, ?)')
            .bind(id, userName, email, passwordHash, 1, createdAt)
            .run();

        // Delete the code after use
        await db.prepare('DELETE FROM verification_codes WHERE email = ?').bind(email).run();

        // Generate JWT (Valid for 30 days)
        const secret = c.env.JWT_SECRET || 'zenith-local-dev-secret';
        const token = await sign({ id, name: userName, email, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 }, secret);

        return c.json({ token, user: { id, name: userName, email } });
    } catch (error: any) {
        return c.json({ error: error.message }, 500);
    }
});

app.post('/auth/login', zValidator('json', loginSchema), async (c) => {
    const { email, password } = c.req.valid('json');
    const db = c.env.DB;

    type UserRow = { id: string, name: string, email: string, password_hash: string };
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

    return c.json({ token, user: { id: user.id, name: user.name, email: user.email } });
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

export default app;
