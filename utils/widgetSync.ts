import { Capacitor, registerPlugin } from '@capacitor/core';
import { Habit, LogEntry } from '@/types';
import { startOfDay, isSameDay, subDays, format } from 'date-fns';
import { calculateStreak } from './streak';

interface WidgetSyncPlugin {
    setItem: (options: { key: string; value: string; group: string }) => Promise<void>;
    getItem: (options: { key: string; group: string }) => Promise<{ value: any }>;
    removeItem: (options: { key: string; group: string }) => Promise<void>;
    reloadAllTimelines: () => Promise<void>;
}

const WidgetSync = registerPlugin<WidgetSyncPlugin>('WidgetSyncPlugin');

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
        
        // 1. Current Day Logic
        const widgetHabits: WidgetHabit[] = [];
        const activeHabits = habits.filter(h => {
            if (!h.isActive) return false;
            if (!h.frequency || h.frequency.length === 0) return true;
            return h.frequency.includes(currentDayOfWeek);
        });

        activeHabits.forEach(habit => {
            const habitLogs = logs.filter(l => l.habitId === habit.id);
            const hasLoggedToday = habitLogs.some(log => {
                const checkDate = startOfDay(new Date(log.completedAt));
                return isSameDay(todayStart, checkDate);
            });
            const currentStreak = calculateStreak(habitLogs, habit.frequency);

            widgetHabits.push({
                id: habit.id,
                title: habit.title,
                completed: hasLoggedToday,
                streak: currentStreak
            });
        });

        // 2. Weekly Progress Logic (last 7 days)
        const weeklyCompletion: number[] = [];
        for (let i = 6; i >= 0; i--) {
            const targetDate = startOfDay(subDays(today, i));
            const targetDayOfWeek = targetDate.getDay();
            
            const habitsAtThatDay = habits.filter(h => {
                if (!h.isActive) return false;
                if (!h.frequency || h.frequency.length === 0) return true;
                return h.frequency.includes(targetDayOfWeek);
            });

            if (habitsAtThatDay.length === 0) {
                weeklyCompletion.push(0);
                continue;
            }

            const completedCount = habitsAtThatDay.filter(habit => {
                const habitLogs = logs.filter(l => l.habitId === habit.id);
                return habitLogs.some(log => isSameDay(startOfDay(new Date(log.completedAt)), targetDate));
            }).length;

            weeklyCompletion.push(completedCount / habitsAtThatDay.length);
        }

        const displayHabits = widgetHabits.slice(0, 4);
        const completedHabitsCount = widgetHabits.filter(h => h.completed).length;

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

    } catch (e: any) {
        console.error("Failed to sync iOS Widget Data:", e);
    }
}
