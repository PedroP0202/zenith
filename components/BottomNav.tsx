'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BarChart2, Users } from 'lucide-react';
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

    const activeIndex = tabs.findIndex(t => t.href === pathname);

    return (
        <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 glass rounded-full px-6 py-4 flex items-center gap-8 z-50 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            {/* Sliding active pill indicator */}
            <AnimatePresence>
                {activeIndex !== -1 && (
                    <motion.div
                        key={activeIndex}
                        layoutId="nav-pill"
                        className="absolute bg-white/10 rounded-full nav-pill-glow"
                        style={{
                            width: 44,
                            height: 44,
                            left: 14 + (activeIndex * 56),
                        }}
                        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                    />
                )}
            </AnimatePresence>

            {tabs.map((tab, i) => {
                const isActive = pathname === tab.href;
                const Icon = tab.icon;
                const isStats = tab.href === '/stats';

                return (
                    <Link
                        key={tab.href}
                        href={tab.href}
                        id={`nav-${tab.href.replace('/', '') || 'home'}`}
                        className="relative z-10 transition-colors duration-300"
                        aria-label={tab.label}
                    >
                        <motion.div
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
