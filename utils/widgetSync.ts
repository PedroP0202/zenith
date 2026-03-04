import { Capacitor, registerPlugin } from '@capacitor/core';
import { Habit, LogEntry } from '@/types';
import { startOfDay, isSameDay } from 'date-fns';
import { calculateStreak } from './streak';

const WidgetSync = registerPlugin<any>('WidgetSyncPlugin');

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
}

/**
 * Calculates current day stats from the App State and saves them to the
 * iOS App Group Shared `UserDefaults` via our Custom Native Swift Plugin, 
 * pushing a signal to WidgetKit to reload visually.
 */
export async function syncWidgetData(habits: Habit[], logs: LogEntry[]) {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') {
        return;
    }

    try {
        const today = new Date();
        const todayStart = startOfDay(today);
        const currentDayOfWeek = today.getDay();
        const widgetHabits: WidgetHabit[] = [];

        // Iterate through active habits specifically scheduled for TODAY
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

        const displayHabits = widgetHabits.slice(0, 4);

        const completedHabitsCount = widgetHabits.filter(h => h.completed).length;

        const widgetData: WidgetData = {
            habits: displayHabits,
            totalHabits: widgetHabits.length,
            completedHabits: completedHabitsCount
        };

        // Write directly to App Group UserDefaults using our native bridge
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
