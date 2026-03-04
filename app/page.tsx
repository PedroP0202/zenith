'use client';
import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { calculateStreak, isCompletedToday } from '../utils/streak';
import Link from 'next/link';
import { Plus, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { AnimatePresence } from 'framer-motion';
import SwipeableHabit from '../components/SwipeableHabit';
import NotificationOnboarding from '../components/NotificationOnboarding';
import { useTranslation } from '../hooks/useTranslation';

export default function Home() {
    const { habits, logs, toggleHabitLog, userName, removeHabit } = useStore();
    const { t } = useTranslation();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const now = mounted ? new Date() : new Date(); // Fixed from hardcoded 2025-01-01
    const todayDayOfWeek = now.getDay();

    const allActiveHabits = habits.filter(h => h.isActive);
    const habitsForToday = allActiveHabits.filter(h => h.frequency ? h.frequency.includes(todayDayOfWeek) : true);
    const otherHabits = allActiveHabits.filter(h => h.frequency && !h.frequency.includes(todayDayOfWeek));

    const hour = now.getHours();

    let greeting = t.home.goodNight;
    if (hour >= 5 && hour < 12) greeting = t.home.goodMorning;
    else if (hour >= 12 && hour < 18) greeting = t.home.goodAfternoon;

    const dateStr = mounted ? format(now, "MMM do, yyyy", { locale: enUS }) : t.common.loading;

    return (
        <main className="min-h-[100dvh] bg-black text-white p-6 pb-24 font-sans flex flex-col items-center">
            <div className="w-full max-w-md pt-8">
                <header className="mb-14 flex justify-between items-start">
                    <div className={`flex flex-col transition-opacity duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
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

                    <div className="flex gap-4 mt-6">
                        <Link href="/settings" className="text-white/60 hover:text-white transition-colors p-3 bg-white/5 rounded-full hover:bg-white/10 flex items-center justify-center">
                            <Settings size={20} />
                        </Link>
                        {allActiveHabits.length > 0 && (
                            <Link href="/habit/new" className="text-white/60 hover:text-white transition-colors p-3 bg-white/5 rounded-full hover:bg-white/10 flex items-center justify-center">
                                <Plus size={20} />
                            </Link>
                        )}
                    </div>
                </header>

                {allActiveHabits.length === 0 ? (
                    <div className="flex flex-col items-center justify-center mt-32 text-center opacity-70">
                        <p className="text-lg mb-6">{t.home.emptyState}</p>
                        <Link
                            href="/habit/new"
                            className="bg-white text-black font-bold px-8 py-4 rounded-full flex items-center gap-2 hover:scale-105 active:scale-95 transition-transform"
                        >
                            <Plus size={20} />
                            {t.home.startHabit}
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-10">
                        {habitsForToday.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="text-[12px] font-bold text-white/50 tracking-wider uppercase mb-4">{t.home.forToday}</h3>
                                <AnimatePresence>
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
                            </div>
                        )}

                        {otherHabits.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="text-[12px] font-bold text-white/30 tracking-wider uppercase mb-4">{t.home.otherDays}</h3>
                                <AnimatePresence>
                                    {otherHabits.map((habit) => {
                                        const habitLogs = logs.filter(l => l.habitId === habit.id);
                                        const streak = calculateStreak(habitLogs, habit.frequency);
                                        const doneToday = isCompletedToday(habitLogs);

                                        return (
                                            <div key={habit.id} className="opacity-50 grayscale transition-opacity hover:opacity-100 hover:grayscale-0">
                                                <SwipeableHabit
                                                    habit={habit}
                                                    streak={streak}
                                                    doneToday={doneToday}
                                                    onToggle={() => toggleHabitLog(habit.id)}
                                                    onDelete={() => removeHabit(habit.id)}
                                                />
                                            </div>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
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
        </main>
    );
}