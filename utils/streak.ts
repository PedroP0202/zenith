import { Habit, LogEntry } from '../types';
import { addDays, addWeeks, differenceInCalendarDays, isSameDay, startOfDay, startOfWeek, subDays, subWeeks } from 'date-fns';
import { EVERYDAY_FREQUENCY, getCompletedHabitPeriods, getHabitFrequency, getHabitGoalType, getHabitScheduleType, getHabitTargetValue, getHabitWeeklyTarget, hasHabitLogOnDate, isHabitScheduledForDate } from './habits';

type HabitLike = Pick<Habit, 'frequency' | 'scheduleType' | 'weeklyTarget' | 'goalType' | 'targetValue'>;

function resolveHabitConfig(habitOrFrequency?: Habit | number[]): HabitLike {
    if (Array.isArray(habitOrFrequency)) {
        return {
            frequency: habitOrFrequency.length > 0 ? habitOrFrequency : [...EVERYDAY_FREQUENCY],
            scheduleType: 'specific_days',
            goalType: 'complete',
            targetValue: 1,
            weeklyTarget: 1,
        };
    }

    return {
        frequency: getHabitFrequency(habitOrFrequency),
        scheduleType: getHabitScheduleType(habitOrFrequency),
        weeklyTarget: getHabitWeeklyTarget(habitOrFrequency),
        goalType: getHabitGoalType(habitOrFrequency),
        targetValue: getHabitTargetValue(habitOrFrequency),
    };
}

function getPreviousScheduledDate(date: Date, habit: HabitLike): Date {
    let candidate = subDays(startOfDay(date), 1);
    while (!isHabitScheduledForDate(habit, candidate)) {
        candidate = subDays(candidate, 1);
    }
    return candidate;
}

function getNextScheduledDate(date: Date, habit: HabitLike): Date {
    let candidate = addDays(startOfDay(date), 1);
    while (!isHabitScheduledForDate(habit, candidate)) {
        candidate = addDays(candidate, 1);
    }
    return candidate;
}

/**
 * Calculates the current streak for a habit based on its log entries.
 * The core rule: A streak is broken if the user didn't complete it yesterday.
 * So, if completed today or yesterday, we count backwards from yesterday (or today if that's the latest).
 */
export function calculateStreak(logs: LogEntry[], habitOrFrequency: Habit | number[] = [...EVERYDAY_FREQUENCY], todayDate: Date = new Date()): number {
    if (!logs || logs.length === 0) return 0;

    const habit = resolveHabitConfig(habitOrFrequency);
    const completedPeriods = new Set(getCompletedHabitPeriods(logs, habit));

    if (completedPeriods.size === 0) return 0;

    if (getHabitScheduleType(habit) === 'times_per_week') {
        const currentWeek = startOfWeek(startOfDay(todayDate), { weekStartsOn: 1 });
        const previousWeek = subWeeks(currentWeek, 1);

        let cursor: Date | null = null;
        if (completedPeriods.has(currentWeek.getTime())) cursor = currentWeek;
        else if (completedPeriods.has(previousWeek.getTime())) cursor = previousWeek;
        if (!cursor) return 0;

        let streak = 0;
        while (completedPeriods.has(cursor.getTime())) {
            streak++;
            cursor = subWeeks(cursor, 1);
        }
        return streak;
    }

    let lastScheduled = startOfDay(todayDate);
    while (!isHabitScheduledForDate(habit, lastScheduled)) {
        lastScheduled = subDays(lastScheduled, 1);
    }

    const previousScheduled = getPreviousScheduledDate(lastScheduled, habit);
    let cursor: Date | null = null;

    if (completedPeriods.has(lastScheduled.getTime())) cursor = lastScheduled;
    else if (completedPeriods.has(previousScheduled.getTime())) cursor = previousScheduled;
    if (!cursor) return 0;

    let streak = 0;
    while (completedPeriods.has(cursor.getTime())) {
        streak++;
        cursor = getPreviousScheduledDate(cursor, habit);
    }

    return streak;
}

/**
 * Checks whether a habit has any log entries for the current day.
 * @param logs The array of log entries for a specific habit.
 * @param todayDate The current date date object (defaults to new Date()).
 * @returns True if the habit was completed today, false otherwise.
 */
export function isCompletedToday(logs: LogEntry[], todayDate: Date = new Date()): boolean {
    if (!logs || logs.length === 0) return false;
    return hasHabitLogOnDate(logs, todayDate);
}

/**
 * Calculates the total number of unique days a habit was completed in the current month.
 * @param logs The array of log entries for a specific habit.
 * @param todayDate The reference date to determine the "current month".
 * @returns The total completion count for the month.
 */
export function getCompletionsThisMonth(logs: LogEntry[], todayDate: Date = new Date()): number {
    if (!logs || logs.length === 0) return 0;

    const currentMonth = todayDate.getMonth();
    const currentYear = todayDate.getFullYear();

    const uniqueLogsByDay = new Set<string>();

    for (const log of logs) {
        const logDate = new Date(log.completedAt);
        if (logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear) {
            uniqueLogsByDay.add(startOfDay(logDate).toISOString());
        }
    }

    return uniqueLogsByDay.size;
}

/**
 * Retrieves a sorted list of the days (1-31) in the current month on which a habit was completed.
 * Useful for rendering calendar UI grids.
 * @param logs The array of log entries for a specific habit.
 * @param todayDate The reference date to determine the "current month".
 * @returns An array of integers representing the days of the month the habit was completed.
 */
export function getCompletedDaysThisMonth(logs: LogEntry[], todayDate: Date = new Date()): number[] {
    if (!logs || logs.length === 0) return [];

    const currentMonth = todayDate.getMonth();
    const currentYear = todayDate.getFullYear();

    const completedDays = new Set<number>();

    for (const log of logs) {
        const logDate = new Date(log.completedAt);
        if (logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear) {
            completedDays.add(logDate.getDate());
        }
    }

    return Array.from(completedDays).sort((a, b) => a - b);
}

/**
 * Calculates yearly performance statistics across all habits, including overall 
 * consistency percentage and total unique active focus days.
 * @param logs The full history of all log entries across all habits.
 * @param todayDate The current reference date.
 * @returns An object containing the `productivityPercentage` (0-100) and `activeDays` count.
 */
export function getYearlyStats(logs: LogEntry[], todayDate: Date = new Date()) {
    if (!logs || logs.length === 0) return { productivityPercentage: 0, activeDays: 0 };

    const currentYear = todayDate.getFullYear();
    const uniqueActiveDays = new Set<string>();

    for (const log of logs) {
        const logDate = new Date(log.completedAt);
        if (logDate.getFullYear() === currentYear) {
            uniqueActiveDays.add(startOfDay(logDate).toISOString());
        }
    }

    // Calculate percentage based on days passed so far this year
    const startOfCurrentYear = new Date(currentYear, 0, 1);
    const daysPassedInYear = differenceInCalendarDays(todayDate, startOfCurrentYear) + 1; // +1 to include today
    const productivityPercentage = daysPassedInYear > 0 ? Math.round((uniqueActiveDays.size / daysPassedInYear) * 100) : 0;

    return {
        productivityPercentage,
        activeDays: uniqueActiveDays.size
    };
}

/**
 * Calculates the best (longest) streak for a habit over its entire history.
 */
export function getBestStreak(logs: LogEntry[], habitOrFrequency: Habit | number[] = [...EVERYDAY_FREQUENCY]): number {
    if (!logs || logs.length === 0) return 0;

    const habit = resolveHabitConfig(habitOrFrequency);
    const completedPeriods = getCompletedHabitPeriods(logs, habit);
    if (completedPeriods.length === 0) return 0;

    let maxStreak = 1;
    let currentStreak = 1;

    for (let i = 1; i < completedPeriods.length; i++) {
        const currentPeriod = new Date(completedPeriods[i]);
        const previousPeriod = new Date(completedPeriods[i - 1]);

        const expectedPrevious = getHabitScheduleType(habit) === 'times_per_week'
            ? addWeeks(previousPeriod, 1)
            : getNextScheduledDate(previousPeriod, habit);

        if (isSameDay(currentPeriod, expectedPrevious)) {
            currentStreak++;
            maxStreak = Math.max(maxStreak, currentStreak);
        } else {
            currentStreak = 1;
        }
    }

    return maxStreak;
}

/**
 * Generates an array of daily activity counts for a given number of past days.
 * Useful for a GitHub-style heatmap.
 */
export function getDailyActivityMap(logs: LogEntry[], daysCount: number, todayDate: Date = new Date()): { date: Date, count: number }[] {
    const activityMap: { date: Date, count: number }[] = [];

    // Group logs by day
    const logsByDay: Record<string, number> = {};
    for (const log of logs) {
        const dayStr = startOfDay(new Date(log.completedAt)).toISOString();
        logsByDay[dayStr] = (logsByDay[dayStr] || 0) + 1;
    }

    // Generate last N days
    for (let i = daysCount - 1; i >= 0; i--) {
        const date = startOfDay(subDays(todayDate, i));
        activityMap.push({
            date,
            count: logsByDay[date.toISOString()] || 0
        });
    }

    return activityMap;
}

/**
 * Calculates the distribution of habit completions across the days of the week.
 * @returns Array where index is 0-6 (Sun-Sat) and value is the completion count.
 */
export function getWeekdayDistribution(logs: LogEntry[]): number[] {
    const distribution = [0, 0, 0, 0, 0, 0, 0];
    if (!logs) return distribution;

    const seenCombos = new Set<string>(); // To count 1 habit max 1 time per day

    for (const log of logs) {
        if (!log.completedAt) continue;

        const logDate = new Date(log.completedAt);
        if (isNaN(logDate.getTime())) continue; // Skip invalid dates

        const dayStr = startOfDay(logDate).toISOString();
        const comboKey = `${log.habitId}-${dayStr}`;

        if (!seenCombos.has(comboKey)) {
            seenCombos.add(comboKey);
            const dayOfWeek = logDate.getDay();
            distribution[dayOfWeek]++;
        }
    }

    return distribution;
}
