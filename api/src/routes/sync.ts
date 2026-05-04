import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { jwt } from 'hono/jwt';
import { pushSchema } from '../schemas/sync';
import { calculateCanonicalXp } from '../services/syncXp';
import type { Bindings } from '../types';

const syncRoutes = new Hono<{ Bindings: Bindings }>();

syncRoutes.use('*', (c, next) => {
    const secret = c.env.JWT_SECRET || 'zenith-local-dev-secret';
    const jwtMiddleware = jwt({ secret, alg: 'HS256' });
    return jwtMiddleware(c, next);
});

syncRoutes.post('/push', zValidator('json', pushSchema), async (c) => {
    const payload = c.req.valid('json');
    const user = c.get('jwtPayload') as { id: string; name: string; email: string; exp: number };
    const db = c.env.DB;

    const now = Date.now();
    const stmts: D1PreparedStatement[] = [];

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

    for (const log of payload.logs) {
        stmts.push(
            db.prepare(`
        INSERT OR IGNORE INTO logs (id, habit_id, completed_at, value, synced_at)
        SELECT ?, ?, ?, ?, ?
        WHERE EXISTS (SELECT 1 FROM habits WHERE id = ? AND user_id = ?)
      `).bind(log.id, log.habitId, log.completedAt, log.value || null, now, log.habitId, user.id)
        );
    }

    if (payload.deletedHabitIds && payload.deletedHabitIds.length > 0) {
        for (const habitId of payload.deletedHabitIds) {
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

syncRoutes.get('/pull', async (c) => {
    const user = c.get('jwtPayload') as { id: string; name: string; email: string; exp: number };
    const lastSyncedAt = parseInt(c.req.query('lastSyncedAt') || '0', 10);
    const db = c.env.DB;

    try {
        const { results: habitsRaw } = await db.prepare(`
      SELECT * FROM habits WHERE user_id = ? AND updated_at > ?
    `).bind(user.id, lastSyncedAt).all();

        const { results: logsRaw } = await db.prepare(`
      SELECT l.* FROM logs l
      JOIN habits h ON l.habit_id = h.id
      WHERE h.user_id = ? AND l.synced_at > ?
    `).bind(user.id, lastSyncedAt).all();

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

        const correctXp = calculateCanonicalXp(allHabitsRaw as any[], allLogsRaw as any[]);
        const correctLevel = Math.max(1, Math.floor(correctXp / 100) + 1);

        const userProfile = await db.prepare('SELECT arena_points, last_login_reward_date FROM users WHERE id = ?').bind(user.id).first() as any;

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
                lastLoginRewardDate: userProfile?.last_login_reward_date || null,
            },
        });
    } catch (err: any) {
        return c.json({ error: 'Pull failed: ' + err.message }, 500);
    }
});

export default syncRoutes;
