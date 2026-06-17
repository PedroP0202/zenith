'use client';
import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { calculateStreak } from '../utils/streak';
import Link from 'next/link';
import { CheckCircle2, Flame, Plus, Target, Trophy, User } from 'lucide-react';
import { format } from 'date-fns';
import { enUS, pt } from 'date-fns/locale';
import { AnimatePresence, motion } from 'framer-motion';
import SwipeableHabit from '../components/SwipeableHabit';
import NotificationOnboarding from '../components/NotificationOnboarding';
import BetaFeedback from '../components/BetaFeedback';
import BetaWelcomeModal from '../components/BetaWelcomeModal';
import { useTranslation } from '../hooks/useTranslation';
import Skeleton from '../components/Skeleton';
import { getRankForLevel } from '../utils/progression';
import Logo from '../components/Logo';
import { getHabitGoalType, getHabitPeriodTarget, getHabitProgressForDate, getHabitScheduleType, getHabitUnitLabel, isHabitCompleteForDate } from '../utils/habits';

export default function Home() {
    const { 
        habits, 
        logs, 
        toggleHabitLog,
        incrementHabitProgress,
        decrementHabitProgress,
        userName, 
        removeHabit, 
        checkDailyReward, 
        level 
    } = useStore();
    const { t, language } = useTranslation();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Check for daily login reward on app open
        checkDailyReward();
    }, [checkDailyReward]);

    const now = new Date();
    const todayDayOfWeek = now.getDay();
    const allActiveHabits = useMemo(() => habits.filter(h => h.isActive), [habits]);
    const habitsForToday = useMemo(
        () => allActiveHabits.filter((habit) => getHabitScheduleType(habit) === 'times_per_week' || habit.frequency.includes(todayDayOfWeek)),
        [allActiveHabits, todayDayOfWeek]
    );
    const otherHabits = useMemo(
        () => allActiveHabits.filter((habit) => getHabitScheduleType(habit) === 'specific_days' && !habit.frequency.includes(todayDayOfWeek)),
        [allActiveHabits, todayDayOfWeek]
    );

    const logsByHabit = useMemo(() => {
        const map: Record<string, typeof logs> = {};
        logs.forEach((log) => {
            if (!map[log.habitId]) map[log.habitId] = [];
            map[log.habitId].push(log);
        });
        return map;
    }, [logs]);

    const hour = now.getHours();

    let greeting = t.home.goodNight;
    if (hour >= 5 && hour < 12) greeting = t.home.goodMorning;
    else if (hour >= 12 && hour < 18) greeting = t.home.goodAfternoon;

    const locale = language === 'pt' ? pt : enUS;
    const dateStr = mounted ? format(now, 'PP', { locale }) : t.common.loading;

    const buildProgressLabel = (habit: typeof allActiveHabits[number], progressValue: number, targetValue: number, isComplete: boolean) => {
        if (getHabitScheduleType(habit) === 'times_per_week') {
            return `${progressValue}/${targetValue} ${t.habit.weeklyGoalSuffix}`;
        }

        if (getHabitGoalType(habit) === 'count') {
            const unit = getHabitUnitLabel(habit);
            return `${progressValue}/${targetValue}${unit ? ` ${unit}` : ''}`;
        }

        return isComplete ? t.common.today : '0/1';
    };

    const todayHabitCards = habitsForToday.map((habit) => {
        const habitLogs = logsByHabit[habit.id] || [];
        const streak = calculateStreak(habitLogs, habit);
        const progressValue = getHabitProgressForDate(habitLogs, habit, now);
        const targetValue = getHabitPeriodTarget(habit);
        const isComplete = isHabitCompleteForDate(habitLogs, habit, now);

        return {
            habit,
            streak,
            progressValue,
            targetValue,
            isComplete,
            progressLabel: buildProgressLabel(habit, progressValue, targetValue, isComplete),
        };
    });

    const otherHabitCards = otherHabits.map((habit) => {
        const habitLogs = logsByHabit[habit.id] || [];
        const streak = calculateStreak(habitLogs, habit);
        const progressValue = getHabitProgressForDate(habitLogs, habit, now);
        const targetValue = getHabitPeriodTarget(habit);
        const isComplete = isHabitCompleteForDate(habitLogs, habit, now);

        return {
            habit,
            streak,
            progressValue,
            targetValue,
            isComplete,
            progressLabel: buildProgressLabel(habit, progressValue, targetValue, isComplete),
        };
    });

    const completedTodayCount = todayHabitCards.filter((item) => item.isComplete).length;
    const todayCompletionPercentage = todayHabitCards.length > 0 ? (completedTodayCount / todayHabitCards.length) * 100 : 0;
    const currentComboMultiplier = completedTodayCount + 1;
    const bestStreakOverall = useMemo(
        () =>
            allActiveHabits.reduce((best, habit) => {
                const streak = calculateStreak(logsByHabit[habit.id] || [], habit);
                return Math.max(best, streak);
            }, 0),
        [allActiveHabits, logsByHabit]
    );

    const currentRank = getRankForLevel(level);
    const userRank = currentRank.name;

    const roundedCompletion = Math.round(todayCompletionPercentage);
    const heroMessage =
        todayHabitCards.length === 0
            ? t.home.restDayDesc
            : completedTodayCount === todayHabitCards.length
                ? t.home.allCaughtUp
                : t.home.keepMomentum;
    const heroStatLabel = todayHabitCards.length > 0 ? `${completedTodayCount}/${todayHabitCards.length}` : `0 ${t.home.scheduled}`;

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
    const summaryCards = [
        {
            label: t.home.scheduled,
            value: todayHabitCards.length,
            icon: Target,
        },
        {
            label: t.home.done,
            value: completedTodayCount,
            icon: CheckCircle2,
        },
        {
            label: t.home.bestRun,
            value: bestStreakOverall,
            icon: Flame,
        },
    ];

    return (
        <main className="app-page relative min-h-[100dvh] overflow-x-hidden text-white">
            <div className="app-main-spacing relative z-10">
                <div className="app-shell">
                <motion.header
                    className="mb-6"
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, type: 'spring', bounce: 0.2 }}
                >
                    <div className="space-y-5">
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                                <div className="inline-flex items-center gap-3 rounded-full border border-white/8 bg-white/[0.025] px-3.5 py-2">
                                    <Logo className="text-lg text-white/70" />
                                    <div className="h-3 w-px bg-white/15" />
                                    <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/45">
                                        {t.home.dailyBrief}{mounted ? ` • ${dateStr}` : ''}
                                    </span>
                                </div>

                                <div className="mt-5">
                                    <h1 className="text-[clamp(2.2rem,9vw,3.4rem)] font-semibold leading-[0.96] text-white">
                                        {greeting}
                                    </h1>
                                    <h2 className="mt-1 max-w-[14ch] text-[clamp(1.25rem,4vw,1.8rem)] font-medium leading-tight text-white/55 sm:max-w-none">
                                        {userName}
                                    </h2>
                                    {mounted && (
                                        <motion.div 
                                            className="mt-4 flex items-center gap-2"
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.4 }}
                                        >
                                            <div className="h-1.5 w-1.5 rounded-full bg-[var(--zenith-active)]" />
                                            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55">
                                                {userRank}
                                            </span>
                                        </motion.div>
                                    )}
                                </div>
                            </div>

                            <motion.div
                                className="mt-1"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.4, delay: 0.2, type: 'spring' }}
                            >
                                <div className="app-card-soft flex items-center gap-1 rounded-2xl p-1">
                                    <Link id="top-leaderboard" href="/leaderboard" className="flex h-10 w-10 items-center justify-center rounded-xl text-white/50 transition-colors hover:bg-white/8 hover:text-white" aria-label="Leaderboard">
                                        <Trophy size={18} />
                                    </Link>
                                    <div className="mx-1 h-4 w-px bg-white/10" />
                                    <Link id="top-profile" href="/profile" className="flex h-10 w-10 items-center justify-center rounded-xl text-white/50 transition-colors hover:bg-white/8 hover:text-white" aria-label="Profile">
                                        <User size={18} />
                                    </Link>
                                </div>
                            </motion.div>
                        </div>

                        <motion.section
                            className="app-card-soft relative overflow-hidden rounded-[28px] p-5"
                            initial={{ opacity: 0, y: 18 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.55, delay: 0.15, type: 'spring', bounce: 0.16 }}
                        >
                            <div className="relative z-10">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0 flex-1">
                                        <p className="app-kicker">{t.home.todayProgress}</p>
                                        <div className="mt-3 flex items-end gap-3">
                                            <span className="text-[3rem] font-semibold leading-none text-white">
                                                {roundedCompletion}%
                                            </span>
                                            <span className="mb-1 rounded-full border border-white/8 bg-white/[0.035] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-white/55">
                                                {heroStatLabel}
                                            </span>
                                        </div>
                                        <p className="mt-4 max-w-[19rem] text-sm leading-6 text-white/60">
                                            {heroMessage}
                                        </p>
                                    </div>

                                    <div
                                        className="relative flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-full p-[5px]"
                                        style={{
                                            background: `conic-gradient(var(--zenith-active) ${roundedCompletion * 3.6}deg, rgba(255,255,255,0.08) 0deg)`,
                                        }}
                                    >
                                        <div className="flex h-full w-full items-center justify-center rounded-full border border-white/8 bg-black/70">
                                            <span className="text-sm font-semibold tracking-[-0.04em] text-white/80">
                                                {roundedCompletion}%
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-5 grid grid-cols-3 gap-2.5">
                                    {summaryCards.map(({ label, value, icon: Icon }) => (
                                        <div key={label} className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3">
                                            <div className="flex items-center gap-2 text-white/40">
                                                <Icon size={14} />
                                                <span className="text-[10px] font-medium uppercase tracking-[0.12em]">
                                                    {label}
                                                </span>
                                            </div>
                                            <div className="mt-3 text-2xl font-semibold leading-none text-white">
                                                {value}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.section>
                    </div>
                </motion.header>

                {!mounted ? (
                    <div className="space-y-6">
                        <div className="app-card-soft rounded-[28px] p-5">
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-3">
                                    <Skeleton className="h-3 w-24 opacity-50" />
                                    <Skeleton className="h-14 w-28" />
                                    <Skeleton className="h-4 w-52 opacity-60" />
                                </div>
                                <Skeleton className="h-20 w-20 rounded-full" />
                            </div>
                            <div className="mt-5 grid grid-cols-3 gap-3">
                                <Skeleton className="h-24 w-full opacity-60" />
                                <Skeleton className="h-24 w-full opacity-50" />
                                <Skeleton className="h-24 w-full opacity-40" />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Skeleton className="h-4 w-24 opacity-50" />
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-24 w-full opacity-60" />
                            <Skeleton className="h-24 w-full opacity-40" />
                        </div>
                    </div>
                ) : allActiveHabits.length === 0 ? (
                    <motion.div
                        className="app-card-soft mt-10 flex flex-col items-center justify-center rounded-[28px] px-6 py-12 text-center"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 0.7, scale: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3, type: 'spring', bounce: 0.2 }}
                    >
                        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035]">
                            <Plus size={20} />
                        </div>
                        <p className="text-2xl font-semibold tracking-[-0.04em] text-white">{t.home.emptyState}</p>
                        <p className="mt-3 max-w-xs text-sm leading-6 text-white/55">{t.home.emptyStateDesc}</p>
                        <Link
                            id="add-habit-empty"
                            href="/habit/new"
                            className="mt-8 flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-black transition-colors hover:bg-white/90 active:opacity-80"
                        >
                            <Plus size={20} />
                            {t.home.startHabit}
                        </Link>
                    </motion.div>
                ) : (
                    <motion.div className="space-y-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                        {todayHabitCards.length > 0 && (
                            <section className="space-y-4">
                                <motion.div
                                    className="flex items-center justify-between gap-3"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.4, delay: 0.1 }}
                                >
                                    <div>
                                        <p className="app-kicker">{t.home.forToday}</p>
                                        <h3 className="mt-1 text-[1.4rem] font-semibold tracking-[-0.04em] text-white">
                                            {t.home.forToday}
                                        </h3>
                                    </div>
                                    <div className="rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/55">
                                        {completedTodayCount}/{todayHabitCards.length}
                                    </div>
                                </motion.div>
                                <motion.div
                                    className="space-y-3"
                                    variants={containerVariants}
                                    initial="hidden"
                                    animate="visible"
                                >
                                    <AnimatePresence mode="popLayout">
                                        {todayHabitCards.map(({ habit, streak, progressValue, targetValue, isComplete, progressLabel }) => (
                                            <SwipeableHabit
                                                key={habit.id}
                                                habit={habit}
                                                streak={streak}
                                                isComplete={isComplete}
                                                progressValue={progressValue}
                                                targetValue={targetValue}
                                                progressLabel={progressLabel}
                                                comboMultiplier={currentComboMultiplier}
                                                onToggle={() => toggleHabitLog(habit.id)}
                                                onIncrement={() => incrementHabitProgress(habit.id)}
                                                onDecrement={() => decrementHabitProgress(habit.id)}
                                                onDelete={() => removeHabit(habit.id)}
                                            />
                                        ))}
                                    </AnimatePresence>
                                </motion.div>
                            </section>
                        )}

                        {todayHabitCards.length === 0 && (
                            <motion.div
                                className="app-card-soft rounded-[24px] p-5"
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.35, delay: 0.15 }}
                            >
                                <p className="text-lg font-semibold tracking-[-0.03em] text-white">{t.home.restDay}</p>
                                <p className="mt-2 text-sm leading-6 text-white/55">{t.home.restDayDesc}</p>
                            </motion.div>
                        )}

                        {otherHabitCards.length > 0 && (
                            <section className="space-y-4">
                                <motion.div
                                    className="flex items-center justify-between gap-3"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.4, delay: 0.3 }}
                                >
                                    <div>
                                        <p className="app-kicker text-white/30">{t.home.otherDays}</p>
                                        <h3 className="mt-1 text-[1.25rem] font-semibold tracking-[-0.04em] text-white/72">
                                            {t.home.otherDays}
                                        </h3>
                                    </div>
                                    <div className="rounded-full border border-white/[0.06] bg-white/[0.025] px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/40">
                                        {otherHabitCards.length}
                                    </div>
                                </motion.div>
                                <motion.div
                                    className="space-y-3"
                                    variants={containerVariants}
                                    initial="hidden"
                                    animate="visible"
                                >
                                    <AnimatePresence mode="popLayout">
                                        {otherHabitCards.map(({ habit, streak, progressValue, targetValue, isComplete, progressLabel }) => (
                                            <motion.div
                                                key={habit.id}
                                                className="opacity-55 grayscale-[0.2] transition-opacity hover:opacity-100 hover:grayscale-0"
                                                layout
                                            >
                                                <SwipeableHabit
                                                    habit={habit}
                                                    streak={streak}
                                                    isComplete={isComplete}
                                                    progressValue={progressValue}
                                                    targetValue={targetValue}
                                                    progressLabel={progressLabel}
                                                    onToggle={() => toggleHabitLog(habit.id)}
                                                    onIncrement={() => incrementHabitProgress(habit.id)}
                                                    onDecrement={() => decrementHabitProgress(habit.id)}
                                                    onDelete={() => removeHabit(habit.id)}
                                                />
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </motion.div>
                            </section>
                        )}
                    </motion.div>
                )}

                {habits.some(h => !h.isActive) && (
                    <div className="mt-8 w-full text-center">
                        <Link id="view-trash" href="/trash" className="inline-flex items-center rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-[10px] font-medium uppercase tracking-[0.22em] text-white/35 transition-colors hover:text-white/60">
                            {t.home.viewTrash}
                        </Link>
                    </div>
                )}
                </div>
            </div>

            <NotificationOnboarding />
            <BetaFeedback />
            <BetaWelcomeModal />

            {/* Minimalist FAB for Adding Habits */}
            {allActiveHabits.length > 0 && mounted && (
                <motion.div
                    className="fixed floating-safe-bottom right-5 z-40 lg:right-10"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25, delay: 0.5 }}
                >
                    <Link
                        href="/habit/new"
                        className="group flex h-14 w-14 flex-col items-center justify-center rounded-full border border-white/10 bg-white text-black shadow-[0_12px_28px_rgba(0,0,0,0.28)] transition-colors hover:bg-white/90"
                        aria-label="Add Habit"
                    >
                        <Plus size={24} className="text-black" />
                    </Link>
                </motion.div>
            )}
        </main>
    );
}
