import { pt } from './pt';
import { en } from './en';

export const translations = {
    pt,
    en
};

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof pt;
