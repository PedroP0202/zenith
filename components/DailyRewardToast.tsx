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
                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-4 rounded-[2.5rem] shadow-2xl flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 to-orange-500 flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.4)]">
                                <Sparkles size={20} className="text-black" />
                            </div>
                            <div className="flex flex-col text-left">
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Daily Zen</span>
                                <span className="text-sm font-bold text-white">+5 Zenith Points</span>
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
