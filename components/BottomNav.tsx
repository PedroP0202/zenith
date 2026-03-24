'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, Plus, Users, BarChart2 } from 'lucide-react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';

const tabs = [
    { href: '/', icon: Home, label: 'Hoje' },
    { href: '/leaderboard', icon: Trophy, label: 'Arena' },
    { href: '/habit/new', icon: Plus, label: 'Novo', isAction: true },
    { href: '/friends', icon: Users, label: 'Social' },
    { href: '/stats', icon: BarChart2, label: 'Estatísticas' },
];

export default function BottomNav() {
    const pathname = usePathname();
    const { logs, friendRequests, fetchFriendRequests } = useStore();
    const prevLogCountRef = useRef(logs.length);
    const [showHighlight, setShowHighlight] = useState(false);
    const statsControls = useAnimation();

    useEffect(() => {
        fetchFriendRequests();
    }, [fetchFriendRequests]);

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

    if (pathname.includes('/habit/')) return null;

    return (
        <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 glass rounded-full px-4 py-3 flex items-center gap-4 sm:gap-6 z-50 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            {tabs.map((tab) => {
                const isActive = pathname === tab.href;
                const Icon = tab.icon;
                const isStats = tab.href === '/stats';

                if (tab.isAction) {
                    return (
                        <Link key={tab.href} href={tab.href} className="relative z-10 -mt-10" aria-label={tab.label}>
                            <motion.div 
                                className="w-14 h-14 bg-gradient-to-tr from-[var(--zenith-active)] to-orange-500 rounded-full flex flex-col items-center justify-center shadow-[0_4px_20px_rgba(234,179,8,0.5)] border-[3px] border-black text-black group"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.9 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                            >
                                <Icon size={26} className="text-black fill-black/10 group-hover:scale-110 transition-transform" />
                            </motion.div>
                        </Link>
                    )
                }

                return (
                    <Link
                        key={tab.href}
                        href={tab.href}
                        id={`nav-${tab.href.replace('/', '') || 'home'}`}
                        className="relative z-10 w-12 h-12 flex items-center justify-center transition-colors duration-300"
                        aria-label={tab.label}
                    >
                        {isActive && (
                            <motion.div
                                layoutId="nav-pill"
                                className="absolute inset-0 bg-white/10 rounded-full nav-pill-glow"
                                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                            />
                        )}
                        <motion.div
                            className="relative z-20"
                            animate={{
                                y: isActive ? -2 : 0,
                                color: isActive ? '#ffffff' : 'rgba(255,255,255,0.3)',
                            }}
                            whileTap={{ scale: 0.85 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        >
                            {isStats ? (
                                <motion.div animate={statsControls} className="relative">
                                    <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
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
                                    <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                                    {tab.href === '/friends' && friendRequests.length > 0 && (
                                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-[var(--zenith-active)] rounded-full shadow-[0_0_8px_var(--zenith-active)]" />
                                    )}
                                </div>
                            )}
                        </motion.div>
                    </Link>
                );
            })}
        </nav>
    );
}
