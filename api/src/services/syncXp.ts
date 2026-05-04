function normalizeHabitFrequency(rawFrequency: string): number[] {
    try {
        const parsed = JSON.parse(rawFrequency) as unknown;
        if (Array.isArray(parsed)) {
            return parsed
                .filter((value): value is number => typeof value === 'number' && value >= 0 && value <= 6)
                .sort((a, b) => a - b);
        }
    } catch {
        return [0, 1, 2, 3, 4, 5, 6];
    }

    return [0, 1, 2, 3, 4, 5, 6];
}

function getStartOfDayMs(timestamp: number) {
    const date = new Date(timestamp);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
}

function getStartOfWeekMs(timestamp: number) {
    const date = new Date(timestamp);
    date.setHours(0, 0, 0, 0);
    const currentDay = date.getDay();
    const diffToMonday = (currentDay + 6) % 7;
    date.setDate(date.getDate() - diffToMonday);
    return date.getTime();
}

export function calculateCanonicalXp(habitsRaw: any[], logsRaw: any[]) {
    const logsByHabit = new Map<string, any[]>();

    for (const log of logsRaw) {
        const currentLogs = logsByHabit.get(log.habit_id) || [];
        currentLogs.push(log);
        logsByHabit.set(log.habit_id, currentLogs);
    }

    return habitsRaw.reduce((totalXp, habit) => {
        const habitLogs = logsByHabit.get(habit.id) || [];
        if (habitLogs.length === 0) return totalXp;

        const scheduleType = habit.schedule_type === 'times_per_week' ? 'times_per_week' : 'specific_days';
        const goalType = habit.goal_type === 'count' ? 'count' : 'complete';
        const targetValue = scheduleType === 'times_per_week'
            ? Math.min(7, Math.max(1, Number(habit.weekly_target || 1)))
            : goalType === 'count'
                ? Math.max(1, Number(habit.target_value || 1))
                : 1;
        const xpPerCompletion = habit.is_hard_mode === 1 ? 20 : 10;
        const frequency = normalizeHabitFrequency(habit.frequency);
        const progressByPeriod = new Map<number, number>();

        for (const log of habitLogs) {
            const dayMs = getStartOfDayMs(Number(log.completed_at));
            const dayOfWeek = new Date(dayMs).getDay();
            if (scheduleType === 'specific_days' && !frequency.includes(dayOfWeek)) {
                continue;
            }

            const periodKey = scheduleType === 'times_per_week' ? getStartOfWeekMs(dayMs) : dayMs;
            const logValue = Math.max(0, Number(log.value ?? 1));
            progressByPeriod.set(periodKey, (progressByPeriod.get(periodKey) || 0) + logValue);
        }

        const completedPeriods = Array.from(progressByPeriod.values()).filter((value) => value >= targetValue).length;
        return totalXp + (completedPeriods * xpPerCompletion);
    }, 0);
}
