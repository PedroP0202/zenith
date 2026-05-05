export type SyncSlice = {
    lastSyncedAt: number;
    syncStatus: 'idle' | 'syncing' | 'error';
    syncWithCloud: () => Promise<void>;
    syncProfile: () => Promise<void>;
};

export const syncInitialState = {
    lastSyncedAt: 0,
    syncStatus: 'idle',
} satisfies Pick<SyncSlice, 'lastSyncedAt' | 'syncStatus'>;
