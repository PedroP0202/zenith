import { Hono } from 'hono';
import { authenticateRequest } from '../middleware/auth';
import type { Bindings } from '../types';

const userRoutes = new Hono<{ Bindings: Bindings }>();

userRoutes.get('/me/rewards', async (c) => {
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

export default userRoutes;
