import { Capacitor, registerPlugin } from '@capacitor/core';
import { Habit, LogEntry } from '@/types';
import { startOfDay, subDays, format } from 'date-fns';
import { calculateStreak } from './streak';

export interface WidgetSyncPlugin {
    setItem: (options: { key: string; value: string; group: string }) => Promise<void>;
    getItem: (options: { key: string; group: string }) => Promise<{ value: unknown }>;
    removeItem: (options: { key: string; group: string }) => Promise<void>;
    reloadAllTimelines: () => Promise<void>;
}

export const WidgetSync = registerPlugin<WidgetSyncPlugin>('WidgetSyncPlugin');

export const APP_GROUP_ID = 'group.pedro.zenith.app';

export interface WidgetHabit {
    id: string;
    title: string;
    completed: boolean;
    streak: number;
}

export interface WidgetData {
    habits: WidgetHabit[];
    totalHabits: number;
    completedHabits: number;
    weeklyCompletion: number[];
    dayName: string;
    dayNumber: string;
    monthName: string;
}

/**
 * Calculates current day stats AND last 7 days from the App State and saves them to the
 * iOS App Group Shared `UserDefaults` via our Custom Native Swift Plugin.
 */
export async function syncWidgetData(habits: Habit[], logs: LogEntry[]) {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') {
        return;
    }

    try {
        const today = new Date();
        const todayStart = startOfDay(today);
        const currentDayOfWeek = today.getDay();

        const logsByHabit = new Map<string, LogEntry[]>();
        const completionDaysByHabit = new Map<string, Set<number>>();

        logs.forEach((log) => {
            if (!logsByHabit.has(log.habitId)) {
                logsByHabit.set(log.habitId, []);
            }
            logsByHabit.get(log.habitId)?.push(log);

            const dayStart = startOfDay(new Date(log.completedAt)).getTime();
            if (!completionDaysByHabit.has(log.habitId)) {
                completionDaysByHabit.set(log.habitId, new Set<number>());
            }
            completionDaysByHabit.get(log.habitId)?.add(dayStart);
        });

        // 1. Current Day Logic
        const activeHabitsToday = habits.filter((habit) => {
            if (!habit.isActive) return false;
            if (!habit.frequency || habit.frequency.length === 0) return true;
            return habit.frequency.includes(currentDayOfWeek);
        });

        const widgetHabits: WidgetHabit[] = activeHabitsToday.map((habit) => {
            const habitLogs = logsByHabit.get(habit.id) || [];
            const completedDays = completionDaysByHabit.get(habit.id);
            const hasLoggedToday = completedDays?.has(todayStart.getTime()) ?? false;
            const currentStreak = calculateStreak(habitLogs, habit.frequency);

            return {
                id: habit.id,
                title: habit.title.trim() || 'Habit',
                completed: hasLoggedToday,
                streak: currentStreak
            };
        });

        // Prioritize actionable habits in the widget: pending first, then strongest streak.
        const prioritizedHabits = [...widgetHabits].sort((a, b) => {
            if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
            return (b.streak || 0) - (a.streak || 0);
        });

        // 2. Weekly Progress Logic (last 7 days)
        const weeklyCompletion: number[] = [];
        for (let i = 6; i >= 0; i--) {
            const targetDate = startOfDay(subDays(today, i));
            const targetDayOfWeek = targetDate.getDay();
            const targetDayMs = targetDate.getTime();
            
            const habitsAtThatDay = habits.filter((habit) => {
                if (!habit.isActive) return false;
                if (!habit.frequency || habit.frequency.length === 0) return true;
                return habit.frequency.includes(targetDayOfWeek);
            });

            if (habitsAtThatDay.length === 0) {
                weeklyCompletion.push(0);
                continue;
            }

            const completedCount = habitsAtThatDay.filter((habit) => {
                const completedDays = completionDaysByHabit.get(habit.id);
                return completedDays?.has(targetDayMs) ?? false;
            }).length;

            weeklyCompletion.push(completedCount / habitsAtThatDay.length);
        }

        const displayHabits = prioritizedHabits.slice(0, 4);
        const completedHabitsCount = widgetHabits.filter((habit) => habit.completed).length;

        const widgetData: WidgetData = {
            habits: displayHabits,
            totalHabits: widgetHabits.length,
            completedHabits: completedHabitsCount,
            weeklyCompletion: weeklyCompletion,
            dayName: format(today, 'EEEE').toUpperCase(),
            dayNumber: format(today, 'd'),
            monthName: format(today, 'MMMM yyyy').toUpperCase()
        };

        // Write directly to App Group UserDefaults
        await WidgetSync.setItem({
            key: 'zenith_widget_data',
            value: JSON.stringify(widgetData),
            group: APP_GROUP_ID
        });

        await WidgetSync.reloadAllTimelines();

    } catch (e: unknown) {
        console.error("Failed to sync iOS Widget Data:", e);
    }
}
