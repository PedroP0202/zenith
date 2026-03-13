'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BarChart2 } from 'lucide-react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';

export default function BottomNav() {
    const pathname = usePathname();
    const { logs } = useStore();
    const [lastLogCount, setLastLogCount] = useState(logs.length);
    const [showHighlight, setShowHighlight] = useState(false);
    const statsControls = useAnimation();

    useEffect(() => {
        // Initial load set count
        if (lastLogCount === undefined) {
             setLastLogCount(logs.length);
             return;
        }

        // Only trigger highlight if a new log was ADDED
        if (logs.length > lastLogCount) {
            setShowHighlight(true);
            statsControls.start({
                scale: [1, 1.4, 1],
                color: ['#ffffff4d', '#ffffff', '#ffffff4d'],
                transition: { duration: 0.6, times: [0, 0.5, 1], ease: 'backOut' }
            });
            
            // Turn off highlight after animation
            const timer = setTimeout(() => setShowHighlight(false), 2000);
            return () => clearTimeout(timer);
        }
        
        setLastLogCount(logs.length);
    }, [logs.length, lastLogCount, statsControls]);

    // Hide on detail or creation pages to keep them focused
    if (pathname.includes('/habit/')) return null;

    return (
        <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#111111]/90 backdrop-blur-md border border-white/10 rounded-full px-6 py-4 flex items-center gap-8 z-50">
            <Link
                href="/"
                className={`transition-colors duration-300 ${pathname === '/' ? 'text-white' : 'text-white/30 hover:text-white/60'}`}
                aria-label="Hoje"
            >
                <Home size={24} strokeWidth={pathname === '/' ? 2.5 : 2} />
            </Link>

            <Link
                href="/stats"
                className={`relative transition-colors duration-300 ${pathname === '/stats' ? 'text-white' : 'text-white/30 hover:text-white/60'}`}
                aria-label="Estatísticas"
            >
                <motion.div animate={statsControls}>
                    <BarChart2 size={24} strokeWidth={pathname === '/stats' ? 2.5 : 2} />
                </motion.div>
                
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
            </Link>
        </nav>
    );
}
