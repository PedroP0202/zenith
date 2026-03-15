'use client';
import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import {
    getCompletionsThisMonth,
    getCompletedDaysThisMonth,
    getYearlyStats,
    getBestStreak,
    calculateStreak,
    getDailyActivityMap,
    isCompletedToday,
} from '../../utils/streak';
import HabitCalendar from '../../components/HabitCalendar';
import ActivityHeatmap from '../../components/ActivityHeatmap';
import { format, getDaysInMonth, startOfWeek, addDays, isSameDay, startOfDay } from 'date-fns';
import { enUS, pt } from 'date-fns/locale';
import { useTranslation } from '../../hooks/useTranslation';
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

    const activeHabits = habits.filter(h => h.isActive);
    const now = mounted ? new Date() : new Date();
    const localeObj = language === 'pt' ? pt : enUS;
    const monthName = mounted ? format(now, 'MMMM', { locale: localeObj }) : '...';
    const year = now.getFullYear();
    const DAY_LABELS = language === 'pt' ? DAY_LABELS_PT : DAY_LABELS_EN;

    const yearlyStats = getYearlyStats(logs, now);
    const activityMap = getDailyActivityMap(logs, 63, now);
    const daysInMonth = getDaysInMonth(now);

    // Current week (Mon-Sun)
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const todayStart = startOfDay(now);

    // Global stats
    const totalCompletionsAllTime = logs.length;
    const longestStreakAllHabits = activeHabits.reduce((max, habit) => {
        const habitLogs = logs.filter(l => l.habitId === habit.id);
        return Math.max(max, getBestStreak(habitLogs, habit.frequency));
    }, 0);

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
                    {(() => {
                        const weekCompletedDays = weekDays.filter(day => {
                            if (day > todayStart) return false;
                            const dayOfWeek = day.getDay();
                            return activeHabits.some(habit => {
                                if (habit.frequency && !habit.frequency.includes(dayOfWeek)) return false;
                                return logs.some(log => isSameDay(new Date(log.completedAt), day) && log.habitId === habit.id);
                            });
                        }).length;

                        const pastDays = weekDays.filter(d => d <= todayStart).length;
                        const weekTotal = weekDays.reduce((sum, day) => {
                            const dayOfWeek = day.getDay();
                            return sum + activeHabits.filter(habit => {
                                if (habit.frequency && !habit.frequency.includes(dayOfWeek)) return false;
                                return logs.some(log => isSameDay(new Date(log.completedAt), day) && log.habitId === habit.id);
                            }).length;
                        }, 0);

                        return (
                            <div className="flex items-baseline justify-between mb-4">
                                <h2 className="text-[12px] font-bold text-white/40 tracking-wider uppercase">{t.stats.currentWeek}</h2>
                                <span className="text-[12px] text-white/50">
                                    <span className="text-white font-semibold">{weekCompletedDays}</span>/{pastDays} {t.stats.daysLabel} &nbsp;·&nbsp; <span className="text-white font-semibold">{weekTotal}</span> {t.stats.checkinsLabel}
                                </span>
                            </div>
                        );
                    })()}

                    <div className="bg-[#111111] rounded-2xl px-4 pt-5 pb-4">
                        <div className="flex justify-between items-end gap-1.5">
                            {weekDays.map((day, i) => {
                                const isPast = day <= todayStart;
                                const isToday = isSameDay(day, now);
                                const isFuture = day > todayStart;
                                const dayOfWeek = day.getDay();

                                const completedCount = activeHabits.filter(habit => {
                                    if (habit.frequency && !habit.frequency.includes(dayOfWeek)) return false;
                                    return logs.some(log => isSameDay(new Date(log.completedAt), day) && log.habitId === habit.id);
                                }).length;

                                const scheduledCount = activeHabits.filter(habit =>
                                    !habit.frequency || habit.frequency.includes(dayOfWeek)
                                ).length;

                                const rate = scheduledCount > 0 ? completedCount / scheduledCount : 0;
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
                                            {DAY_LABELS[day.getDay()]}
                                        </span>
                                        {/* Date number */}
                                        <span className={`text-[9px] ${isToday ? 'text-white/60' : 'text-white/15'}`}>
                                            {day.getDate()}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Legend */}
                        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-[#00C853]" />
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
                            label: 'Total concluídos',
                            value: totalCompletionsAllTime,
                        },
                        {
                            icon: Award,
                            label: 'Melhor sequência',
                            value: `${longestStreakAllHabits}d`,
                        },
                    ].map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, scale: 0.94 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.35, delay: 0.12 + i * 0.06, type: 'spring' }}
                            className="bg-[#111111] rounded-2xl p-4 flex flex-col gap-3"
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
                            {activeHabits.map((habit, index) => {
                                const habitLogs = logs.filter(l => l.habitId === habit.id);
                                const completions = getCompletionsThisMonth(habitLogs);
                                const currentStreak = calculateStreak(habitLogs, habit.frequency, now);
                                const bestStreak = getBestStreak(habitLogs, habit.frequency);

                                // Only count up to today
                                const passedScheduledDays = Array.from({ length: now.getDate() }, (_, day) => {
                                    const d = new Date(now.getFullYear(), now.getMonth(), day + 1);
                                    return (!habit.frequency || habit.frequency.includes(d.getDay())) ? 1 : 0;
                                }).reduce((a: number, b: number) => a + b, 0);

                                const completionRate = passedScheduledDays > 0
                                    ? Math.round((completions / passedScheduledDays) * 100)
                                    : 0;

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
                                        className="bg-[#111111] rounded-2xl overflow-hidden"
                                    >
                                        {/* Habit row — tap to expand */}
                                        <button
                                            onClick={() => setExpandedId(isExpanded ? null : habit.id)}
                                            className="w-full px-5 py-4 flex items-center gap-4 text-left"
                                        >
                                            {/* Streak ring — shows current streak */}
                                            <div className="relative shrink-0 w-10 h-10">
                                                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 36 36" width="40" height="40">
                                                    <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                                                    <circle
                                                        cx="18" cy="18" r="14" fill="none"
                                                        stroke={ringColor}
                                                        strokeWidth="3"
                                                        strokeLinecap="round"
                                                        strokeDasharray={`${Math.min((completionRate / 100) * 87.96, 87.96)} 87.96`}
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
                                                        <div className="flex-1 bg-white/5 rounded-xl p-3 text-center">
                                                            <div className="text-[10px] uppercase tracking-widest text-white/30 mb-1">{t.habit.currentStreak}</div>
                                                            <div className="text-lg font-bold" style={{ color: ringColor }}>{currentStreak}</div>
                                                        </div>
                                                        <div className="flex-1 bg-white/5 rounded-xl p-3 text-center">
                                                            <div className="text-[10px] uppercase tracking-widest text-white/30 mb-1">{t.stats.bestStreak}</div>
                                                            <div className="text-lg font-bold text-white">{bestStreak}</div>
                                                        </div>
                                                        <div className="flex-1 bg-white/5 rounded-xl p-3 text-center">
                                                            <div className="text-[10px] uppercase tracking-widest text-white/30 mb-1">{t.stats.totalMonth}</div>
                                                            <div className="text-lg font-bold text-white">{completions}</div>
                                                        </div>
                                                    </div>
                                                    <div className="px-5 pb-5">
                                                        <HabitCalendar
                                                            completedDays={getCompletedDaysThisMonth(habitLogs, now)}
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
            </div>
        </main>
    );
}
