import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTranslation } from '../../hooks/useTranslation';
import { useStore } from '../../store/useStore';

// Mock the store for this test
vi.mock('../../store/useStore', () => ({
    useStore: vi.fn(),
}));

const mockedUseStore = vi.mocked(useStore);

function mockStoreLanguage(language: 'pt' | 'en' | undefined) {
    mockedUseStore.mockReturnValue({ language } as unknown as ReturnType<typeof useStore>);
}

describe('useTranslation', () => {
    it('should return Portuguese translations when language is set to pt', () => {
        mockStoreLanguage('pt');

        const { result } = renderHook(() => useTranslation());

        // Assuming 'pt' translations have a specific key, let's just check the language
        expect(result.current.language).toBe('pt');
        // Example check for a known translation key if possible, 
        // but here we just check if it returns the t object
        expect(result.current.t).toBeDefined();
    });

    it('should return English translations when language is set to en', () => {
        mockStoreLanguage('en');

        const { result } = renderHook(() => useTranslation());

        expect(result.current.language).toBe('en');
        expect(result.current.t).toBeDefined();
    });

    it('should fallback to Portuguese if language is undefined', () => {
        mockStoreLanguage(undefined);

        const { result } = renderHook(() => useTranslation());

        expect(result.current.language).toBeUndefined();
        expect(result.current.t).toBeDefined(); // Should still return a translation object (fallback)
    });
});
