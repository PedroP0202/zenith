import { useStore } from '../store/useStore';
import { translations, TranslationKey } from '../locales';

export function useTranslation() {
    const { language } = useStore();

    // Fallback to Portuguese if somehow language is invalid
    const t = translations[language] || translations.pt;

    return { t, language };
}
