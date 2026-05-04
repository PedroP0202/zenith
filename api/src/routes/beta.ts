import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import type { Bindings } from '../types';
import { feedbackSchema } from '../schemas/feedback';

const betaRoutes = new Hono<{ Bindings: Bindings }>();

betaRoutes.post('/feedback', zValidator('json', feedbackSchema), async (c) => {
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

export default betaRoutes;
