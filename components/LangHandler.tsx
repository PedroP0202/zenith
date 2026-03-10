'use client';
import { useStore } from '../store/useStore';
import { useEffect } from 'react';

export default function LangHandler() {
    const { language } = useStore();

    useEffect(() => {
        document.documentElement.lang = language;
    }, [language]);

    return null;
}
