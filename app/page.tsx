'use client';
import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { calculateStreak, isCompletedToday } from '../utils/streak';
import Link from 'next/link';
import { Plus, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { AnimatePresence, motion } from 'framer-motion';
import SwipeableHabit from '../components/SwipeableHabit';
import NotificationOnboarding from '../components/NotificationOnboarding';
import BetaFeedback from '../components/BetaFeedback';
import BetaWelcomeModal from '../components/BetaWelcomeModal';
import { useTranslation } from '../hooks/useTranslation';

export default function Home() {
    const { habits, logs, toggleHabitLog, userName, removeHabit } = useStore();
    const { t } = useTranslation();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const now = new Date();
    const todayDayOfWeek = now.getDay();

    const allActiveHabits = habits.filter(h => h.isActive);
    const habitsForToday = allActiveHabits.filter(h => h.frequency ? h.frequency.includes(todayDayOfWeek) : true);
    const otherHabits = allActiveHabits.filter(h => h.frequency && !h.frequency.includes(todayDayOfWeek));

    const hour = now.getHours();

    let greeting = t.home.goodNight;
    if (hour >= 5 && hour < 12) greeting = t.home.goodMorning;
    else if (hour >= 12 && hour < 18) greeting = t.home.goodAfternoon;

    const dateStr = mounted ? format(now, "MMM do, yyyy", { locale: enUS }) : t.common.loading;

    // Framer Motion Variants for Stagger Effect
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2
            }
        }
    };

    return (
        <main className="min-h-[100dvh] bg-black text-white p-6 pb-24 font-sans flex flex-col items-center">
            <div className="w-full max-w-md pt-8">
                <motion.header
                    className="mb-14 flex justify-between items-start"
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, type: 'spring', bounce: 0.2 }}
                >
                    <div className="flex flex-col">
                        <span className="text-[12px] font-bold text-white/50 tracking-wider mb-2">
                            {t.home.dailyBrief} • {dateStr}
                        </span>
                        <h1 className="text-[2.2rem] leading-tight font-medium tracking-tight text-white whitespace-nowrap">
                            {greeting}
                        </h1>
                        <h2 className="text-[2.2rem] leading-tight font-medium tracking-tight text-white/50 truncate max-w-full">
                            {userName}
                        </h2>
                    </div>

                    <motion.div
                        className="flex gap-4 mt-6"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4, delay: 0.2, type: 'spring' }}
                    >
                        <Link href="/settings" className="text-white/60 hover:text-white transition-colors p-3 bg-white/5 rounded-full hover:bg-white/10 flex items-center justify-center active:scale-90">
                            <Settings size={20} />
                        </Link>
                        {allActiveHabits.length > 0 && (
                            <Link href="/habit/new" className="text-white/60 hover:text-white transition-colors p-3 bg-white/5 rounded-full hover:bg-white/10 flex items-center justify-center active:scale-90">
                                <Plus size={20} />
                            </Link>
                        )}
                    </motion.div>
                </motion.header>

                {allActiveHabits.length === 0 ? (
                    <motion.div
                        className="flex flex-col items-center justify-center mt-32 text-center"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 0.7, scale: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3, type: 'spring', bounce: 0.2 }}
                    >
                        <p className="text-lg mb-6">{t.home.emptyState}</p>
                        <Link
                            href="/habit/new"
                            className="bg-white text-black font-bold px-8 py-4 rounded-full flex items-center gap-2 hover:scale-105 active:scale-95 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                        >
                            <Plus size={20} />
                            {t.home.startHabit}
                        </Link>
                    </motion.div>
                ) : (
                    <motion.div className="space-y-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                        {habitsForToday.length > 0 && (
                            <div className="space-y-6">
                                <motion.h3
                                    className="text-[12px] font-bold text-white/50 tracking-wider uppercase mb-4"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.4, delay: 0.1 }}
                                >
                                    {t.home.forToday}
                                </motion.h3>
                                <motion.div
                                    variants={containerVariants}
                                    initial="hidden"
                                    animate="visible"
                                >
                                    <AnimatePresence mode="popLayout">
                                        {habitsForToday.map((habit) => {
                                            const habitLogs = logs.filter(l => l.habitId === habit.id);
                                            const streak = calculateStreak(habitLogs, habit.frequency);
                                            const doneToday = isCompletedToday(habitLogs);

                                            return (
                                                <SwipeableHabit
                                                    key={habit.id}
                                                    habit={habit}
                                                    streak={streak}
                                                    doneToday={doneToday}
                                                    onToggle={() => toggleHabitLog(habit.id)}
                                                    onDelete={() => removeHabit(habit.id)}
                                                />
                                            );
                                        })}
                                    </AnimatePresence>
                                </motion.div>
                            </div>
                        )}


                        {otherHabits.length > 0 && (
                            <div className="space-y-6">
                                <motion.h3
                                    className="text-[12px] font-bold text-white/30 tracking-wider uppercase mb-4"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.4, delay: 0.3 }}
                                >
                                    {t.home.otherDays}
                                </motion.h3>
                                <motion.div
                                    variants={containerVariants}
                                    initial="hidden"
                                    animate="visible"
                                >
                                    <AnimatePresence mode="popLayout">
                                        {otherHabits.map((habit) => {
                                            const habitLogs = logs.filter(l => l.habitId === habit.id);
                                            const streak = calculateStreak(habitLogs, habit.frequency);
                                            const doneToday = isCompletedToday(habitLogs);

                                            return (
                                                <motion.div
                                                    key={habit.id}
                                                    className="opacity-50 grayscale transition-opacity hover:opacity-100 hover:grayscale-0"
                                                    layout
                                                >
                                                    <SwipeableHabit
                                                        habit={habit}
                                                        streak={streak}
                                                        doneToday={doneToday}
                                                        onToggle={() => toggleHabitLog(habit.id)}
                                                        onDelete={() => removeHabit(habit.id)}
                                                    />
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                </motion.div>
                            </div>
                        )}
                    </motion.div>
                )}

                {habits.some(h => !h.isActive) && (
                    <div className="mt-8 text-center w-full">
                        <Link href="/trash" className="text-[10px] font-medium text-white/30 uppercase tracking-widest hover:text-white/60 transition-colors inline-block py-2 px-4 rounded-full border border-white/5 bg-white/5">
                            {t.home.viewTrash}
                        </Link>
                    </div>
                )}
            </div>

            <NotificationOnboarding />
            <BetaFeedback />
            <BetaWelcomeModal />
        </main>
    );
}