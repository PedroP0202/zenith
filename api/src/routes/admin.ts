import { Hono } from 'hono';
import { requireAdminSecret } from '../middleware/admin';
import type { Bindings } from '../types';

const adminRoutes = new Hono<{ Bindings: Bindings }>();

adminRoutes.get('/feedbacks', async (c) => {
    const adminError = requireAdminSecret(c);
    if (adminError) return adminError;

    const db = c.env.DB;
    try {
        const { results } = await db.prepare('SELECT * FROM beta_feedbacks ORDER BY created_at DESC').all();
        c.header('Cache-Control', 'public, max-age=10');
        return c.json({ feedbacks: results });
    } catch (err: any) {
        return c.json({ error: 'Erro ao carregar feedbacks: ' + err.message }, 500);
    }
});

adminRoutes.get('/stats', async (c) => {
    const adminError = requireAdminSecret(c);
    if (adminError) return adminError;

    const db = c.env.DB;
    try {
        const totalUsers = await db.prepare('SELECT COUNT(*) as count FROM users').first() as any;
        const totalHabits = await db.prepare('SELECT COUNT(*) as count FROM habits').first() as any;
        const totalLogs = await db.prepare('SELECT COUNT(*) as count FROM logs').first() as any;

        const last24h = Date.now() - (24 * 60 * 60 * 1000);
        const activeUsers24h = await db.prepare('SELECT COUNT(DISTINCT user_id) as count FROM habits WHERE updated_at > ?').bind(last24h).first() as any;
        const logs24h = await db.prepare('SELECT COUNT(*) as count FROM logs WHERE completed_at > ?').bind(last24h).first() as any;
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
            recentEvents: recentUsers.results,
        });
    } catch (err: any) {
        return c.json({ error: 'Erro ao carregar estatísticas: ' + err.message }, 500);
    }
});

adminRoutes.post('/feedbacks/:id/status', async (c) => {
    const adminError = requireAdminSecret(c);
    if (adminError) return adminError;

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

adminRoutes.post('/award-arena', async (c) => {
    const adminError = requireAdminSecret(c);
    if (adminError) return adminError;

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

export default adminRoutes;
