import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Habit, LogEntry } from '../types';
import { syncWidgetData } from '../utils/widgetSync';
import { scheduleAllNotifications, cancelAllNotifications } from '../utils/notifications';
import { Language, translations } from '../locales';

/**
 * Represents the global application state managed by Zustand.
 */
interface AppState {
    /** List of all habits, including active and soft-deleted ones. */
    habits: Habit[];
    /** History of all habit completions (logs). */
    logs: LogEntry[];
    /** The user's personalized display name. */
    userName: string;
    /** Current language preference (pt or en) */
    language: Language;
    /** Whether the daily Morning Reminder is enabled. */
    isMorningReminderActive: boolean;
    /** The preferred time of day for notifications, in 'HH:mm' format */
    morningReminderTime: string;
    /** Whether the user has been asked to enable notifications */
    hasPromptedForNotifications: boolean;
    /** JWT Token for Cloudflare API Authentication */
    jwt: string | null;
    /** Timestamp of the last successful cloud sync */
    lastSyncedAt: number;
    /** Current sync status indicator */
    syncStatus: 'idle' | 'syncing' | 'error';

    /**
     * Creates a new habit and adds it to the global state.
     * @param title The name of the habit.
     * @param frequency Array of days (0-6) when this habit should be active.
     * @param isHardMode If true, prevents retroactive check-ins.
     * @param reminderTime Optional daily reminder time in 'HH:mm' format for this specific habit.
     */
    addHabit: (title: string, frequency: number[], isHardMode: boolean, reminderTime?: string) => void;

    /**
     * Soft-deletes a habit by its ID, moving it to the trash.
     * @param id The UUID of the habit to remove.
     */
    removeHabit: (id: string) => void;

    /**
     * Restores a previously soft-deleted habit from the trash.
     * @param id The UUID of the habit to restore.
     */
    restoreHabit: (id: string) => void;

    /**
     * Permanently deletes a habit and all of its associated logs from history.
     * @param id The UUID of the habit to permanently destroy.
     */
    permanentlyDeleteHabit: (id: string) => void;

    /**
     * Updates the custom title of an existing habit.
     * @param id The UUID of the habit to edit.
     * @param newTitle The new display title.
     */
    editHabit: (id: string, newTitle: string) => void;

    /**
     * Updates or removes the specific reminder time for an existing habit.
     * @param id The UUID of the habit.
     * @param reminderTime The new time in 'HH:mm' format, or undefined to disable it.
     */
    editHabitReminder: (id: string, reminderTime?: string) => void;

    /**
     * Toggles the completion state of a habit for a specific day.
     * If already logged on that day, it unticks it; otherwise, it ticks it.
     * @param habitId The UUID of the habit to toggle.
     * @param dateMs Optional timestamp (ms) to log retroactively. Defaults to today.
     */
    toggleHabitLog: (habitId: string, dateMs?: number) => void;

    /**
     * Updates the user's customized display name across the app.
     * @param name The new display name.
     */
    setUserName: (name: string) => void;

    /**
     * Sets the user's preferred language.
     * @param language 'pt' or 'en'
     */
    setLanguage: (language: Language) => void;

    /**
     * Toggles the daily local notification reminder flag.
     * @param isActive True if notifications are turned on.
     */
    setMorningReminder: (isActive: boolean) => void;

    /**
     * Updates the custom time of day when notifications are triggered.
     * @param time The 24h custom timestring (e.g. "09:00").
     */
    setMorningReminderTime: (time: string) => void;

    /**
     * Sets whether the onboarding soft prompt for notifications has been shown.
     * @param prompted True if the user has already been asked.
     */
    setHasPromptedForNotifications: (prompted: boolean) => void;

    /**
     * Sets the user's JWT authentication token.
     * @param token The token or null to log out.
     */
    setJwt: (token: string | null) => void;

    /**
     * Executes the offline-first bi-directional sync with the Cloudflare Edge API.
     */
    syncWithCloud: () => Promise<void>;

    /**
     * Resets the local user data (habits, logs, sync metadata) to prepare for a fresh cloud pull.
     */
    clearUserData: () => void;

    /**
     * Logs the user out, clearing all sensitive data and credentials.
     */
    logout: () => void;
}

export const useStore = create<AppState>()(
    persist(
        (set, get) => ({
            habits: [],
            logs: [],
            userName: 'Pedro',
            language: 'pt',
            isMorningReminderActive: false,
            morningReminderTime: '09:00',
            hasPromptedForNotifications: false,
            jwt: null,
            lastSyncedAt: 0,
            syncStatus: 'idle',

            setUserName: (name) => set({ userName: name }),
            setLanguage: (language) => set({ language }),
            setJwt: (jwt) => set({ jwt }),

            clearUserData: () => {
                set({
                    habits: [],
                    logs: [],
                    lastSyncedAt: 0,
                    syncStatus: 'idle'
                });
            },

            logout: () => {
                set({
                    jwt: null,
                    habits: [],
                    logs: [],
                    lastSyncedAt: 0,
                    syncStatus: 'idle',
                    userName: 'Pedro', // Reset to default
                    language: 'pt'
                });
                // Ensure no ghost notifications remain after logout
                cancelAllNotifications().catch(console.error);
            },

            addHabit: (title, frequency, isHardMode, reminderTime) => {
                const newHabit: Habit = {
                    id: crypto.randomUUID(),
                    title,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    isActive: true,
                    frequency,
                    isHardMode,
                    reminderTime,
                };
                set((state) => ({ habits: [...state.habits, newHabit] }));
                syncWidgetData(get().habits, get().logs).catch(console.error);
                scheduleAllNotifications(get().habits, get().isMorningReminderActive, get().morningReminderTime).catch(console.error);
                get().syncWithCloud().catch(console.error);
            },

            removeHabit: (id) => {
                set((state) => ({
                    habits: state.habits.map((h) =>
                        h.id === id ? { ...h, isActive: false, deletedAt: Date.now(), updatedAt: Date.now() } : h
                    ),
                }));
                syncWidgetData(get().habits, get().logs).catch(console.error);
                scheduleAllNotifications(get().habits, get().isMorningReminderActive, get().morningReminderTime).catch(console.error);
                get().syncWithCloud().catch(console.error);
            },

            restoreHabit: (id) => {
                set((state) => ({
                    habits: state.habits.map((h) =>
                        h.id === id ? { ...h, isActive: true, deletedAt: undefined, updatedAt: Date.now() } : h
                    ),
                }));
                syncWidgetData(get().habits, get().logs).catch(console.error);
                scheduleAllNotifications(get().habits, get().isMorningReminderActive, get().morningReminderTime).catch(console.error);
                get().syncWithCloud().catch(console.error);
            },

            permanentlyDeleteHabit: (id) => {
                // To safely sync deletes, offline-first systems usually use soft-deletes.
                // Since this completely removes it from arrays, the backend won't know unless we track tombstones.
                // For MVP, we will keep it simple.
                set((state) => ({
                    habits: state.habits.filter((h) => h.id !== id),
                    logs: state.logs.filter((l) => l.habitId !== id)
                }));
                syncWidgetData(get().habits, get().logs).catch(console.error);
                scheduleAllNotifications(get().habits, get().isMorningReminderActive, get().morningReminderTime).catch(console.error);
                get().syncWithCloud().catch(console.error);
            },

            editHabit: (id, newTitle) => {
                set((state) => ({
                    habits: state.habits.map((h) =>
                        h.id === id ? { ...h, title: newTitle, updatedAt: Date.now() } : h
                    ),
                }));
                syncWidgetData(get().habits, get().logs).catch(console.error);
                scheduleAllNotifications(get().habits, get().isMorningReminderActive, get().morningReminderTime).catch(console.error);
                get().syncWithCloud().catch(console.error);
            },

            editHabitReminder: (id, reminderTime) => {
                set((state) => ({
                    habits: state.habits.map((h) =>
                        h.id === id ? { ...h, reminderTime, updatedAt: Date.now() } : h
                    ),
                }));
                scheduleAllNotifications(get().habits, get().isMorningReminderActive, get().morningReminderTime).catch(console.error);
                get().syncWithCloud().catch(console.error);
            },

            toggleHabitLog: (habitId: string, dateMs?: number) => {
                const { logs } = get();
                const targetDate = dateMs ? new Date(dateMs) : new Date();
                const targetStr = targetDate.toDateString();

                // Find if we already have a log for the target date
                const existingLogIndex = logs.findIndex(
                    (log) => log.habitId === habitId && new Date(log.completedAt).toDateString() === targetStr
                );

                if (existingLogIndex >= 0) {
                    // Un-tick (remove the log for that date)
                    const newLogs = [...logs];
                    newLogs.splice(existingLogIndex, 1);
                    set({ logs: newLogs });
                } else {
                    // Tick (add a log for that date)
                    const newLog: LogEntry = {
                        id: crypto.randomUUID(),
                        habitId,
                        completedAt: targetDate.getTime(),
                    };
                    set({ logs: [...logs, newLog] });
                }

                syncWidgetData(get().habits, get().logs).catch(console.error);
                get().syncWithCloud().catch(console.error);
            },

            setMorningReminder: (isActive: boolean) => {
                set({ isMorningReminderActive: isActive });
                scheduleAllNotifications(get().habits, get().isMorningReminderActive, get().morningReminderTime).catch(console.error);
            },

            setMorningReminderTime: (time: string) => {
                set({ morningReminderTime: time });
                scheduleAllNotifications(get().habits, get().isMorningReminderActive, get().morningReminderTime).catch(console.error);
            },

            setHasPromptedForNotifications: (prompted: boolean) => {
                set({ hasPromptedForNotifications: prompted });
            },

            syncWithCloud: async () => {
                const { jwt, lastSyncedAt, habits, logs } = get();
                if (!jwt) return; // Not logged in

                const API_URL = 'https://zenith-api.zenith-pedro.workers.dev'; // Production Cloudflare URL
                set({ syncStatus: 'syncing' });

                try {
                    // 1. PULL downstream changes
                    const pullRes = await fetch(`${API_URL}/sync/pull?lastSyncedAt=${lastSyncedAt}`, {
                        headers: { 'Authorization': `Bearer ${jwt}` }
                    });

                    if (!pullRes.ok) {
                        const errText = await pullRes.text();
                        console.error("Pull failed details:", errText);
                        throw new Error(`Pull failed: ${pullRes.status} ${errText}`);
                    }
                    const pullData = await pullRes.json();

                    // Merge habits (remote wins conflicts for MVP)
                    const newHabits = [...habits];
                    pullData.habits.forEach((remoteHabit: Habit) => {
                        const localRemoteHabit = { ...remoteHabit, syncedAt: Date.now() };
                        const idx = newHabits.findIndex(h => h.id === remoteHabit.id);
                        if (idx >= 0) newHabits[idx] = localRemoteHabit;
                        else newHabits.push(localRemoteHabit);
                    });

                    // Merge logs
                    const newLogs = [...logs];
                    pullData.logs.forEach((remoteLog: LogEntry) => {
                        if (!newLogs.some(l => l.id === remoteLog.id)) {
                            newLogs.push(remoteLog);
                        }
                    });

                    set({ habits: newHabits, logs: newLogs });

                    // 2. PUSH upstream changes
                    const unsyncedHabits = newHabits.filter(h => !(h.syncedAt) || (h.updatedAt || h.createdAt || 0) > h.syncedAt);
                    const unsyncedLogs = newLogs.filter(l => !(l.syncedAt));

                    if (unsyncedHabits.length > 0 || unsyncedLogs.length > 0) {
                        const pushRes = await fetch(`${API_URL}/sync/push`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${jwt}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                lastSyncedAt: Date.now(),
                                habits: unsyncedHabits,
                                logs: unsyncedLogs
                            })
                        });

                        if (!pushRes.ok) {
                            const errText = await pushRes.text();
                            console.error("Push failed details:", errText);
                            throw new Error(`Push failed: ${pushRes.status} ${errText}`);
                        }

                        // Mark newly pushed habits and logs as synced
                        const updatedHabits = get().habits.map(h =>
                            unsyncedHabits.some(uh => uh.id === h.id) ? { ...h, syncedAt: Date.now() } : h
                        );
                        const updatedLogs = get().logs.map(l =>
                            unsyncedLogs.some(ul => ul.id === l.id) ? { ...l, syncedAt: Date.now() } : l
                        );
                        set({ habits: updatedHabits, logs: updatedLogs });
                    }

                    // Update cursor
                    set({ lastSyncedAt: Date.now(), syncStatus: 'idle' });

                } catch (error: any) {
                    console.error('Sync error details:', error?.message || error);
                    set({ syncStatus: 'error' });
                }
            }
        }),
        {
            name: 'zenith-storage',
        }
    )
);
