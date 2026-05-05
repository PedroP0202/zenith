import type { Language } from '@/locales';

export type SettingsSlice = {
    language: Language;
    isMorningReminderActive: boolean;
    morningReminderTime: string;
    hasPromptedForNotifications: boolean;
    optInLeaderboard: boolean;
    setLanguage: (language: Language) => void;
    setMorningReminder: (isActive: boolean) => void;
    setMorningReminderTime: (time: string) => void;
    setHasPromptedForNotifications: (prompted: boolean) => void;
    setOptInLeaderboard: (optedIn: boolean) => void;
};

export const settingsInitialState = {
    language: 'pt',
    isMorningReminderActive: false,
    morningReminderTime: '09:00',
    hasPromptedForNotifications: false,
    optInLeaderboard: false,
} satisfies Pick<SettingsSlice, 'language' | 'isMorningReminderActive' | 'morningReminderTime' | 'hasPromptedForNotifications' | 'optInLeaderboard'>;
