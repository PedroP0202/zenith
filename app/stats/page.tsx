'use client';
import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../../store/useStore';
import {
    getYearlyStats,
    getBestStreak,
    calculateStreak,
    getDailyActivityMap,
} from '../../utils/streak';
import dynamic from 'next/dynamic';
const HabitCalendar = dynamic(() => import('../../components/HabitCalendar'), {
    loading: () => <div className="h-[200px] w-full bg-white/5 rounded-2xl animate-pulse" />,
    ssr: false
});
const ActivityHeatmap = dynamic(() => import('../../components/ActivityHeatmap'), {
    loading: () => <div className="h-[120px] w-full bg-white/5 rounded-2xl animate-pulse" />,
    ssr: false
});
import { format, startOfWeek, addDays, isSameDay, startOfDay } from 'date-fns';
import { enUS, pt } from 'date-fns/locale';
import { useTranslation } from '../../hooks/useTranslation';
import Skeleton from '../../components/Skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Award, Target, Calendar } from 'lucide-react';

const DAY_LABELS_PT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const DAY_LABELS_EN = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function StatsPage() {
    const { t, language } = useTranslation();
    const { habits, logs } = useStore();
    const [mounted, setMounted] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => { setMounted(true); }, []);

    const activeHabits = useMemo(() => habits.filter(h => h.isActive), [habits]);
    const now = useMemo(() => new Date(), []);
    const localeObj = language === 'pt' ? pt : enUS;
    const monthName = mounted ? format(now, 'MMMM', { locale: localeObj }) : '...';
    const year = now.getFullYear();
    const DAY_LABELS = language === 'pt' ? DAY_LABELS_PT : DAY_LABELS_EN;

    const yearlyStats = useMemo(() => getYearlyStats(logs, now), [logs, now]);
    const activityMap = useMemo(() => getDailyActivityMap(logs, 63, now), [logs, now]);

    const logsByHabit = useMemo(() => {
        const grouped: Record<string, typeof logs> = {};
        logs.forEach((log) => {
            if (!grouped[log.habitId]) grouped[log.habitId] = [];
            grouped[log.habitId].push(log);
        });
        return grouped;
    }, [logs]);

    const completionByDay = useMemo(() => {
        const grouped = new Map<number, Set<string>>();
        logs.forEach((log) => {
            const dayKey = startOfDay(new Date(log.completedAt)).getTime();
            if (!grouped.has(dayKey)) grouped.set(dayKey, new Set<string>());
            grouped.get(dayKey)!.add(log.habitId);
        });
        return grouped;
    }, [logs]);

    // Current week (Mon-Sun)
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
    const todayStart = startOfDay(now);

    // Global stats
    const totalCompletionsAllTime = logs.length;
    const longestStreakAllHabits = useMemo(
        () =>
            activeHabits.reduce((max, habit) => {
                const habitLogs = logsByHabit[habit.id] || [];
                return Math.max(max, getBestStreak(habitLogs, habit));
            }, 0),
        [activeHabits, logsByHabit]
    );

    const weekMetrics = useMemo(() => {
        return weekDays.map((day) => {
            const dayStart = startOfDay(day);
            const dayKey = dayStart.getTime();
            const completedSet = completionByDay.get(dayKey) || new Set<string>();
            const dayOfWeek = day.getDay();

            let scheduledCount = 0;
            let completedCount = 0;
            activeHabits.forEach((habit) => {
                const isScheduled = !habit.frequency || habit.frequency.includes(dayOfWeek);
                if (!isScheduled) return;
                scheduledCount++;
                if (completedSet.has(habit.id)) completedCount++;
            });

            const isPast = dayStart <= todayStart;
            const isToday = isSameDay(day, now);
            const isFuture = dayStart > todayStart;

            return {
                date: day,
                dayOfWeek,
                isPast,
                isToday,
                isFuture,
                completedCount,
                scheduledCount,
                rate: scheduledCount > 0 ? completedCount / scheduledCount : 0,
            };
        });
    }, [weekDays, completionByDay, activeHabits, todayStart, now]);

    const weekCompletedDays = useMemo(
        () => weekMetrics.filter((metric) => metric.isPast && metric.completedCount > 0).length,
        [weekMetrics]
    );
    const pastDays = useMemo(() => weekMetrics.filter((metric) => !metric.isFuture).length, [weekMetrics]);
    const weekTotal = useMemo(
        () => weekMetrics.reduce((sum, metric) => sum + metric.completedCount, 0),
        [weekMetrics]
    );

    const habitStats = useMemo(() => {
        return activeHabits.map((habit) => {
            const habitLogs = logsByHabit[habit.id] || [];
            const completedDaysSet = new Set<number>();

            for (const log of habitLogs) {
                const logDate = new Date(log.completedAt);
                if (logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear()) {
                    completedDaysSet.add(logDate.getDate());
                }
            }

            const completions = completedDaysSet.size;
            const completedDaysThisMonth = Array.from(completedDaysSet).sort((a, b) => a - b);
            const currentStreak = calculateStreak(habitLogs, habit, now);
            const bestStreak = getBestStreak(habitLogs, habit);

            let passedScheduledDays = 0;
            for (let day = 1; day <= now.getDate(); day++) {
                const d = new Date(now.getFullYear(), now.getMonth(), day);
                if (!habit.frequency || habit.frequency.includes(d.getDay())) {
                    passedScheduledDays++;
                }
            }

            const completionRate = passedScheduledDays > 0 ? Math.round((completions / passedScheduledDays) * 100) : 0;

            return {
                habit,
                habitLogs,
                completions,
                completedDaysThisMonth,
                currentStreak,
                bestStreak,
                passedScheduledDays,
                completionRate,
            };
        });
    }, [activeHabits, logsByHabit, now]);

    return (
        <main className="min-h-[100dvh] bg-black text-white p-6 pb-32 font-sans flex flex-col items-center">
            <div className="w-full max-w-md pt-8">

                {/* Header */}
                <motion.header
                    className="mb-10 flex flex-col items-start"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, type: 'spring' }}
                >
                    <span className="text-[12px] font-bold text-white/40 tracking-wider mb-2 uppercase">
                        {t.stats.overview}
                    </span>
                    <h1 className="text-[2.2rem] leading-tight font-medium tracking-tight text-white capitalize">
                        {t.stats.title}
                    </h1>
                </motion.header>

                {!mounted ? (
                    <div className="space-y-8 mt-4">
                        {/* Heatmap Skeleton */}
                        <div className="bg-[#111111] rounded-2xl p-5 mb-6">
                            <div className="flex justify-between mb-6">
                                <Skeleton className="h-4 w-24 opacity-50" />
                                <Skeleton className="h-4 w-32 opacity-30" />
                            </div>
                            <Skeleton className="h-[120px] w-full" />
                        </div>

                        {/* Chart Skeleton */}
                        <div className="bg-[#111111] rounded-[32px] p-6 mb-8">
                            <div className="flex justify-between mb-8">
                                <Skeleton className="h-6 w-32 opacity-50" />
                                <div className="flex gap-2">
                                    <Skeleton className="h-4 w-12 opacity-30 px-2" />
                                    <Skeleton className="h-4 w-12 opacity-30 px-2" />
                                </div>
                            </div>
                            <div className="flex justify-between items-end h-40 px-2">
                                {[1, 2, 3, 4, 5, 6, 7].map(i => (
                                    <Skeleton key={i} className="w-8" style={{ height: `${20 + Math.random() * 60}%` }} />
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Activity Heatmap */}
                        <ActivityHeatmap data={activityMap} />

                {/* Current Week Chart — Premium */}
                <motion.div
                    className="mb-8"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.05, type: 'spring' }}
                >
                    {/* Section header with weekly summary */}
                    <div className="flex items-baseline justify-between mb-4">
                        <h2 className="text-[12px] font-bold text-white/40 tracking-wider uppercase">{t.stats.currentWeek}</h2>
                        <span className="text-[12px] text-white/50">
                            <span className="text-white font-semibold">{weekCompletedDays}</span>/{pastDays} {t.stats.daysLabel} &nbsp;·&nbsp; <span className="text-white font-semibold">{weekTotal}</span> {t.stats.checkinsLabel}
                        </span>
                    </div>

                    <div className="bg-zenith-surface backdrop-blur-md border border-white/[0.05] shadow-sm rounded-2xl px-4 pt-5 pb-4">
                        <div className="flex justify-between items-end gap-1.5">
                            {weekMetrics.map((metric, i) => {
                                const { date, isPast, isToday, isFuture, completedCount, scheduledCount, rate } = metric;
                                const MAX_HEIGHT = 72;
                                const MIN_HEIGHT = 6;
                                const barHeight = isFuture ? MIN_HEIGHT : Math.max(MIN_HEIGHT, Math.round(rate * MAX_HEIGHT));

                                // Gradient fill based on performance
                                const isPerfect = rate >= 1 && isPast;
                                const barBg = isFuture
                                    ? 'rgba(255,255,255,0.04)'
                                    : isPerfect
                                        ? 'linear-gradient(to top, #00C853, #69F0AE)'
                                        : rate >= 0.5
                                            ? 'linear-gradient(to top, rgba(255,255,255,0.55), rgba(255,255,255,0.75))'
                                            : rate > 0
                                                ? 'linear-gradient(to top, rgba(255,255,255,0.2), rgba(255,255,255,0.35))'
                                                : 'rgba(255,255,255,0.07)';

                                return (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                        {/* Completion count above bar */}
                                        <span className={`text-[10px] font-bold transition-colors ${isPast && completedCount > 0 ? (isPerfect ? 'text-[#69F0AE]' : 'text-white/70') : 'text-transparent'}`}>
                                            {completedCount > 0 ? completedCount : ' '}
                                        </span>

                                        {/* Bar container */}
                                        <div className="w-full flex items-end justify-center" style={{ height: MAX_HEIGHT }}>
                                            <motion.div
                                                className={`w-full rounded-lg ${isToday ? 'ring-1 ring-white/25 ring-offset-1 ring-offset-[#111]' : ''}`}
                                                style={{ background: barBg }}
                                                initial={{ height: MIN_HEIGHT, opacity: 0.4 }}
                                                animate={{ height: barHeight, opacity: 1 }}
                                                transition={{ duration: 0.55, delay: 0.08 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                                            />
                                        </div>

                                        {/* Day label */}
                                        <span className={`text-[10px] font-bold ${isToday ? 'text-white' : 'text-white/25'}`}>
                                            {DAY_LABELS[date.getDay()]}
                                        </span>
                                        {/* Date number */}
                                        <span className={`text-[9px] ${isToday ? 'text-white/60' : 'text-white/15'}`}>
                                            {date.getDate()}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Legend */}
                        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-zenith-active" />
                                <span className="text-[10px] text-white/30">{t.stats.perfectDay}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-white/50" />
                                <span className="text-[10px] text-white/30">{t.stats.partial}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-white/10" />
                                <span className="text-[10px] text-white/30">{t.stats.noEntries}</span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* 4 key global stats */}
                <motion.div
                    className="grid grid-cols-2 gap-3 mb-10"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1, type: 'spring' }}
                >
                    {[
                        {
                            icon: TrendingUp,
                            label: t.stats.consistency,
                            value: `${yearlyStats.productivityPercentage}%`,
                        },
                        {
                            icon: Calendar,
                            label: t.stats.focusDays,
                            value: yearlyStats.activeDays,
                        },
                        {
                            icon: Target,
                            label: t.stats.totalCompleted,
                            value: totalCompletionsAllTime,
                        },
                        {
                            icon: Award,
                            label: t.stats.bestSequence,
                            value: `${longestStreakAllHabits}d`,
                        },
                    ].map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, scale: 0.94 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.35, delay: 0.12 + i * 0.06, type: 'spring' }}
                            className="bg-zenith-surface backdrop-blur-md border border-white/[0.05] shadow-sm rounded-2xl p-4 flex flex-col gap-3"
                        >
                            <stat.icon size={16} className="text-white/30" strokeWidth={1.5} />
                            <div>
                                <div className="text-2xl font-bold text-white">{stat.value}</div>
                                <div className="text-[10px] font-medium text-white/40 uppercase tracking-widest mt-0.5">{stat.label}</div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Per-habit breakdown */}
                <div className="mb-3">
                    <h2 className="text-[12px] font-bold text-white/40 tracking-wider uppercase mb-4">
                        {monthName}
                    </h2>

                    {activeHabits.length === 0 ? (
                        <p className="text-center opacity-40 mt-12 text-sm">{t.stats.noData}</p>
                    ) : (
                        <div className="space-y-3">
                            {habitStats.map((habitStat, index) => {
                                const {
                                    habit,
                                    habitLogs,
                                    completions,
                                    completedDaysThisMonth,
                                    currentStreak,
                                    bestStreak,
                                    passedScheduledDays,
                                    completionRate,
                                } = habitStat;
                                const isExpanded = expandedId === habit.id;

                                // Streak ring color
                                const ringColor = currentStreak >= 30 ? '#FFD700'
                                    : currentStreak >= 7 ? '#00C853'
                                    : currentStreak > 0 ? '#ffffff'
                                    : 'rgba(255,255,255,0.15)';

                                return (
                                    <motion.div
                                        key={habit.id}
                                        initial={{ opacity: 0, y: 14 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.4, delay: 0.08 + index * 0.06, type: 'spring', bounce: 0.15 }}
                                        className="bg-zenith-surface backdrop-blur-md border border-white/[0.05] shadow-sm rounded-2xl overflow-hidden"
                                    >
                                        {/* Habit row — tap to expand */}
                                        <button
                                            onClick={() => setExpandedId(isExpanded ? null : habit.id)}
                                            className="w-full px-5 py-4 flex items-center gap-4 text-left card-press"
                                        >
                                            {/* Streak ring — shows current streak */}
                                            <div className="relative shrink-0 w-10 h-10">
                                                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 36 36" width="40" height="40">
                                                    <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                                                    <motion.circle
                                                        cx="18" cy="18" r="14" fill="none"
                                                        stroke={ringColor}
                                                        strokeWidth="3"
                                                        strokeLinecap="round"
                                                        initial={{ strokeDasharray: '0 87.96' }}
                                                        animate={{ strokeDasharray: `${Math.min((completionRate / 100) * 87.96, 87.96)} 87.96` }}
                                                        transition={{ duration: 0.8, delay: 0.2 + index * 0.08, ease: [0.16, 1, 0.3, 1] }}
                                                    />
                                                </svg>
                                                {/* Inside: streak number or flame */}
                                                <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold"
                                                    style={{ color: currentStreak > 0 ? ringColor : 'rgba(255,255,255,0.2)' }}
                                                >
                                                    {currentStreak > 0 ? currentStreak : '—'}
                                                </span>
                                            </div>

                                            {/* Name & month completions */}
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-white/90 truncate">{habit.title}</div>
                                                <div className="text-[11px] text-white/40 mt-0.5">
                                                    {completions}/{passedScheduledDays} {t.stats.thisMonth} · {completionRate}%
                                                </div>
                                            </div>

                                            {/* Expand chevron */}
                                            <motion.div
                                                animate={{ rotate: isExpanded ? 180 : 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="text-white/20 text-[9px] shrink-0"
                                            >
                                                ▼
                                            </motion.div>
                                        </button>

                                        {/* Progress bar */}
                                        <div className="mx-5 mb-4 h-[2px] bg-white/5 rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full rounded-full"
                                                style={{ background: ringColor }}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${completionRate}%` }}
                                                transition={{ duration: 0.6, delay: 0.15 + index * 0.06, ease: 'easeOut' }}
                                            />
                                        </div>

                                        {/* Expanded detail — calendar */}
                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="flex gap-3 px-5 mb-4">
                                                        <div className="flex-1 bg-white/[0.03] border border-white/[0.03] rounded-xl p-3 text-center">
                                                            <div className="text-[10px] uppercase tracking-widest text-white/30 mb-1">{t.habit.currentStreak}</div>
                                                            <div className="text-lg font-bold" style={{ color: ringColor }}>{currentStreak}</div>
                                                        </div>
                                                        <div className="flex-1 bg-white/[0.03] border border-white/[0.03] rounded-xl p-3 text-center">
                                                            <div className="text-[10px] uppercase tracking-widest text-white/30 mb-1">{t.stats.bestStreak}</div>
                                                            <div className="text-lg font-bold text-white">{bestStreak}</div>
                                                        </div>
                                                        <div className="flex-1 bg-white/[0.03] border border-white/[0.03] rounded-xl p-3 text-center">
                                                            <div className="text-[10px] uppercase tracking-widest text-white/30 mb-1">{t.stats.totalMonth}</div>
                                                            <div className="text-lg font-bold text-white">{completions}</div>
                                                        </div>
                                                    </div>
                                                    <div className="px-5 pb-5">
                                                        <HabitCalendar
                                                            completedDays={completedDaysThisMonth}
                                                            monthDate={now}
                                                            onDayClick={() => {}}
                                                        />
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </>
        )}
            </div>
        </main>
    );
}
