'use client';
import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { useRouter, usePathname } from 'next/navigation';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const { jwt } = useStore();
    const router = useRouter();
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;

        const isAuthRoute = pathname === '/login' || pathname === '/register';

        if (!jwt && !isAuthRoute) {
            router.replace('/login');
        } else if (jwt && isAuthRoute) {
            router.replace('/');
        }
    }, [jwt, pathname, mounted, router]);

    if (!mounted) return <div className="min-h-[100dvh] bg-black text-white" />;

    const isAuthRoute = pathname === '/login' || pathname === '/register';
    if (!jwt && !isAuthRoute) return <div className="min-h-[100dvh] bg-black text-white" />;

    return <>{children}</>;
}
