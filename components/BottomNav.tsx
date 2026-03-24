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
        <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 glass rounded-full px-4 py-3 flex items-center gap-6 sm:gap-8 z-50 shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/5">
            {tabs.map((tab) => {
                const isActive = pathname === tab.href;
                const Icon = tab.icon;
                const isStats = tab.href === '/stats';

                return (
                    <Link
                        key={tab.href}
                        href={tab.href}
                        id={`nav-${tab.href.replace('/', '') || 'home'}`}
                        className="relative z-10 w-14 h-12 flex items-center justify-center transition-colors duration-300"
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
                                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-black" />
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
