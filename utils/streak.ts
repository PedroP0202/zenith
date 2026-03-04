import { LogEntry } from '../types';
import { startOfDay, isSameDay, subDays, differenceInCalendarDays } from 'date-fns';

/**
 * Calculates the current streak for a habit based on its log entries.
 * The core rule: A streak is broken if the user didn't complete it yesterday.
 * So, if completed today or yesterday, we count backwards from yesterday (or today if that's the latest).
 */
export function calculateStreak(logs: LogEntry[], frequency: number[] = [0, 1, 2, 3, 4, 5, 6], todayDate: Date = new Date()): number {
    if (!logs || logs.length === 0 || !frequency || frequency.length === 0) return 0;

    // Sort newest first
    const sortedLogs = [...logs].sort((a, b) => b.completedAt - a.completedAt);

    // Clean duplicates per day and keep Date objects
    const uniqueLogsByDay: Date[] = [];
    const seenDays = new Set<string>();

    for (const log of sortedLogs) {
        const d = startOfDay(new Date(log.completedAt));
        const dayStr = d.toISOString();
        if (!seenDays.has(dayStr)) {
            seenDays.add(dayStr);
            uniqueLogsByDay.push(d);
        }
    }

    if (uniqueLogsByDay.length === 0) return 0;

    const today = startOfDay(todayDate);
    const isScheduled = (d: Date) => frequency.includes(d.getDay());

    // Find the latest scheduled day <= today
    let lastScheduled = new Date(today);
    while (!isScheduled(lastScheduled)) {
        lastScheduled = subDays(lastScheduled, 1);
    }

    // Find the scheduled day before that
    let prevScheduled = subDays(lastScheduled, 1);
    while (!isScheduled(prevScheduled)) {
        prevScheduled = subDays(prevScheduled, 1);
    }

    // Filter out logs that are NOT on scheduled days
    const scheduledLogs = uniqueLogsByDay.filter(d => isScheduled(d));
    if (scheduledLogs.length === 0) return 0;

    const mostRecentScheduledLog = scheduledLogs[0];

    // If the most recent scheduled log isn't the last scheduled day or the one before it, streak is broken.
    if (!isSameDay(mostRecentScheduledLog, lastScheduled) && !isSameDay(mostRecentScheduledLog, prevScheduled)) {
        return 0;
    }

    let streak = 0;
    let expectedDate = mostRecentScheduledLog;

    for (const logDate of scheduledLogs) {
        if (isSameDay(logDate, expectedDate)) {
            streak++;
            // Calculate next expected date backwards
            expectedDate = subDays(expectedDate, 1);
            while (!isScheduled(expectedDate)) {
                expectedDate = subDays(expectedDate, 1);
            }
        } else if (logDate.getTime() < expectedDate.getTime()) {
            break; // Gap found
        }
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
    const todayStr = startOfDay(todayDate).toISOString();

    return logs.some(log => {
        const logStr = startOfDay(new Date(log.completedAt)).toISOString();
        return logStr === todayStr;
    });
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
