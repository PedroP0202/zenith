'use client';
import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { useRouter, usePathname } from 'next/navigation';
import { App } from '@capacitor/app';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const { jwt, isInitializingAuth } = useStore();
    const router = useRouter();
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);

        const handleAppStateChange = async (state: { isActive: boolean }) => {
            if (state.isActive) {
                console.log("[AuthGuard] App became active, checking for widget toggles...");
                useStore.getState().checkWidgetToggles().catch(console.error);
            }
        };

        const listener = App.addListener('appStateChange', handleAppStateChange);

        return () => {
            listener.then(l => l.remove());
        };
    }, []);

    useEffect(() => {
        if (!mounted || isInitializingAuth) return;

        const isAuthRoute = pathname === '/login' || pathname === '/register';

        if (!jwt && !isAuthRoute) {
            router.replace('/login');
        } else if (jwt && isAuthRoute) {
            router.replace('/');
        }
    }, [jwt, pathname, mounted, router, isInitializingAuth]);

    if (!mounted || isInitializingAuth) return <div className="min-h-[100dvh] bg-black text-white" />;

    const isAuthRoute = pathname === '/login' || pathname === '/register';
    if (!jwt && !isAuthRoute) return <div className="min-h-[100dvh] bg-black text-white" />;

    return <>{children}</>;
}
