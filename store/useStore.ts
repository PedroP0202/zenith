import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Friend, FriendRequest, Habit, HabitFormValues, LogEntry } from '@/types';
import { encryptData, decryptData, saveSecureJwt, getSecureJwt, removeSecureJwt } from '@/utils/secureStorage';
import { Capacitor } from '@capacitor/core';
import { getLevelFromXp } from '@/utils/progression';
import { syncWidgetData } from '../utils/widgetSync';
import { scheduleAllNotifications, cancelAllNotifications } from '../utils/notifications';
import { Language, translations } from '../locales';
import { apiClient } from '@/services/apiClient';
import { authInitialState, type AuthSlice } from '@/store/slices/authSlice';
import { habitsInitialState, type HabitsSlice } from '@/store/slices/habitsSlice';
import { settingsInitialState, type SettingsSlice } from '@/store/slices/settingsSlice';
import { socialInitialState, type SocialSlice } from '@/store/slices/socialSlice';
import { syncInitialState, type SyncSlice } from '@/store/slices/syncSlice';
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

interface AppState extends AuthSlice, HabitsSlice, SettingsSlice, SocialSlice, SyncSlice {}

export const useStore = create<AppState>()(
    persist(
        (set, get) => ({
            ...authInitialState,
            ...habitsInitialState,
            ...settingsInitialState,
            ...socialInitialState,
            ...syncInitialState,

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
                set((state) => ({
                    optInLeaderboard: optedIn,
                    arenaPoints: optedIn ? state.arenaPoints : 0,
                }));
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
                    userName: '',
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
                    userName: '',
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
                    const pullData = await apiClient.get<{
                        habits: Habit[];
                        logs: LogEntry[];
                        timestamp: number;
                        user?: {
                            total_xp?: number;
                            level?: number;
                            arena_points?: number;
                            lastLoginRewardDate?: string | null;
                        };
                    }>(`/sync/pull?lastSyncedAt=${lastSyncedAt}`, { authToken: jwt });

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
                        await apiClient.post('/sync/push', {
                            lastSyncedAt: Date.now(),
                            habits: unsyncedHabits,
                            logs: unsyncedLogs,
                            deletedHabitIds,
                            deletedLogIds
                        }, { authToken: jwt });

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
                const { jwt, userName, language, optInLeaderboard, username, lastLoginRewardDate } = get();
                if (!jwt) return;

                try {
                    // IMPORTANT: total_xp, level, and arena_points are NOT sent here.
                    // They are authoritatively calculated by the server in /sync/pull.
                    // Only social/profile fields that the client controls are sent.
                    await apiClient.patch('/auth/profile', { name: userName, language, optInLeaderboard, username, lastLoginRewardDate }, { authToken: jwt });
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
                    const data = await apiClient.get<{ friends?: Friend[] }>('/friends', { authToken: jwt });
                    set({ friends: data.friends || [] });
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
                    const data = await apiClient.get<{
                        incoming?: FriendRequest[];
                        outgoing?: FriendRequest[];
                    }>('/friends/requests', { authToken: jwt });
                    set({
                        friendRequests: data.incoming || [],
                        outgoingRequests: data.outgoing || []
                    });
                } catch (e) {
                    console.error("[STORE] Failed to fetch requests:", e);
                }
            },

            sendFriendRequest: async (friendId: string) => {
                const { jwt } = get();
                if (!jwt) return { success: false, error: 'Not authenticated' };
                try {
                    await apiClient.post('/friends/request', { friendId }, { authToken: jwt });
                    return { success: true };
                } catch (e) {
                    return { success: false, error: e instanceof Error ? e.message : 'Network error' };
                }
            },

            handleFriendRequest: async (requestId: string, action: 'accept' | 'reject' | 'cancel') => {
                const { jwt } = get();
                if (!jwt) return;
                try {
                    await apiClient.patch(`/friends/request/${requestId}`, { action }, { authToken: jwt });
                    // Refresh both lists
                    get().fetchFriends();
                    get().fetchFriendRequests();
                } catch (e) {
                    console.error("[STORE] Failed to handle request:", e);
                }
            },

            removeFriend: async (friendId: string) => {
                const { jwt, friends } = get();
                if (!jwt) return { success: false, error: 'Not authenticated' };
                try {
                    await apiClient.delete(`/friends/${friendId}`, { authToken: jwt });
                    set({ friends: friends.filter(f => f.id !== friendId) });
                    return { success: true };
                } catch (e) {
                    return { success: false, error: e instanceof Error ? e.message : 'Network error' };
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
