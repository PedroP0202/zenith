import type { Habit, HabitFormValues, LogEntry } from '@/types';

export type HabitsSlice = {
    habits: Habit[];
    logs: LogEntry[];
    deletedHabitIds: string[];
    deletedLogIds: string[];
    addHabit: (input: HabitFormValues) => void;
    removeHabit: (id: string) => void;
    restoreHabit: (id: string) => void;
    permanentlyDeleteHabit: (id: string) => void;
    editHabit: (id: string, newTitle: string) => void;
    editHabitReminder: (id: string, reminderTime?: string) => void;
    toggleHabitLog: (habitId: string, dateMs?: number) => void;
    incrementHabitProgress: (habitId: string, dateMs?: number) => void;
    decrementHabitProgress: (habitId: string, dateMs?: number) => void;
    checkWidgetToggles: () => Promise<void>;
};

export const habitsInitialState = {
    habits: [],
    logs: [],
    deletedHabitIds: [],
    deletedLogIds: [],
} satisfies Pick<HabitsSlice, 'habits' | 'logs' | 'deletedHabitIds' | 'deletedLogIds'>;
