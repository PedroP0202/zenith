import { endOfWeek, isSameDay, startOfDay, startOfWeek } from 'date-fns';
import { Habit, HabitFormValues, HabitGoalType, HabitScheduleType, LogEntry } from '../types';

export const EVERYDAY_FREQUENCY = [0, 1, 2, 3, 4, 5, 6] as const;

export function normalizeFrequency(frequency?: number[]): number[] {
    if (!frequency || frequency.length === 0) {
        return [...EVERYDAY_FREQUENCY];
    }

    return Array.from(new Set(frequency))
        .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
        .sort((a, b) => a - b);
}

export function getHabitScheduleType(habit?: Pick<Habit, 'scheduleType'> | Pick<HabitFormValues, 'scheduleType'>): HabitScheduleType {
    return habit?.scheduleType === 'times_per_week' ? 'times_per_week' : 'specific_days';
}

export function getHabitGoalType(habit?: Pick<Habit, 'goalType'> | Pick<HabitFormValues, 'goalType'>): HabitGoalType {
    return habit?.goalType === 'count' ? 'count' : 'complete';
}

export function getHabitFrequency(habit?: Pick<Habit, 'frequency'> | Pick<HabitFormValues, 'frequency'>): number[] {
    return normalizeFrequency(habit?.frequency);
}

export function getHabitWeeklyTarget(habit?: Pick<Habit, 'weeklyTarget'> | Pick<HabitFormValues, 'weeklyTarget'>): number {
    const value = Math.round(habit?.weeklyTarget ?? 1);
    return Math.min(7, Math.max(1, value));
}

export function getHabitTargetValue(habit?: Pick<Habit, 'goalType' | 'targetValue'> | Pick<HabitFormValues, 'goalType' | 'targetValue'>): number {
    if (getHabitGoalType(habit) !== 'count') return 1;
    const value = Math.round(habit?.targetValue ?? 1);
    return Math.max(1, value);
}

export function getHabitUnitLabel(habit?: Pick<Habit, 'unitLabel'> | Pick<HabitFormValues, 'unitLabel'>): string | undefined {
    const unit = habit?.unitLabel?.trim();
    return unit ? unit : undefined;
}

export function getLogValue(log: LogEntry): number {
    if (typeof log.value === 'number' && Number.isFinite(log.value)) {
        return Math.max(0, log.value);
    }

    return 1;
}

export function getHabitPeriodTarget(habit: Pick<Habit, 'scheduleType' | 'weeklyTarget' | 'goalType' | 'targetValue'>): number {
    if (getHabitScheduleType(habit) === 'times_per_week') {
        return getHabitWeeklyTarget(habit);
    }

    return getHabitTargetValue(habit);
}

export function getHabitPeriodStart(habit: Pick<Habit, 'scheduleType'>, date: Date): Date {
    const baseDate = startOfDay(date);
    if (getHabitScheduleType(habit) === 'times_per_week') {
        return startOfWeek(baseDate, { weekStartsOn: 1 });
    }

    return baseDate;
}

export function getHabitPeriodEnd(habit: Pick<Habit, 'scheduleType'>, date: Date): Date {
    const baseDate = startOfDay(date);
    if (getHabitScheduleType(habit) === 'times_per_week') {
        return endOfWeek(baseDate, { weekStartsOn: 1 });
    }

    return baseDate;
}

export function isHabitScheduledForDate(habit: Pick<Habit, 'scheduleType' | 'frequency'>, date: Date): boolean {
    if (getHabitScheduleType(habit) === 'times_per_week') {
        return true;
    }

    return getHabitFrequency(habit).includes(date.getDay());
}

export function getHabitLogsForDay(logs: LogEntry[], date: Date): LogEntry[] {
    return logs.filter((log) => isSameDay(new Date(log.completedAt), date));
}

export function hasHabitLogOnDate(logs: LogEntry[], date: Date): boolean {
    return getHabitLogsForDay(logs, date).length > 0;
}

export function getHabitDayProgress(logs: LogEntry[], date: Date): number {
    return getHabitLogsForDay(logs, date).reduce((sum, log) => sum + getLogValue(log), 0);
}

export function getHabitProgressForDate(
    logs: LogEntry[],
    habit: Pick<Habit, 'scheduleType' | 'weeklyTarget' | 'goalType' | 'targetValue'>,
    date: Date
): number {
    const periodStart = getHabitPeriodStart(habit, date).getTime();
    const periodEnd = getHabitPeriodEnd(habit, date).getTime();

    return logs.reduce((sum, log) => {
        const completedAt = startOfDay(new Date(log.completedAt)).getTime();
        if (completedAt < periodStart || completedAt > periodEnd) return sum;
        return sum + getLogValue(log);
    }, 0);
}

export function isHabitCompleteForDate(
    logs: LogEntry[],
    habit: Pick<Habit, 'scheduleType' | 'weeklyTarget' | 'goalType' | 'targetValue'>,
    date: Date = new Date()
): boolean {
    return getHabitProgressForDate(logs, habit, date) >= getHabitPeriodTarget(habit);
}

export function getHabitCompletionRatio(
    logs: LogEntry[],
    habit: Pick<Habit, 'scheduleType' | 'weeklyTarget' | 'goalType' | 'targetValue'>,
    date: Date = new Date()
): number {
    const target = getHabitPeriodTarget(habit);
    if (target <= 0) return 0;
    return Math.min(1, getHabitProgressForDate(logs, habit, date) / target);
}

export function getCompletedHabitPeriods(
    logs: LogEntry[],
    habit: Pick<Habit, 'frequency' | 'scheduleType' | 'weeklyTarget' | 'goalType' | 'targetValue'>
): number[] {
    const completedPeriods = new Map<number, number>();

    for (const log of logs) {
        const logDate = startOfDay(new Date(log.completedAt));
        if (getHabitScheduleType(habit) === 'specific_days' && !getHabitFrequency(habit).includes(logDate.getDay())) {
            continue;
        }

        const periodStart = getHabitPeriodStart(habit, logDate).getTime();
        completedPeriods.set(periodStart, (completedPeriods.get(periodStart) || 0) + getLogValue(log));
    }

    return Array.from(completedPeriods.entries())
        .filter(([, progress]) => progress >= getHabitPeriodTarget(habit))
        .map(([periodStart]) => periodStart)
        .sort((a, b) => a - b);
}
