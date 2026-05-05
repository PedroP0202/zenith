import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { getAuthPayload, requireAuth } from '../middleware/auth';
import { pushSchema } from '../schemas/sync';
import { calculateCanonicalHabitPoints, calculateCanonicalXp } from '../services/syncXp';
import type { AuthPayload, Bindings } from '../types';

const syncRoutes = new Hono<{ Bindings: Bindings; Variables: { authPayload: AuthPayload; authUserId: string } }>();

function getCurrentArenaWindow(now: number) {
    const currentDate = new Date(now);
    const startAt = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1, 0, 0, 0, 0).getTime();
    const endAt = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1, 0, 0, 0, 0).getTime();
    return { startAt, endAt };
}

syncRoutes.use('*', requireAuth());

syncRoutes.post('/push', zValidator('json', pushSchema), async (c) => {
    const payload = c.req.valid('json');
    const user = getAuthPayload(c);
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
    const user = getAuthPayload(c);
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

        const now = Date.now();
        const correctXp = calculateCanonicalXp(allHabitsRaw as any[], allLogsRaw as any[]);
        const correctLevel = Math.max(1, Math.floor(correctXp / 100) + 1);

        const activeSeason = await db.prepare(
            'SELECT start_at, end_at FROM arena_seasons WHERE is_finalized = 0 AND start_at <= ? AND end_at > ? ORDER BY end_at ASC LIMIT 1'
        ).bind(now, now).first<{ start_at: number; end_at: number }>();

        const fallbackArenaWindow = getCurrentArenaWindow(now);
        const arenaWindow = activeSeason
            ? { startAt: Number(activeSeason.start_at), endAt: Number(activeSeason.end_at) + 1 }
            : fallbackArenaWindow;

        const userProfile = await db.prepare('SELECT opt_in_leaderboard, last_login_reward_date FROM users WHERE id = ?').bind(user.id).first() as any;
        const correctArenaPoints = userProfile?.opt_in_leaderboard === 1
            ? calculateCanonicalHabitPoints(allHabitsRaw as any[], allLogsRaw as any[], arenaWindow)
            : 0;

        await db.prepare('UPDATE users SET total_xp = ?, level = ?, arena_points = ? WHERE id = ?')
            .bind(correctXp, correctLevel, correctArenaPoints, user.id)
            .run();

        return c.json({
            habits,
            logs,
            timestamp: now,
            user: {
                total_xp: correctXp,
                level: correctLevel,
                arena_points: correctArenaPoints,
                lastLoginRewardDate: userProfile?.last_login_reward_date || null,
            },
        });
    } catch (err: any) {
        return c.json({ error: 'Pull failed: ' + err.message }, 500);
    }
});

export default syncRoutes;
