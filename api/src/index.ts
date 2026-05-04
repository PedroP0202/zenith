import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Bindings } from './types';
import { authenticateRequest } from './middleware/auth';
import { isAcceptedFriend } from './repositories/friendships';
import { getGroupMembership } from './repositories/groups';
import { groupHabitSchema, groupMemberSchema, groupSchema } from './schemas/groups';
import adminRoutes from './routes/admin';
import authRoutes from './routes/auth';
import betaRoutes from './routes/beta';
import friendsRoutes from './routes/friends';
import leaderboardRoutes from './routes/leaderboard';
import userRoutes from './routes/users';
import syncRoutes from './routes/sync';

const app = new Hono<{ Bindings: Bindings }>();

// Enable CORS for the Capacitor iOS App
app.use('*', cors());

app.get('/', (c) => {
    return c.text('Zenith Global API is running at the Edge!');
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

app.route('/auth', authRoutes);
app.route('/sync', syncRoutes);
app.route('/beta', betaRoutes);
app.route('/admin', adminRoutes);
app.route('/leaderboard', leaderboardRoutes);
app.route('/', friendsRoutes);
app.route('/users', userRoutes);

app.notFound((c) => {
    return c.json({ error: 'Endpoint não encontrado no servidor Zenith.' }, 404);
});

export default app;
