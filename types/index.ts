/**
 * Represents a single habit within the Zenith application.
 */
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
    /** Timestamp of when this log was last synced with the Cloudflare backend. */
    syncedAt?: number;
}
