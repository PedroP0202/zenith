export type AuthSessionSnapshot = {
    name?: string;
    username?: string | null;
    language?: string;
    total_xp?: number;
    level?: number;
    lastLoginRewardDate?: string | null;
    optInLeaderboard?: boolean;
    arena_points?: number;
};

export type AuthSlice = {
    userName: string;
    username: string | null;
    jwt: string | null;
    isInitializingAuth: boolean;
    hasCompletedOnboarding: boolean;
    totalXP: number;
    arenaPoints: number;
    level: number;
    lastLoginRewardDate: string | null;
    showDailyRewardToast: boolean;
    setUserName: (name: string) => void;
    setUsername: (username: string) => Promise<void>;
    setJwt: (token: string | null) => void;
    clearUserData: () => void;
    logout: () => void;
    setHasCompletedOnboarding: (completed: boolean) => void;
    checkDailyReward: () => void;
    dismissDailyRewardToast: () => void;
    restoreUserSession: (data: AuthSessionSnapshot) => void;
};

export const authInitialState = {
    userName: 'Pedro',
    username: null,
    jwt: null,
    isInitializingAuth: true,
    hasCompletedOnboarding: false,
    totalXP: 0,
    arenaPoints: 0,
    level: 1,
    lastLoginRewardDate: null,
    showDailyRewardToast: false,
} satisfies Pick<AuthSlice, 'userName' | 'username' | 'jwt' | 'isInitializingAuth' | 'hasCompletedOnboarding' | 'totalXP' | 'arenaPoints' | 'level' | 'lastLoginRewardDate' | 'showDailyRewardToast'>;
