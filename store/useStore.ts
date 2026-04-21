import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Friend, FriendRequest, Habit, HabitFormValues, LogEntry } from '@/types';
import { encryptData, decryptData, saveSecureJwt, getSecureJwt, removeSecureJwt } from '@/utils/secureStorage';
import { Capacitor } from '@capacitor/core';
import { getLevelFromXp } from '@/utils/progression';
import { syncWidgetData } from '../utils/widgetSync';
import { scheduleAllNotifications, cancelAllNotifications } from '../utils/notifications';
import { Language, translations } from '../locales';
import { API_URL } from '@/utils/constants';
import { getHabitDayProgress, getHabitFrequency, getHabitGoalType, getHabitPeriodTarget, getHabitProgressForDate, getHabitScheduleType, getHabitTargetValue, getHabitUnitLabel, getHabitWeeklyTarget, isHabitCompleteForDate } from '@/utils/habits';

function isLanguage(value: unknown): value is Language {
    return typeof value === 'string' && Object.prototype.hasOwnProperty.call(translations, value);
}

function getHabitXpValue(habit?: Pick<Habit, 'isHardMode'>) {
    return habit?.isHardMode ? 20 : 10;
}

function getDayKey(timestamp: number) {
    const date = new Date(timestamp);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
}

function replaceLogForDay(
    logs: LogEntry[],
    deletedLogIds: string[],
    habitId: string,
    targetDate: Date,
    nextValue: number
) {
    const targetDayKey = getDayKey(targetDate.getTime());
    const nextLogs: LogEntry[] = [];
    const removedLogIds: string[] = [];

    for (const log of logs) {
        const isSameHabitDay = log.habitId === habitId && getDayKey(log.completedAt) === targetDayKey;
        if (isSameHabitDay) {
            removedLogIds.push(log.id);
            continue;
        }
        nextLogs.push(log);
    }

    if (nextValue > 0) {
        nextLogs.push({
            id: crypto.randomUUID(),
            habitId,
            completedAt: targetDate.getTime(),
            value: nextValue === 1 ? undefined : nextValue,
        });
    }

    return {
        nextLogs,
        nextDeletedLogIds: [...deletedLogIds, ...removedLogIds],
    };
}

function normalizeHabitInput(input: HabitFormValues): HabitFormValues {
    const scheduleType = getHabitScheduleType(input);
    const goalType = scheduleType === 'times_per_week' ? 'complete' : getHabitGoalType(input);

    return {
        title: input.title.trim(),
        frequency: getHabitFrequency(input),
        scheduleType,
        weeklyTarget: scheduleType === 'times_per_week' ? getHabitWeeklyTarget(input) : undefined,
        goalType,
        targetValue: scheduleType === 'specific_days' && goalType === 'count' ? getHabitTargetValue(input) : undefined,
        unitLabel: scheduleType === 'specific_days' && goalType === 'count' ? getHabitUnitLabel(input) : undefined,
        isHardMode: Boolean(input.isHardMode),
        reminderTime: input.reminderTime,
    };
}

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
    /** The user's unique @handle. */
    username: string | null;
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
    /** Is the auth state currently hydrating from secure storage? */
    isInitializingAuth: boolean;
    /** Timestamp of the last successful cloud sync */
    lastSyncedAt: number;
    /** Current sync status indicator */
    syncStatus: 'idle' | 'syncing' | 'error';
    /** IDs of habits permanently deleted locally but not yet synced */
    deletedHabitIds: string[];
    /** IDs of logs deleted locally but not yet synced */
    deletedLogIds: string[];
    /** Whether the user has completed the onboarding flow */
    hasCompletedOnboarding: boolean;
    /** Whether the user has opted in to the global leaderboard */
    optInLeaderboard: boolean;
    /** List of accepted friends */
    friends: Friend[];
    /** List of incoming friend requests */
    friendRequests: FriendRequest[];
    /** List of outgoing friend requests */
    outgoingRequests: FriendRequest[];
    /** Loading state for social actions */
    friendsLoading: boolean;
    /** User's total experience points */
    totalXP: number;
    /** User's exclusive Arena points */
    arenaPoints: number;
    /** User's current level */
    level: number;
    /** The UTC date of the last collected daily reward (YYYY-MM-DD) */
    lastLoginRewardDate: string | null;
    /** Temporary flag to show reward toast */
    showDailyRewardToast: boolean;


    /**
     * Creates a new habit and adds it to the global state.
     * Supports binary and quantitative goals, plus fixed weekdays or weekly quotas.
     */
    addHabit: (input: HabitFormValues) => void;

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
     * Increments the progress value of a quantitative habit for a given day.
     */
    incrementHabitProgress: (habitId: string, dateMs?: number) => void;

    /**
     * Decrements the progress value of a quantitative habit for a given day.
     */
    decrementHabitProgress: (habitId: string, dateMs?: number) => void;

    /**
     * Updates the user's customized display name across the app.
     * @param name The new display name.
     */
    setUserName: (name: string) => void;

    /**
     * Updates the user's unique @handle.
     * @param username The new username.
     */
    setUsername: (username: string) => Promise<void>;

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

    /** Fetches the accepted friends list from the cloud. */
    fetchFriends: () => Promise<void>;
    /** Fetches incoming and outgoing friend requests from the cloud. */
    fetchFriendRequests: () => Promise<void>;
    /** Sends a friend request to another user. */
    sendFriendRequest: (friendId: string) => Promise<{ success: boolean; error?: string }>;
    /** Accepts, rejects, or cancels a friend request. */
    handleFriendRequest: (requestId: string, action: 'accept' | 'reject' | 'cancel') => Promise<void>;
    /** Removes an accepted friend from the social system */
    removeFriend: (friendId: string) => Promise<{ success: boolean; error?: string }>;


    /**
     * Internal helper to sync profile (name, language) to the cloud.
     */
    syncProfile: () => Promise<void>;

    /**
     * Logs the user out, clearing all sensitive data and credentials.
     */
    logout: () => void;

    /**
     * Toggles the onboarding completion flag.
     * @param completed True if the user has finished onboarding.
     */
    setHasCompletedOnboarding: (completed: boolean) => void;

    /**
     * Toggles the user's participation in the global leaderboard.
     */
    setOptInLeaderboard: (optedIn: boolean) => void;

    /**
     * Checks if the user toggled any habits via the iOS Widget while the app was in the background.
     */
    checkWidgetToggles: () => Promise<void>;

    /**
     * Checks if the user should receive a daily login reward.
     */
    checkDailyReward: () => void;

    /**
     * Dismisses the daily reward toast.
     */
    dismissDailyRewardToast: () => void;

    /**
     * Restores user session data from the login API response without triggering profile sync.
     * Prevents the race condition where clearUserData() zeros out XP before the pull completes.
     */
    restoreUserSession: (data: { name?: string; username?: string | null; language?: string; total_xp?: number; level?: number; lastLoginRewardDate?: string | null; optInLeaderboard?: boolean; arena_points?: number; }) => void;
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
            isInitializingAuth: true,
            lastSyncedAt: 0,
            syncStatus: 'idle',
            deletedHabitIds: [],
            deletedLogIds: [],
            hasCompletedOnboarding: false,
            optInLeaderboard: false,
            friends: [],
            friendRequests: [],
            outgoingRequests: [],
            friendsLoading: false,
            username: null,
            totalXP: 0,
            arenaPoints: 0,
            level: 1,
            lastLoginRewardDate: null,
            showDailyRewardToast: false,

            setUserName: (name) => {
                set({ userName: name });
                get().syncProfile().catch(console.error);
            },
            setUsername: async (username) => {
                const previousUsername = get().username;
                set({ username });
                try {
                    await get().syncProfile();
                } catch (error) {
                    set({ username: previousUsername });
                    throw error;
                }
            },
            setLanguage: (language) => {
                set({ language });
                get().syncProfile().catch(console.error);
            },
            setJwt: (jwt) => {
                set({ jwt });
                if (jwt) {
                    saveSecureJwt(jwt).catch(console.error);
                } else {
                    removeSecureJwt().catch(console.error);
                }
            },
            setHasCompletedOnboarding: (completed) => {
                set({ hasCompletedOnboarding: completed });
            },

            setOptInLeaderboard: (optedIn) => {
                set({ optInLeaderboard: optedIn });
                get().syncProfile().catch(console.error);
            },

            checkDailyReward: () => {
                if (!get().jwt) return;
                
                const today = new Date().toISOString().split('T')[0];
                if (get().lastLoginRewardDate !== today) {
                    // Mark today as rewarded in local state
                    // XP is NOT added locally — the server calculates XP from logs.
                    // The +5 XP is actually credited server-side when the daily check-in log is created.
                    // Here we just show the toast and sync the reward date.
                    set({ 
                        lastLoginRewardDate: today,
                        showDailyRewardToast: true 
                    });
                    // Sync the new reward date to the server
                    get().syncProfile().catch(console.error);
                }
            },

            dismissDailyRewardToast: () => {
                set({ showDailyRewardToast: false });
            },

            clearUserData: () => {
                set({
                    habits: [],
                    logs: [],
                    userName: 'Pedro',
                    username: null,
                    lastSyncedAt: 0,
                    syncStatus: 'idle',
                    deletedHabitIds: [],
                    deletedLogIds: [],
                    hasCompletedOnboarding: false,
                    optInLeaderboard: false,
                    friends: [],
                    friendRequests: [],
                    outgoingRequests: [],
                    friendsLoading: false,
                    totalXP: 0,
                    arenaPoints: 0,
                    level: 1,
                    lastLoginRewardDate: null,
                    showDailyRewardToast: false
                });
            },

            logout: () => {
                const currentLanguage = get().language; // Preserve language
                set({
                    jwt: null,
                    habits: [],
                    logs: [],
                    lastSyncedAt: 0,
                    syncStatus: 'idle',
                    deletedHabitIds: [],
                    deletedLogIds: [],
                    userName: 'Pedro',
                    username: null,
                    language: currentLanguage,
                    hasCompletedOnboarding: false,
                    optInLeaderboard: false,
                    friends: [],
                    friendRequests: [],
                    outgoingRequests: [],
                    friendsLoading: false,
                    totalXP: 0,
                    arenaPoints: 0,
                    level: 1,
                    lastLoginRewardDate: null,
                    showDailyRewardToast: false
                });
                removeSecureJwt().catch(console.error);
                // Ensure no ghost notifications remain after logout
                cancelAllNotifications().catch(console.error);
            },

            addHabit: (input) => {
                const normalized = normalizeHabitInput(input);
                const now = Date.now();
                const newHabit: Habit = {
                    id: crypto.randomUUID(),
                    title: normalized.title,
                    createdAt: now,
                    updatedAt: now,
                    isActive: true,
                    frequency: normalized.frequency,
                    scheduleType: normalized.scheduleType,
                    weeklyTarget: normalized.weeklyTarget,
                    goalType: normalized.goalType,
                    targetValue: normalized.targetValue,
                    unitLabel: normalized.unitLabel,
                    isHardMode: normalized.isHardMode,
                    reminderTime: normalized.reminderTime,
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
                    logs: state.logs.filter((l) => l.habitId !== id),
                    deletedHabitIds: [...state.deletedHabitIds, id]
                }));
                syncWidgetData(get().habits, get().logs).catch(console.error);
                scheduleAllNotifications(get().habits, get().isMorningReminderActive, get().isMorningReminderActive ? get().morningReminderTime : undefined).catch(console.error);
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
                const state = get();
                const habit = state.habits.find((item) => item.id === habitId);
                if (!habit) return;

                const targetDate = dateMs ? new Date(dateMs) : new Date();
                const habitLogs = state.logs.filter((log) => log.habitId === habitId);
                const dayProgress = getHabitDayProgress(habitLogs, targetDate);
                const beforeComplete = isHabitCompleteForDate(habitLogs, habit, targetDate);
                const nextValue = getHabitGoalType(habit) === 'count'
                    ? (beforeComplete ? 0 : getHabitTargetValue(habit))
                    : (dayProgress > 0 ? 0 : 1);

                const { nextLogs, nextDeletedLogIds } = replaceLogForDay(
                    state.logs,
                    state.deletedLogIds,
                    habitId,
                    targetDate,
                    nextValue
                );

                const nextHabitLogs = nextLogs.filter((log) => log.habitId === habitId);
                const afterComplete = isHabitCompleteForDate(nextHabitLogs, habit, targetDate);
                const xpDelta = afterComplete === beforeComplete
                    ? 0
                    : afterComplete
                        ? getHabitXpValue(habit)
                        : -getHabitXpValue(habit);
                const nextTotalXP = Math.max(0, state.totalXP + xpDelta);
                const nextArenaPoints = state.optInLeaderboard
                    ? Math.max(0, state.arenaPoints + xpDelta)
                    : 0;

                set({
                    logs: nextLogs,
                    deletedLogIds: nextDeletedLogIds,
                    totalXP: nextTotalXP,
                    level: getLevelFromXp(nextTotalXP),
                    arenaPoints: nextArenaPoints,
                });

                syncWidgetData(get().habits, get().logs).catch(console.error);
                // Only sync habits/logs to cloud. XP is calculated server-side in /sync/pull.
                get().syncWithCloud().catch(console.error);
            },

            incrementHabitProgress: (habitId: string, dateMs?: number) => {
                const state = get();
                const habit = state.habits.find((item) => item.id === habitId);
                if (!habit || getHabitGoalType(habit) !== 'count') return;

                const targetDate = dateMs ? new Date(dateMs) : new Date();
                const habitLogs = state.logs.filter((log) => log.habitId === habitId);
                const dayProgress = getHabitDayProgress(habitLogs, targetDate);
                const targetValue = getHabitTargetValue(habit);
                const beforeComplete = isHabitCompleteForDate(habitLogs, habit, targetDate);
                const nextValue = Math.min(targetValue, dayProgress + 1);

                if (nextValue === dayProgress) return;

                const { nextLogs, nextDeletedLogIds } = replaceLogForDay(
                    state.logs,
                    state.deletedLogIds,
                    habitId,
                    targetDate,
                    nextValue
                );

                const nextHabitLogs = nextLogs.filter((log) => log.habitId === habitId);
                const afterComplete = isHabitCompleteForDate(nextHabitLogs, habit, targetDate);
                const xpDelta = afterComplete === beforeComplete
                    ? 0
                    : afterComplete
                        ? getHabitXpValue(habit)
                        : -getHabitXpValue(habit);
                const nextTotalXP = Math.max(0, state.totalXP + xpDelta);
                const nextArenaPoints = state.optInLeaderboard
                    ? Math.max(0, state.arenaPoints + xpDelta)
                    : 0;

                set({
                    logs: nextLogs,
                    deletedLogIds: nextDeletedLogIds,
                    totalXP: nextTotalXP,
                    level: getLevelFromXp(nextTotalXP),
                    arenaPoints: nextArenaPoints,
                });

                syncWidgetData(get().habits, get().logs).catch(console.error);
                get().syncWithCloud().catch(console.error);
            },

            decrementHabitProgress: (habitId: string, dateMs?: number) => {
                const state = get();
                const habit = state.habits.find((item) => item.id === habitId);
                if (!habit || getHabitGoalType(habit) !== 'count') return;

                const targetDate = dateMs ? new Date(dateMs) : new Date();
                const habitLogs = state.logs.filter((log) => log.habitId === habitId);
                const dayProgress = getHabitDayProgress(habitLogs, targetDate);
                const beforeComplete = isHabitCompleteForDate(habitLogs, habit, targetDate);
                const nextValue = Math.max(0, dayProgress - 1);

                if (nextValue === dayProgress) return;

                const { nextLogs, nextDeletedLogIds } = replaceLogForDay(
                    state.logs,
                    state.deletedLogIds,
                    habitId,
                    targetDate,
                    nextValue
                );

                const nextHabitLogs = nextLogs.filter((log) => log.habitId === habitId);
                const afterComplete = isHabitCompleteForDate(nextHabitLogs, habit, targetDate);
                const xpDelta = afterComplete === beforeComplete
                    ? 0
                    : afterComplete
                        ? getHabitXpValue(habit)
                        : -getHabitXpValue(habit);
                const nextTotalXP = Math.max(0, state.totalXP + xpDelta);
                const nextArenaPoints = state.optInLeaderboard
                    ? Math.max(0, state.arenaPoints + xpDelta)
                    : 0;

                set({
                    logs: nextLogs,
                    deletedLogIds: nextDeletedLogIds,
                    totalXP: nextTotalXP,
                    level: getLevelFromXp(nextTotalXP),
                    arenaPoints: nextArenaPoints,
                });

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
                const { jwt, lastSyncedAt, habits, logs, deletedHabitIds, deletedLogIds } = get();
                if (!jwt) return;

                set({ syncStatus: 'syncing' });

                try {
                    // 0. Sync Profile metadata first (name, language, etc. - NOT XP)
                    await get().syncProfile();

                    // 1. PULL downstream changes (server is authoritative for XP/level)
                    const pullRes = await fetch(`${API_URL}/sync/pull?lastSyncedAt=${lastSyncedAt}`, {
                        headers: { 'Authorization': `Bearer ${jwt}` }
                    });

                    if (!pullRes.ok) {
                        throw new Error(`Pull failed: ${pullRes.status}`);
                    }
                    const pullData = await pullRes.json();

                    // Merge habits
                    const newHabits = [...habits];
                    pullData.habits.forEach((remoteHabit: Habit) => {
                        const idx = newHabits.findIndex(h => h.id === remoteHabit.id);
                        if (idx >= 0) newHabits[idx] = { ...remoteHabit, syncedAt: Date.now() };
                        else if (!deletedHabitIds.includes(remoteHabit.id)) {
                            newHabits.push({ ...remoteHabit, syncedAt: Date.now() });
                        }
                    });

                    // Merge logs
                    const newLogs = [...logs];
                    pullData.logs.forEach((remoteLog: LogEntry) => {
                        if (!newLogs.some(l => l.id === remoteLog.id)) {
                            newLogs.push(remoteLog);
                        }
                    });

                    // Apply server-authoritative XP, level, and user state
                    // The server recalculated these from actual logs — trust it completely.
                    set({ 
                        habits: newHabits, 
                        logs: newLogs,
                        totalXP: pullData.user?.total_xp ?? get().totalXP,
                        level: pullData.user?.level ?? get().level,
                        arenaPoints: pullData.user?.arena_points ?? get().arenaPoints,
                        lastLoginRewardDate: pullData.user?.lastLoginRewardDate ?? get().lastLoginRewardDate,
                    });

                    // 2. Check daily reward AFTER the pull has restored the correct lastLoginRewardDate.
                    // This prevents giving a reward based on stale/reset local state.
                    get().checkDailyReward();

                    // 3. PUSH upstream changes (habits and logs that haven't been synced yet)
                    const unsyncedHabits = newHabits.filter(h => !(h.syncedAt) || (h.updatedAt || h.createdAt || 0) > h.syncedAt);
                    const unsyncedLogs = newLogs.filter(l => !(l.syncedAt));

                    if (unsyncedHabits.length > 0 || unsyncedLogs.length > 0 || deletedHabitIds.length > 0 || deletedLogIds.length > 0) {
                        const pushRes = await fetch(`${API_URL}/sync/push`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${jwt}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                lastSyncedAt: Date.now(),
                                habits: unsyncedHabits,
                                logs: unsyncedLogs,
                                deletedHabitIds,
                                deletedLogIds
                            })
                        });

                        if (!pushRes.ok) {
                            throw new Error(`Push failed: ${pushRes.status}`);
                        }

                        // Mark synced
                        const finalHabits = get().habits.map(h =>
                            unsyncedHabits.some(uh => uh.id === h.id) ? { ...h, syncedAt: Date.now() } : h
                        );
                        const finalLogs = get().logs.map(l =>
                            unsyncedLogs.some(ul => ul.id === l.id) ? { ...l, syncedAt: Date.now() } : l
                        );

                        set({
                            habits: finalHabits,
                            logs: finalLogs,
                            deletedHabitIds: [], // Clear on success
                            deletedLogIds: [], // Clear on success
                            lastSyncedAt: Date.now(),
                            syncStatus: 'idle'
                        });
                    } else {
                        set({ lastSyncedAt: Date.now(), syncStatus: 'idle' });
                    }

                } catch (error: unknown) {
                    console.error('Sync error:', error);
                    set({ syncStatus: 'error' });
                }
            },

            syncProfile: async () => {
                const { jwt, userName, language, optInLeaderboard, username, lastLoginRewardDate, arenaPoints } = get();
                if (!jwt) return;

                try {
                    const res = await fetch(`${API_URL}/auth/profile`, {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${jwt}`,
                            'Content-Type': 'application/json'
                        },
                        // IMPORTANT: total_xp and level are NOT sent here.
                        // They are authoritatively calculated by the server in /sync/pull.
                        // Only social/profile fields that the client controls are sent.
                        body: JSON.stringify({ name: userName, language, optInLeaderboard, username, lastLoginRewardDate, arenaPoints })
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) {
                        throw new Error(data.error || 'Falha ao sincronizar perfil.');
                    }
                } catch (e) {
                    console.error("[STORE] Failed to sync profile:", e);
                    throw e;
                }
            },

            restoreUserSession: (data) => {
                // Restore user data from login API response WITHOUT triggering syncProfile.
                // This prevents the race condition where clearUserData() zeroed out XP.
                const updates: Partial<AppState> = {};
                if (data.name !== undefined) updates.userName = data.name;
                if (data.username !== undefined) updates.username = data.username;
                if (data.language !== undefined && isLanguage(data.language)) updates.language = data.language;
                if (data.total_xp !== undefined) updates.totalXP = data.total_xp;
                if (data.level !== undefined) updates.level = data.level;
                if (data.lastLoginRewardDate !== undefined) updates.lastLoginRewardDate = data.lastLoginRewardDate;
                if (data.optInLeaderboard !== undefined) updates.optInLeaderboard = data.optInLeaderboard;
                if (data.arena_points !== undefined) updates.arenaPoints = data.arena_points;
                set(updates);
            },

            fetchFriends: async () => {
                const { jwt } = get();
                if (!jwt) return;
                set({ friendsLoading: true });
                try {
                    const res = await fetch(`${API_URL}/friends`, {
                        headers: { 'Authorization': `Bearer ${jwt}` }
                    });
                    const data = (await res.json().catch(() => ({}))) as { friends?: Friend[] };
                    if (res.ok) set({ friends: data.friends || [] });
                } catch (e) {
                    console.error("[STORE] Failed to fetch friends:", e);
                } finally {
                    set({ friendsLoading: false });
                }
            },

            fetchFriendRequests: async () => {
                const { jwt } = get();
                if (!jwt) return;
                try {
                    const res = await fetch(`${API_URL}/friends/requests`, {
                        headers: { 'Authorization': `Bearer ${jwt}` }
                    });
                    const data = (await res.json().catch(() => ({}))) as {
                        incoming?: FriendRequest[];
                        outgoing?: FriendRequest[];
                    };
                    if (res.ok) {
                        set({ 
                            friendRequests: data.incoming || [],
                            outgoingRequests: data.outgoing || []
                        });
                    }
                } catch (e) {
                    console.error("[STORE] Failed to fetch requests:", e);
                }
            },

            sendFriendRequest: async (friendId: string) => {
                const { jwt } = get();
                if (!jwt) return { success: false, error: 'Not authenticated' };
                try {
                    const res = await fetch(`${API_URL}/friends/request`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${jwt}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ friendId })
                    });
                    const data = await res.json();
                    if (res.ok) return { success: true };
                    return { success: false, error: data.error };
                } catch (e) {
                    return { success: false, error: 'Network error' };
                }
            },

            handleFriendRequest: async (requestId: string, action: 'accept' | 'reject' | 'cancel') => {
                const { jwt } = get();
                if (!jwt) return;
                try {
                    const res = await fetch(`${API_URL}/friends/request/${requestId}`, {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${jwt}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ action })
                    });
                    if (res.ok) {
                        // Refresh both lists
                        get().fetchFriends();
                        get().fetchFriendRequests();
                    }
                } catch (e) {
                    console.error("[STORE] Failed to handle request:", e);
                }
            },

            removeFriend: async (friendId: string) => {
                const { jwt, friends } = get();
                if (!jwt) return { success: false, error: 'Not authenticated' };
                try {
                    const res = await fetch(`${API_URL}/friends/${friendId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${jwt}` }
                    });
                    const data = await res.json();
                    if (res.ok) {
                        set({ friends: friends.filter(f => f.id !== friendId) });
                        return { success: true };
                    }
                    return { success: false, error: data.error };
                } catch (e) {
                    return { success: false, error: 'Network error' };
                }
            },

            checkWidgetToggles: async () => {
                if (typeof window !== 'undefined' && Capacitor.getPlatform() === 'ios') {
                    try {
                        const widgetModule = await import('../utils/widgetSync');
                        const { APP_GROUP_ID, WidgetSync } = widgetModule;
                        const res = await WidgetSync.getItem({
                            key: 'zenith_pending_widget_toggles',
                            group: APP_GROUP_ID
                        });

                        const parsePendingToggles = (value: unknown): Record<string, boolean> | null => {
                            if (!value) return null;

                            if (typeof value === 'string') {
                                try {
                                    const parsed = JSON.parse(value) as unknown;
                                    if (parsed && typeof parsed === 'object') {
                                        return Object.fromEntries(
                                            Object.entries(parsed as Record<string, unknown>).filter(
                                                ([, toggleValue]) => typeof toggleValue === 'boolean'
                                            )
                                        ) as Record<string, boolean>;
                                    }
                                } catch {
                                    return null;
                                }
                                return null;
                            }

                            if (typeof value === 'object' && !Array.isArray(value)) {
                                return Object.fromEntries(
                                    Object.entries(value as Record<string, unknown>).filter(
                                        ([, toggleValue]) => typeof toggleValue === 'boolean'
                                    )
                                ) as Record<string, boolean>;
                            }

                            return null;
                        };

                        const pendingToggles = parsePendingToggles(res.value);
                        if (pendingToggles && Object.keys(pendingToggles).length > 0) {
                            const state = get();
                            const todayStart = new Date();
                            todayStart.setHours(0, 0, 0, 0);
                            const todayMs = todayStart.getTime();

                            let nextLogs = [...state.logs];
                            let nextDeletedLogIds = [...state.deletedLogIds];
                            let xpDelta = 0;
                            let arenaDelta = 0;
                            let hasChanges = false;

                            const habitById = new Map(state.habits.map((habit) => [habit.id, habit] as const));

                            for (const [habitId, shouldBeCompleted] of Object.entries(pendingToggles)) {
                                const habit = habitById.get(habitId);
                                if (!habit || !habit.isActive) continue;

                                const habitLogs = nextLogs.filter((log) => log.habitId === habitId);
                                const isCurrentlyCompleted = isHabitCompleteForDate(habitLogs, habit, todayStart);
                                if (isCurrentlyCompleted === shouldBeCompleted) continue;

                                const nextValue = shouldBeCompleted
                                    ? (getHabitGoalType(habit) === 'count' ? getHabitTargetValue(habit) : 1)
                                    : 0;
                                const replacement = replaceLogForDay(nextLogs, nextDeletedLogIds, habitId, todayStart, nextValue);
                                nextLogs = replacement.nextLogs;
                                nextDeletedLogIds = replacement.nextDeletedLogIds;

                                const nextHabitLogs = nextLogs.filter((log) => log.habitId === habitId);
                                const afterComplete = isHabitCompleteForDate(nextHabitLogs, habit, todayStart);
                                const completionDelta = afterComplete === isCurrentlyCompleted
                                    ? 0
                                    : afterComplete
                                        ? getHabitXpValue(habit)
                                        : -getHabitXpValue(habit);

                                xpDelta += completionDelta;
                                if (state.optInLeaderboard) arenaDelta += completionDelta;

                                hasChanges = true;
                            }

                            if (hasChanges) {
                                const nextTotalXP = Math.max(0, state.totalXP + xpDelta);
                                const nextArenaPoints = state.optInLeaderboard
                                    ? Math.max(0, state.arenaPoints + arenaDelta)
                                    : 0;

                                set({
                                    logs: nextLogs,
                                    deletedLogIds: nextDeletedLogIds,
                                    totalXP: nextTotalXP,
                                    level: getLevelFromXp(nextTotalXP),
                                    arenaPoints: nextArenaPoints
                                });

                                syncWidgetData(state.habits, nextLogs).catch(console.error);
                                get().syncWithCloud().catch(console.error);
                            }

                            await WidgetSync.removeItem({
                                key: 'zenith_pending_widget_toggles',
                                group: APP_GROUP_ID
                            });
                        }
                    } catch (e) {
                        console.error("[STORE] Failed to check widget toggles:", e);
                    }
                }
            }
        }),
        {
            name: 'zenith-storage',
            partialize: (state) => {
                // Omit jwt and isInitializingAuth from being stored in the encrypted payload
                const { jwt, isInitializingAuth, ...restToEncrypt } = state;
                return restToEncrypt;
            },
            storage: createJSONStorage(() => {
                const isServer = typeof window === 'undefined';
                return {
                    getItem: async (name) => {
                        if (isServer) return null;
                        const str = window.localStorage.getItem(name);
                        if (!str) return null;
                        try {
                            const decryptedStr = await decryptData(str);
                            return decryptedStr;
                        } catch (e) {
                            console.error("Failed to decrypt state", e);
                            return null;
                        }
                    },
                    setItem: async (name, value) => {
                        if (isServer) return;
                        try {
                            const encryptedStr = await encryptData(value);
                            window.localStorage.setItem(name, encryptedStr);
                        } catch (e) {
                            console.error("Failed to encrypt state", e);
                        }
                    },
                    removeItem: async (name) => {
                        if (isServer) return;
                        window.localStorage.removeItem(name);
                    },
                };
            }),
            onRehydrateStorage: () => {
                // Return a function to run after hydration is complete
                return (state, error) => {
                    if (error) {
                        console.error("Zustand Hydration Error:", error);
                        useStore.setState({ isInitializingAuth: false });
                        return;
                    }

                    if (state) {
                        // We must load JWT asynchronously, but Zustand hydration is already "done" synchronously here.
                        // The AuthGuard will wait for `isInitializingAuth` to become false before routing.
                        getSecureJwt()
                            .then(token => {
                                if (token) {
                                    // VERY IMPORTANT: Use useStore.setState instead of state.setJwt 
                                    // if state.setJwt triggers other side-effects that might depend on fully rehydrated state.
                                    useStore.setState({ jwt: token, isInitializingAuth: false });
                                } else {
                                    useStore.setState({ isInitializingAuth: false });
                                }

                                // Check for widget toggles once hydration and auth are ready
                                useStore.getState().checkWidgetToggles().catch(console.error);
                            })
                            .catch(e => {
                                console.error("[Zustand] Secure Storage Error:", e);
                                useStore.setState({ isInitializingAuth: false });
                            });
                    } else {
                        useStore.setState({ isInitializingAuth: false });
                    }
                };
            }
        }
    )
);
