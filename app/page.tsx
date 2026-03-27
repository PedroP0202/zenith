'use client';
import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { calculateStreak, isCompletedToday } from '../utils/streak';
import Link from 'next/link';
import { Plus, Settings, Trophy, User } from 'lucide-react';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { AnimatePresence, motion } from 'framer-motion';
import SwipeableHabit from '../components/SwipeableHabit';
import NotificationOnboarding from '../components/NotificationOnboarding';
import BetaFeedback from '../components/BetaFeedback';
import BetaWelcomeModal from '../components/BetaWelcomeModal';
import { useTranslation } from '../hooks/useTranslation';
import Skeleton from '../components/Skeleton';

export default function Home() {
    const { 
        habits, 
        logs, 
        toggleHabitLog, 
        userName, 
        removeHabit, 
        checkDailyReward, 
        showDailyRewardToast, 
        dismissDailyRewardToast 
    } = useStore();
    const { t } = useTranslation();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Check for daily login reward on app open
        checkDailyReward();
    }, [checkDailyReward]);

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

    // Gamification Logic
    let completedTodayCount = 0;
    habitsForToday.forEach(habit => {
        const habitLogs = logs.filter(l => l.habitId === habit.id);
        if (isCompletedToday(habitLogs)) completedTodayCount++;
    });
    const todayCompletionPercentage = habitsForToday.length > 0 ? (completedTodayCount / habitsForToday.length) * 100 : 0;
    const currentComboMultiplier = completedTodayCount + 1;

    const totalCompletions = logs.length;
    let userRank = "Initiate";
    if (totalCompletions >= 365) userRank = "Zenith";
    else if (totalCompletions >= 100) userRank = "Ascendant";
    else if (totalCompletions >= 30) userRank = "Seeker";
    else if (totalCompletions >= 7) userRank = "Voyager";

    const orbY = 100 - (todayCompletionPercentage * 0.8); // 100% to 20% from top
    const orbOpacity = 0.05 + (todayCompletionPercentage / 100) * 0.25;

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
        <main className="min-h-[100dvh] bg-black text-white p-6 pb-24 font-sans flex flex-col items-center overflow-x-hidden relative">
            {mounted && (
                <motion.div 
                    className="pointer-events-none fixed left-1/2 -translate-x-1/2 w-[120vw] md:w-[600px] h-[600px] rounded-full blur-[120px] z-0 transition-all duration-1000 ease-out"
                    style={{
                        top: `${orbY}%`,
                        opacity: orbOpacity,
                        backgroundColor: todayCompletionPercentage === 100 ? '#eab308' : '#ffffff'
                    }}
                    animate={todayCompletionPercentage === 100 ? { scale: [1, 1.05, 1], opacity: [orbOpacity, orbOpacity + 0.1, orbOpacity] } : {}}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                />
            )}
            
            <div className="w-full max-w-md pt-8 relative z-10">
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
                        {mounted && (
                            <motion.div 
                                className="flex items-center gap-2 mt-2"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3 }}
                            >
                                <div className={`w-1.5 h-1.5 rounded-full ${totalCompletions >= 365 ? 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.8)]' : 'bg-white/30'}`} />
                                <span className={`text-[11px] font-bold tracking-[0.2em] uppercase ${totalCompletions >= 365 ? 'text-yellow-500/90' : 'text-white/40'}`}>
                                    {userRank}
                                </span>
                            </motion.div>
                        )}
                    </div>

                    <motion.div
                        className="mt-2"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4, delay: 0.2, type: 'spring' }}
                    >
                        <div className="flex items-center bg-white/5 border border-white/5 backdrop-blur-md rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.2)] p-1 gap-1">
                            <Link id="top-leaderboard" href="/leaderboard" className="w-10 h-10 flex items-center justify-center text-white/50 hover:text-[#eab308] transition-all rounded-full hover:bg-white/10 active:scale-95" aria-label="Leaderboard">
                                <Trophy size={18} />
                            </Link>
                            <div className="w-[1px] h-4 bg-white/10 mx-1" />
                            <Link id="top-profile" href="/profile" className="w-10 h-10 flex items-center justify-center text-white/50 hover:text-white transition-all rounded-full hover:bg-white/10 active:scale-95" aria-label="Profile">
                                <User size={18} />
                            </Link>
                        </div>
                    </motion.div>
                </motion.header>

                {!mounted ? (
                    <div className="space-y-10">
                        <div className="space-y-6">
                            <Skeleton className="h-4 w-24 mb-4 opacity-50" />
                            <div className="space-y-4">
                                <Skeleton className="h-24 w-full" />
                                <Skeleton className="h-24 w-full opacity-60" />
                                <Skeleton className="h-24 w-full opacity-40" />
                            </div>
                        </div>
                    </div>
                ) : allActiveHabits.length === 0 ? (
                    <motion.div
                        className="flex flex-col items-center justify-center mt-32 text-center"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 0.7, scale: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3, type: 'spring', bounce: 0.2 }}
                    >
                        <p className="text-lg mb-6">{t.home.emptyState}</p>
                            <Link
                                id="add-habit-empty"
                                href="/habit/new"
                                className="bg-white text-black font-bold px-8 py-4 rounded-full flex items-center gap-2 transition-all hover:-translate-y-0.5 active:scale-95 shadow-glow-white hover:shadow-[0_0_25px_rgba(255,255,255,0.25)]"
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
                                                    comboMultiplier={currentComboMultiplier}
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
                        <Link id="view-trash" href="/trash" className="text-[10px] font-medium text-white/30 uppercase tracking-widest hover:text-white/60 transition-colors inline-block py-2 px-4 rounded-full border border-white/[0.05] bg-white/[0.02] backdrop-blur-md">
                            {t.home.viewTrash}
                        </Link>
                    </div>
                )}
            </div>

            <NotificationOnboarding />
            <BetaFeedback />
            <BetaWelcomeModal />

            {/* Minimalist FAB for Adding Habits */}
            {allActiveHabits.length > 0 && mounted && (
                <motion.div
                    className="fixed bottom-28 right-6 z-40 lg:right-10"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25, delay: 0.5 }}
                >
                    <Link
                        href="/habit/new"
                        className="w-14 h-14 bg-gradient-to-tr from-[var(--zenith-active)] to-orange-500 rounded-full flex flex-col items-center justify-center shadow-[0_4px_20px_rgba(234,179,8,0.5)] border-[3px] border-black text-black group hover:scale-105 transition-transform"
                        aria-label="Add Habit"
                    >
                        <Plus size={26} className="text-black fill-black/10 group-hover:scale-110 transition-transform" />
                    </Link>
                </motion.div>
            )}
        </main>
    );
}