'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, BarChart2 } from 'lucide-react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';

const tabs = [
    { href: '/', icon: Home, label: 'Hoje' },
    { href: '/friends', icon: Users, label: 'Social' },
    { href: '/stats', icon: BarChart2, label: 'Estatísticas' },
];

export default function BottomNav() {
    const pathname = usePathname();
    const { jwt, logs, friendRequests, fetchFriendRequests } = useStore();
    const prevLogCountRef = useRef(logs.length);
    const [showHighlight, setShowHighlight] = useState(false);
    const statsControls = useAnimation();

    useEffect(() => {
        if (jwt) fetchFriendRequests();
    }, [fetchFriendRequests, jwt]);

    useEffect(() => {
        const currentCount = logs.length;
        if (currentCount > prevLogCountRef.current) {
            setShowHighlight(true);
            statsControls.start({
                scale: [1, 1.3, 1],
                transition: { duration: 0.5, times: [0, 0.4, 1], ease: 'backOut' }
            });
            const timer = setTimeout(() => setShowHighlight(false), 2000);
            prevLogCountRef.current = currentCount;
            return () => clearTimeout(timer);
        }
        prevLogCountRef.current = currentCount;
    }, [logs.length, statsControls]);

    if (!jwt) return null;

    const isAuthRoute = 
        pathname.startsWith('/login') || 
        pathname.startsWith('/register') || 
        pathname.startsWith('/forgot-password') ||
        pathname.startsWith('/admin');

    if (pathname.includes('/habit/') || isAuthRoute) return null;

    return (
        <nav
            className="fixed left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-[2rem] border border-white/10 bg-[rgba(10,10,10,0.86)] p-2 shadow-[0_24px_48px_rgba(0,0,0,0.42)] backdrop-blur-2xl"
            style={{
                bottom: 'calc(0.75rem + var(--zenith-safe-bottom))',
                width: 'min(var(--zenith-app-width), calc(100vw - (var(--zenith-safe-x) * 2)))',
            }}
        >
            {tabs.map((tab) => {
                const isActive = pathname === tab.href;
                const Icon = tab.icon;
                const isStats = tab.href === '/stats';

                return (
                    <Link
                        key={tab.href}
                        href={tab.href}
                        id={`nav-${tab.href.replace('/', '') || 'home'}`}
                        className="relative z-10 flex min-h-[3.5rem] flex-1 items-center justify-center rounded-[1.35rem] px-3 py-2 transition-colors duration-300"
                        aria-label={tab.label}
                    >
                        {isActive && (
                            <motion.div
                                layoutId="nav-pill"
                                className="absolute inset-0 rounded-[1.35rem] bg-white/[0.08] ring-1 ring-white/10 nav-pill-glow"
                                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                            />
                        )}
                        <motion.div
                            className="relative z-20 flex flex-col items-center gap-1"
                            animate={{
                                y: isActive ? -2 : 0,
                                color: isActive ? '#ffffff' : 'rgba(255,255,255,0.3)',
                            }}
                            whileTap={{ scale: 0.85 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        >
                            {isStats ? (
                                <motion.div animate={statsControls} className="relative">
                                    <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                                    <AnimatePresence>
                                        {showHighlight && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.5 }}
                                                animate={{ opacity: [0, 1, 0], scale: [0.5, 2, 3] }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 1, ease: "easeOut" }}
                                                className="absolute inset-0 bg-white/30 rounded-full -z-10 blur-sm"
                                            />
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            ) : (
                                <div className="relative">
                                    <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                                    {tab.href === '/friends' && friendRequests.length > 0 && (
                                        <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-[#0b0b0c] bg-red-500" />
                                    )}
                                </div>
                            )}
                            <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">
                                {tab.label}
                            </span>
                        </motion.div>
                    </Link>
                );
            })}
        </nav>
    );
}
