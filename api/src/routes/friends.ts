import { Hono } from 'hono';
import { getAuthUserId, requireAuth } from '../middleware/auth';
import type { AuthPayload, Bindings } from '../types';

const friendsRoutes = new Hono<{ Bindings: Bindings; Variables: { authPayload: AuthPayload; authUserId: string } }>();

friendsRoutes.use('*', requireAuth());

friendsRoutes.get('/users/search', async (c) => {
    const userId = getAuthUserId(c);

    const query = c.req.query('q');
    if (!query || query.length < 2) return c.json({ results: [] });

    const db = c.env.DB;
    try {
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

friendsRoutes.post('/friends/request', async (c) => {
    const userId = getAuthUserId(c);

    const { friendId } = await c.req.json().catch(() => ({}));
    if (!friendId) return c.json({ error: 'ID do amigo em falta.' }, 400);
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

friendsRoutes.get('/friends/requests', async (c) => {
    const userId = getAuthUserId(c);

    const db = c.env.DB;
    try {
        const incoming = await db.prepare(`
            SELECT f.id, f.user_id as from_id, u.name, u.username, f.created_at
            FROM friendships f
            JOIN users u ON u.id = f.user_id
            WHERE f.friend_id = ? AND f.status = 'pending'
        `).bind(userId).all();

        const outgoing = await db.prepare(`
            SELECT f.id, f.friend_id as to_id, u.name, u.username, f.created_at
            FROM friendships f
            JOIN users u ON u.id = f.friend_id
            WHERE f.user_id = ? AND f.status = 'pending'
        `).bind(userId).all();

        return c.json({
            incoming: incoming.results,
            outgoing: outgoing.results,
        });
    } catch (e: any) {
        return c.json({ error: 'Erro ao listar pedidos: ' + e.message }, 500);
    }
});

friendsRoutes.patch('/friends/request/:id', async (c) => {
    const userId = getAuthUserId(c);

    const requestId = c.req.param('id');
    const { action } = await c.req.json().catch(() => ({}));
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
            const res = await db.prepare('DELETE FROM friendships WHERE id = ? AND user_id = ? AND status = \'pending\'').bind(requestId, userId).run();
            if (res.meta.changes === 0) return c.json({ error: 'Pedido não encontrado ou não tens permissão para cancelar.' }, 404);
            return c.json({ success: true, message: 'Pedido cancelado.' });
        } else {
            await db.prepare('DELETE FROM friendships WHERE id = ? AND friend_id = ?').bind(requestId, userId).run();
            return c.json({ success: true, message: 'Pedido rejeitado.' });
        }
    } catch (e: any) {
        return c.json({ error: 'Erro ao processar pedido: ' + e.message }, 500);
    }
});

friendsRoutes.delete('/friends/:id', async (c) => {
    const userId = getAuthUserId(c);

    const friendIdToRemove = c.req.param('id');
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

friendsRoutes.get('/friends', async (c) => {
    const userId = getAuthUserId(c);

    const db = c.env.DB;
    try {
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

friendsRoutes.post('/friends/nudge', async (c) => {
    const userId = getAuthUserId(c);

    const { targetUserId } = await c.req.json().catch(() => ({}));
    if (!targetUserId) return c.json({ error: 'targetUserId é obrigatório.' }, 400);

    const db = c.env.DB;
    const now = Date.now();

    try {
        const friendship = await db.prepare(`
            SELECT id FROM friendships 
            WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))
            AND status = 'accepted'
        `).bind(userId, targetUserId, targetUserId, userId).first();

        if (!friendship) return c.json({ error: 'Só podes enviar incentivos a amigos.' }, 403);

        const recentNudge = await db.prepare(`
            SELECT id FROM nudges 
            WHERE from_user_id = ? AND to_user_id = ? AND created_at > ?
        `).bind(userId, targetUserId, now - 3600000).first();

        if (recentNudge) return c.json({ error: 'Já enviaste um incentivo recentemente. Aguarda 1 hora.' }, 429);

        await db.prepare('INSERT INTO nudges (id, from_user_id, to_user_id, created_at) VALUES (?, ?, ?, ?)')
            .bind(crypto.randomUUID(), userId, targetUserId, now).run();

        const sender = await db.prepare('SELECT name, username FROM users WHERE id = ?').bind(userId).first() as any;

        return c.json({
            success: true,
            message: `Incentivo enviado a ${targetUserId}!`,
            senderName: sender?.name || 'Um amigo',
        });
    } catch (e: any) {
        if (e.message.includes('no such table')) {
            return c.json({ success: true, message: 'Incentivo enviado!' });
        }
        return c.json({ error: 'Erro ao enviar incentivo: ' + e.message }, 500);
    }
});

friendsRoutes.get('/friends/nudges', async (c) => {
    const userId = getAuthUserId(c);

    const db = c.env.DB;
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

friendsRoutes.post('/users/report', async (c) => {
    const userId = getAuthUserId(c);

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
            `REPORT from ${userId}`,
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

friendsRoutes.post('/friends/block', async (c) => {
    const userId = getAuthUserId(c);

    const { blockedUserId } = await c.req.json().catch(() => ({}));
    if (!blockedUserId) return c.json({ error: 'blockedUserId é obrigatório.' }, 400);

    const db = c.env.DB;
    const now = Date.now();

    try {
        await db.prepare(`
            UPDATE friendships SET status = 'blocked', updated_at = ?
            WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))
        `).bind(now, userId, blockedUserId, blockedUserId, userId).run();

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

friendsRoutes.get('/friends/blocked', async (c) => {
    const userId = getAuthUserId(c);

    const db = c.env.DB;

    try {
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

friendsRoutes.post('/friends/unblock', async (c) => {
    const userId = getAuthUserId(c);

    const { unblockedUserId } = await c.req.json().catch(() => ({}));
    if (!unblockedUserId) return c.json({ error: 'unblockedUserId é obrigatório.' }, 400);

    const db = c.env.DB;

    try {
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

friendsRoutes.get('/friends/compare/:username', async (c) => {
    const friendUsername = c.req.param('username');
    const db = c.env.DB;
    try {
        const friend = await db.prepare('SELECT id, name, username FROM users WHERE username = ?').bind(friendUsername).first() as any;
        if (!friend) return c.json({ error: 'Utilizador não encontrado.' }, 404);

        const { results: friendHabits } = await db.prepare(`
            SELECT h.id, h.title, COUNT(l.id) as completions
            FROM habits h
            LEFT JOIN logs l ON l.habit_id = h.id
            WHERE h.user_id = ? AND h.is_active = 1
            GROUP BY h.id
        `).bind(friend.id).all();

        return c.json({
            friend: {
                name: friend.name,
                username: friend.username,
                habits: friendHabits,
            },
        });
    } catch (e: any) {
        return c.json({ error: 'Erro ao comparar stats: ' + e.message }, 500);
    }
});

friendsRoutes.get('/users/:username/profile', async (c) => {
    const userId = getAuthUserId(c);

    const rawUsername = c.req.param('username');
    const targetUsername = rawUsername.startsWith('@') ? rawUsername.substring(1) : rawUsername;
    const db = c.env.DB;

    try {
        const user = await db.prepare('SELECT id, name, username, level, total_xp, arena_points FROM users WHERE LOWER(username) = LOWER(?)').bind(targetUsername).first() as any;
        if (!user) return c.json({ error: 'Utilizador não encontrado.' }, 404);

        if (user.id !== userId) {
            const friendship = await db.prepare(`
                SELECT status FROM friendships 
                WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))
                AND status = 'accepted'
            `).bind(userId, user.id, user.id, userId).first();

            if (!friendship) return c.json({ error: 'Apenas amigos podem ver este perfil.' }, 403);
        }

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
        `).bind(user.id).all();

        const habitsRes = await db.prepare('SELECT id, title, is_hard_mode, is_active FROM habits WHERE user_id = ?').bind(user.id).all();
        const habits = habitsRes.results || [];
        const habitIds = habits.map((habit: any) => habit.id);

        const logsCount = await db.prepare('SELECT COUNT(*) as total FROM logs WHERE habit_id IN (SELECT id FROM habits WHERE user_id = ?)').bind(user.id).first();

        const now = new Date();
        now.setHours(0, 0, 0, 0);
        now.setDate(now.getDate() + 1);
        const endOfToday = now.getTime();

        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const startOf7Days = sevenDaysAgo.getTime();

        const weekdayStats = await db.prepare(`
            SELECT date(completed_at / 1000, 'unixepoch') as log_date, COUNT(*) as count 
            FROM logs 
            WHERE habit_id IN (SELECT id FROM habits WHERE user_id = ?)
            AND completed_at >= ? AND completed_at < ?
            GROUP BY log_date
        `).bind(user.id, startOf7Days, endOfToday).all();

        const activeWeekdays = [0, 0, 0, 0, 0, 0, 0];
        let weeklyCompletions = 0;

        if (weekdayStats.results) {
            weekdayStats.results.forEach((row: any) => {
                const count = parseInt(row.count);
                weeklyCompletions += count;

                const logTime = new Date(row.log_date + 'T12:00:00Z').getTime();
                const daysDiff = Math.floor((endOfToday - logTime) / (1000 * 60 * 60 * 24));
                const arrayIndex = 6 - daysDiff;

                if (arrayIndex >= 0 && arrayIndex <= 6) {
                    activeWeekdays[arrayIndex] += count;
                }
            });
        }

        const unlockedTrophies = [];
        const totalCompletions = (logsCount?.total as number) || 0;

        if (totalCompletions >= 100) unlockedTrophies.push('checkin_master');
        if (habits.length > 0 && totalCompletions > 0) unlockedTrophies.push('zen_beginner');
        if (habitIds.length >= 5) unlockedTrophies.push('habit_architect');

        const friendsCountRes = await db.prepare("SELECT COUNT(*) as total FROM friendships WHERE (user_id = ? OR friend_id = ?) AND status = 'accepted'").bind(user.id, user.id).first();
        if (((friendsCountRes?.total as number) || 0) >= 5) unlockedTrophies.push('socializer');

        return c.json({
            user: {
                id: user.id,
                name: user.name,
                username: user.username,
                level: user.level,
                totalXp: user.total_xp,
            },
            arenaHistory: arenaWinners,
            stats: {
                totalCompletions,
                weeklyCompletions,
                activeWeekdays,
                activeHabitsCount: habitIds.length,
            },
            unlockedTrophies,
        });

    } catch (e: any) {
        console.error('Error in /users/:username/profile:', e);
        return c.json({ error: 'Erro interno ao carregar perfil: ' + e.message }, 500);
    }
});

export default friendsRoutes;
