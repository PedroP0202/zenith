import { Hono } from 'hono';
import { getAuthUserId, requireAuth } from '../middleware/auth';
import type { AuthPayload, Bindings } from '../types';

const userRoutes = new Hono<{ Bindings: Bindings; Variables: { authPayload: AuthPayload; authUserId: string } }>();

userRoutes.use('*', requireAuth());

userRoutes.get('/me/rewards', async (c) => {
    try {
        const userId = getAuthUserId(c);
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
