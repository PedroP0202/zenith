/**
 * Represents a single habit within the Zenith application.
 */
export type HabitScheduleType = 'specific_days' | 'times_per_week';
export type HabitGoalType = 'complete' | 'count';

export interface Habit {
    /** Unique identifier for the habit (UUID). */
    id: string;
    /** The title or name of the habit (e.g., "Read 10 Pages"). */
    title: string;
    /** Timestamp of when the habit was created (in milliseconds). */
    createdAt: number;
    /** Timestamp of when the habit was last updated locally. */
    updatedAt?: number;
    /** Timestamp of when the habit was last successfully synced to the cloud. */
    syncedAt?: number;
    /** Indicates whether the habit is currently active or soft-deleted. */
    isActive: boolean;
    /** Defines the active days of the week for this habit (0 = Sunday, 1 = Monday, etc.). */
    frequency: number[];
    /** Determines whether the habit runs on specific weekdays or as a weekly quota. */
    scheduleType?: HabitScheduleType;
    /** Weekly quota target when `scheduleType` is `times_per_week`. */
    weeklyTarget?: number;
    /** Determines whether a habit is binary or quantitative. */
    goalType?: HabitGoalType;
    /** Numeric target for quantitative habits (e.g. 3 glasses). */
    targetValue?: number;
    /** Optional short unit label shown in the UI (e.g. "copos", "km"). */
    unitLabel?: string;
    /** 
     * If true, this habit runs in 'Hard Mode', preventing retroactive check-ins.
     * If false or undefined, it runs in 'Normal Mode' where past days can be corrected.
     */
    isHardMode?: boolean;
    /** Optional timestamp indicating when the habit was soft-deleted. */
    deletedAt?: number;
    /** Optional specific time of day to trigger a notification, in 'HH:mm' format. */
    reminderTime?: string;
}

/**
 * Represents a single completion event for a particular habit.
 */
export interface LogEntry {
    /** Unique identifier for the log entry (UUID). */
    id: string;
    /** The ID of the habit this log entry belongs to. */
    habitId: string;
    /** Timestamp of when the habit was marked as completed (in milliseconds). */
    completedAt: number;
    /** Optional numeric progress value for quantitative logs. Defaults to 1. */
    value?: number;
    /** Timestamp of when this log was last synced with the Cloudflare backend. */
    syncedAt?: number;
}

export interface HabitFormValues {
    title: string;
    frequency: number[];
    scheduleType: HabitScheduleType;
    weeklyTarget?: number;
    goalType: HabitGoalType;
    targetValue?: number;
    unitLabel?: string;
    isHardMode: boolean;
    reminderTime?: string;
}

/**
 * Basic public user information used across social features.
 */
export interface PublicUser {
    id: string;
    name: string;
    username: string;
}

/**
 * Friend list entry with an optional aggregate score.
 */
export interface Friend extends PublicUser {
    score?: number;
}

/**
 * Friend request row (incoming/outgoing).
 */
export interface FriendRequest extends PublicUser {
    id: string;
    created_at: number;
    from_id?: string;
    to_id?: string;
}

/**
 * Search result item for users.
 */
export interface UserSearchResult extends PublicUser {}

/**
 * Arena reward/season history entry.
 */
export interface ArenaReward {
    id?: string;
    season_id: number | string;
    rank_name: string;
    position: number | null;
    created_at?: number;
    season_name?: string;
    season_start_at?: number;
    season_end_at?: number;
}

/**
 * Blocked user row returned by /friends/blocked.
 */
export interface BlockedUser extends PublicUser {
    friendship_id?: string;
}

/**
 * Friend comparison payload row.
 */
export interface FriendComparisonHabit {
    id: string;
    title: string;
    completions: number;
}

export interface FriendComparisonProfile {
    name: string;
    username: string;
    habits: FriendComparisonHabit[];
}

/**
 * Detailed profile payload for /users/:username/profile.
 */
export interface FriendProfileStats {
    totalCompletions: number;
    weeklyCompletions: number;
    activeWeekdays: number[];
    activeHabitsCount: number;
}

export interface FriendProfileUser extends PublicUser {
    level: number;
    totalXp: number;
}

export interface FriendProfileData {
    user: FriendProfileUser;
    arenaHistory: ArenaReward[];
    stats: FriendProfileStats;
    unlockedTrophies: string[];
}
