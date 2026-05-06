'use client';

import React, { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';

export default function DailyRewardToast() {
    const { showDailyRewardToast, dismissDailyRewardToast } = useStore();

    useEffect(() => {
        if (showDailyRewardToast) {
            const timer = setTimeout(() => {
                dismissDailyRewardToast();
            }, 5000); // 5 seconds auto-dismiss
            return () => clearTimeout(timer);
        }
    }, [showDailyRewardToast, dismissDailyRewardToast]);

    return (
        <AnimatePresence>
            {showDailyRewardToast && (
                <motion.div
                    className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-xs pointer-events-auto"
                    initial={{ opacity: 0, y: -50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.9 }}
                >
                    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#0d0d0f]/95 p-4 shadow-[0_12px_28px_rgba(0,0,0,0.28)] backdrop-blur-xl">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06]">
                                <Sparkles size={18} className="text-white/75" />
                            </div>
                            <div className="flex flex-col text-left">
                                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">Daily Zen</span>
                                <span className="text-sm font-semibold text-white">+5 Zenith Points</span>
                            </div>
                        </div>
                        <button 
                            onClick={dismissDailyRewardToast}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                        >
                            <X size={14} className="text-white/40" />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
