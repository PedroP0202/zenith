'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
    addDays,
    addMonths,
    addWeeks,
    differenceInCalendarDays,
    endOfMonth,
    format,
    isSameDay,
    startOfDay,
    startOfMonth,
    startOfWeek,
} from 'date-fns';
import { enUS, pt } from 'date-fns/locale';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, Calendar, CheckCircle2, ChevronDown, Flame, Plus, ShieldAlert, TrendingUp } from 'lucide-react';

import HabitCalendar from '../../components/HabitCalendar';
import Skeleton from '../../components/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import { useTranslation } from '../../hooks/useTranslation';
import { useStore } from '../../store/useStore';
import type { Habit, LogEntry } from '../../types';
import {
    getCompletedHabitPeriods,
    getHabitPeriodTarget,
    getHabitProgressForDate,
    getHabitScheduleType,
    getHabitUnitLabel,
    isHabitCompleteForDate,
    isHabitScheduledForDate,
} from '../../utils/habits';
import {
    calculateStreak,
    getBestStreak,
    getDailyActivityMap,
    getWeekdayDistribution,
    getYearlyStats,
} from '../../utils/streak';

const ActivityHeatmap = dynamic(() => import('../../components/ActivityHeatmap'), {
    loading: () => <div className="app-card-soft h-[220px] rounded-[28px] p-5 animate-pulse" />,
    ssr: false,
});

const DAY_LABELS_PT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const DAY_LABELS_EN = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

type HabitStatus = 'strong' | 'stable' | 'attention';

function capitalize(value: string) {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function getHabitPeriodSummary(habitLogs: LogEntry[], habit: Habit, rangeStart: Date, rangeEnd: Date) {
    const normalizedStart = startOfDay(rangeStart);
    const normalizedEnd = startOfDay(rangeEnd);

    if (normalizedEnd < normalizedStart) {
        return {
            scheduledPeriods: 0,
            completedPeriods: 0,
        };
    }

    const completedPeriods = new Set(getCompletedHabitPeriods(habitLogs, habit));
    const periodStarts = new Set<number>();

    if (getHabitScheduleType(habit) === 'times_per_week') {
        let cursor = startOfWeek(normalizedStart, { weekStartsOn: 1 });
        const endWeek = startOfWeek(normalizedEnd, { weekStartsOn: 1 });

        while (cursor <= endWeek) {
            periodStarts.add(startOfDay(cursor).getTime());
            cursor = addWeeks(cursor, 1);
        }
    } else {
        let cursor = normalizedStart;
        while (cursor <= normalizedEnd) {
            if (isHabitScheduledForDate(habit, cursor)) {
                periodStarts.add(startOfDay(cursor).getTime());
            }
            cursor = addDays(cursor, 1);
        }
    }

    const scheduledPeriods = periodStarts.size;
    const completedPeriodsCount = Array.from(periodStarts).filter((periodStart) => completedPeriods.has(periodStart)).length;

    return {
        scheduledPeriods,
        completedPeriods: completedPeriodsCount,
    };
}

function getDailyTimelineMetrics(
    days: Date[],
    activeHabits: Habit[],
    completionByDay: Map<number, Set<string>>,
    todayStart: Date,
    now: Date
) {
    return days.map((day) => {
        const dayStart = startOfDay(day);
        const dayKey = dayStart.getTime();
        const completedSet = completionByDay.get(dayKey) || new Set<string>();

        let scheduledCount = 0;
        let completedCount = 0;

        activeHabits.forEach((habit) => {
            const isScheduled = getHabitScheduleType(habit) === 'times_per_week' || isHabitScheduledForDate(habit, day);

            if (!isScheduled) return;

            scheduledCount++;
            if (completedSet.has(habit.id)) {
                completedCount++;
            }
        });

        return {
            date: day,
            completedCount,
            scheduledCount,
            isFuture: dayStart > todayStart,
            isToday: isSameDay(day, now),
            rate: scheduledCount > 0 ? completedCount / scheduledCount : 0,
        };
    });
}

export default function StatsPage() {
    const { t, language } = useTranslation();
    const { habits, logs } = useStore();
    const [mounted, setMounted] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    const copy = useMemo(
        () =>
            language === 'pt'
                ? {
                      snapshot: 'Snapshot',
                      monthToDate: 'No mês',
                      monthlyExecution: 'Execução mensal',
                      activeHabits: 'Hábitos ativos',
                      currentMomentum: 'Momento atual',
                      todayLoad: 'Carga de hoje',
                      averagePerActiveDay: 'Média por dia ativo',
                      bestDay: 'Melhor dia',
                      habitsOnTrack: 'Em trajetória',
                      habitsNeedingAttention: 'Pedem atenção',
                      habitHealth: 'Saúde dos hábitos',
                      periodProgress: 'Progresso do período',
                      lastCheckIn: 'Último check-in',
                      cadence: 'Cadência',
                      strong: 'Forte',
                      stable: 'Estável',
                      attention: 'Atenção',
                      never: 'Nunca',
                      yesterday: 'Ontem',
                      thisWeek: 'Esta semana',
                      monthPulse: 'Ritmo do mês',
                      periodComparison: 'Comparação de período',
                      monthVsPrevious: 'Mês vs anterior',
                      weekVsPrevious: 'Semana vs anterior',
                      nowShort: 'Agora',
                      beforeShort: 'Antes',
                      vsLastMonth: 'vs mês passado',
                      vsLastWeek: 'vs semana passada',
                      pointsShort: 'pts',
                      topHabit: 'Melhor ritmo',
                      focusHabit: 'Ponto de atenção',
                      monthSummaryStrong: 'Disciplina sólida este mês. A execução está limpa e consistente.',
                      monthSummaryStable: 'Boa base construída. Ainda há margem para fechar mais períodos.',
                      monthSummaryAttention: 'Há espaço para recuperar consistência. Vale atacar os hábitos em atraso.',
                      noBestDay: 'Sem padrão',
                      topDayHint: 'Dia com mais check-ins no mês',
                      activeDayHint: 'Volume médio nos dias em que houve ação',
                      onTrackHint: 'Hábitos a sustentar sem pressão',
                      todayHint: 'Períodos já fechados hoje',
                      emptyStatsTitle: 'Ainda não há hábitos para analisar',
                      emptyStatsDescription: 'Cria um hábito ativo para desbloquear gráficos, streaks, comparações semanais e saúde do mês.',
                      createHabit: 'Criar hábito',
                      daysAgo: (days: number) => `há ${days}d`,
                  }
                : {
                      snapshot: 'Snapshot',
                      monthToDate: 'Month to date',
                      monthlyExecution: 'Monthly execution',
                      activeHabits: 'Active habits',
                      currentMomentum: 'Current momentum',
                      todayLoad: 'Today load',
                      averagePerActiveDay: 'Avg per active day',
                      bestDay: 'Best day',
                      habitsOnTrack: 'On track',
                      habitsNeedingAttention: 'Need attention',
                      habitHealth: 'Habit health',
                      periodProgress: 'Period progress',
                      lastCheckIn: 'Last check-in',
                      cadence: 'Cadence',
                      strong: 'Strong',
                      stable: 'Stable',
                      attention: 'Attention',
                      never: 'Never',
                      yesterday: 'Yesterday',
                      thisWeek: 'This week',
                      monthPulse: 'Month pace',
                      periodComparison: 'Period comparison',
                      monthVsPrevious: 'Month vs previous',
                      weekVsPrevious: 'Week vs previous',
                      nowShort: 'Now',
                      beforeShort: 'Before',
                      vsLastMonth: 'vs last month',
                      vsLastWeek: 'vs last week',
                      pointsShort: 'pts',
                      topHabit: 'Top rhythm',
                      focusHabit: 'Needs focus',
                      monthSummaryStrong: 'Strong discipline this month. Execution feels clean and reliable.',
                      monthSummaryStable: 'The foundation is good. There is still room to close more periods.',
                      monthSummaryAttention: 'There is room to recover consistency. The lagging habits deserve focus.',
                      noBestDay: 'No pattern',
                      topDayHint: 'Most active weekday this month',
                      activeDayHint: 'Average output on days with activity',
                      onTrackHint: 'Habits progressing without friction',
                      todayHint: 'Periods already closed today',
                      emptyStatsTitle: 'No habits to analyze yet',
                      emptyStatsDescription: 'Create an active habit to unlock charts, streaks, weekly comparisons, and monthly health.',
                      createHabit: 'Create habit',
                      daysAgo: (days: number) => `${days}d ago`,
                  },
        [language]
    );

    const now = useMemo(() => new Date(), []);
    const localeObj = language === 'pt' ? pt : enUS;
    const dayLabels = language === 'pt' ? DAY_LABELS_PT : DAY_LABELS_EN;

    const activeHabits = useMemo(() => habits.filter((habit) => habit.isActive), [habits]);
    const logsByHabit = useMemo(() => {
        const grouped: Record<string, typeof logs> = {};
        logs.forEach((log) => {
            if (!grouped[log.habitId]) grouped[log.habitId] = [];
            grouped[log.habitId].push(log);
        });
        return grouped;
    }, [logs]);

    const todayStart = startOfDay(now);
    const monthStart = startOfMonth(now);
    const previousMonthDate = addMonths(now, -1);
    const previousMonthStart = startOfMonth(previousMonthDate);
    const previousMonthComparableDay = Math.min(now.getDate(), endOfMonth(previousMonthDate).getDate());
    const previousMonthEnd = startOfDay(
        new Date(previousMonthDate.getFullYear(), previousMonthDate.getMonth(), previousMonthComparableDay)
    );
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);
    const currentWeekIndex = useMemo(() => weekDays.findIndex((day) => isSameDay(day, now)), [now, weekDays]);
    const elapsedWeekRatio = currentWeekIndex >= 0 ? (currentWeekIndex + 1) / 7 : 1;
    const comparableWeekDaysCount = currentWeekIndex >= 0 ? currentWeekIndex + 1 : 7;
    const monthName = mounted ? capitalize(format(now, 'MMMM', { locale: localeObj })) : '...';

    const currentMonthLogs = useMemo(
        () =>
            logs.filter((log) => {
                const logDate = new Date(log.completedAt);
                return logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
            }),
        [logs, now]
    );
    const previousMonthLogs = useMemo(
        () =>
            logs.filter((log) => {
                const logTime = startOfDay(new Date(log.completedAt)).getTime();
                return logTime >= previousMonthStart.getTime() && logTime <= previousMonthEnd.getTime();
            }),
        [logs, previousMonthEnd, previousMonthStart]
    );

    const yearlyStats = useMemo(() => getYearlyStats(logs, now), [logs, now]);
    const activityMap = useMemo(() => getDailyActivityMap(logs, 84, now), [logs, now]);

    const completionByDay = useMemo(() => {
        const grouped = new Map<number, Set<string>>();
        logs.forEach((log) => {
            const dayKey = startOfDay(new Date(log.completedAt)).getTime();
            if (!grouped.has(dayKey)) grouped.set(dayKey, new Set<string>());
            grouped.get(dayKey)?.add(log.habitId);
        });
        return grouped;
    }, [logs]);

    const weekMetrics = useMemo(
        () => getDailyTimelineMetrics(weekDays, activeHabits, completionByDay, todayStart, now),
        [activeHabits, completionByDay, now, todayStart, weekDays]
    );
    const previousWeekDays = useMemo(() => weekDays.map((day) => addWeeks(day, -1)), [weekDays]);
    const previousWeekMetrics = useMemo(
        () =>
            getDailyTimelineMetrics(previousWeekDays, activeHabits, completionByDay, startOfDay(addWeeks(todayStart, -1)), addWeeks(now, -1)).slice(
                0,
                comparableWeekDaysCount
            ),
        [activeHabits, comparableWeekDaysCount, completionByDay, now, previousWeekDays, todayStart]
    );

    const weekCompletedDays = useMemo(
        () => weekMetrics.filter((metric) => !metric.isFuture && metric.completedCount > 0).length,
        [weekMetrics]
    );
    const pastDays = useMemo(() => weekMetrics.filter((metric) => !metric.isFuture).length, [weekMetrics]);
    const weekTotal = useMemo(() => weekMetrics.reduce((sum, metric) => sum + metric.completedCount, 0), [weekMetrics]);
    const weekScheduledTotal = useMemo(
        () => weekMetrics.filter((metric) => !metric.isFuture).reduce((sum, metric) => sum + metric.scheduledCount, 0),
        [weekMetrics]
    );
    const weekExecutionRate = weekScheduledTotal > 0 ? Math.round((weekTotal / weekScheduledTotal) * 100) : 0;
    const perfectWeekDays = useMemo(
        () => weekMetrics.filter((metric) => !metric.isFuture && metric.scheduledCount > 0 && metric.rate >= 1).length,
        [weekMetrics]
    );
    const previousWeekTotal = useMemo(
        () => previousWeekMetrics.reduce((sum, metric) => sum + metric.completedCount, 0),
        [previousWeekMetrics]
    );
    const previousWeekScheduledTotal = useMemo(
        () => previousWeekMetrics.reduce((sum, metric) => sum + metric.scheduledCount, 0),
        [previousWeekMetrics]
    );
    const previousWeekExecutionRate = previousWeekScheduledTotal > 0 ? Math.round((previousWeekTotal / previousWeekScheduledTotal) * 100) : 0;

    const habitStats = useMemo(() => {
        return activeHabits
            .map((habit) => {
                const habitLogs = logsByHabit[habit.id] || [];
                const currentMonthSummary = getHabitPeriodSummary(habitLogs, habit, monthStart, todayStart);
                const previousMonthSummary = getHabitPeriodSummary(habitLogs, habit, previousMonthStart, previousMonthEnd);
                const completedPeriodsThisMonth = currentMonthSummary.completedPeriods;
                const scheduledPeriodsThisMonth = currentMonthSummary.scheduledPeriods;
                const completionRate =
                    scheduledPeriodsThisMonth > 0 ? Math.round((completedPeriodsThisMonth / scheduledPeriodsThisMonth) * 100) : 0;
                const previousMonthCompletionRate =
                    previousMonthSummary.scheduledPeriods > 0
                        ? Math.round((previousMonthSummary.completedPeriods / previousMonthSummary.scheduledPeriods) * 100)
                        : 0;

                const progressValue = getHabitProgressForDate(habitLogs, habit, now);
                const targetValue = getHabitPeriodTarget(habit);
                const progressRatio = targetValue > 0 ? Math.min(progressValue / targetValue, 1) : 0;
                const isCurrentPeriodComplete = isHabitCompleteForDate(habitLogs, habit, now);
                const currentStreak = calculateStreak(habitLogs, habit, now);
                const bestStreak = getBestStreak(habitLogs, habit);
                const completedDaysThisMonth = Array.from(
                    new Set(
                        habitLogs
                            .map((log) => new Date(log.completedAt))
                            .filter((logDate) => logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear())
                            .map((logDate) => logDate.getDate())
                    )
                ).sort((left, right) => left - right);

                const lastCompletedAt = habitLogs.reduce<number | null>(
                    (latest, log) => (latest === null || log.completedAt > latest ? log.completedAt : latest),
                    null
                );

                const dueToday =
                    getHabitScheduleType(habit) === 'specific_days' && isHabitScheduledForDate(habit, now) && !isCurrentPeriodComplete;
                const weeklyBehind =
                    getHabitScheduleType(habit) === 'times_per_week' && !isCurrentPeriodComplete && progressRatio + 0.05 < elapsedWeekRatio;

                let status: HabitStatus = 'stable';
                if (dueToday || weeklyBehind || (scheduledPeriodsThisMonth > 0 && completionRate < 50)) {
                    status = 'attention';
                } else if (completionRate >= 80 && (currentStreak >= 3 || isCurrentPeriodComplete)) {
                    status = 'strong';
                }

                return {
                    habit,
                    habitLogs,
                    completedPeriodsThisMonth,
                    scheduledPeriodsThisMonth,
                    completionRate,
                    previousMonthCompletedPeriods: previousMonthSummary.completedPeriods,
                    previousMonthScheduledPeriods: previousMonthSummary.scheduledPeriods,
                    previousMonthCompletionRate,
                    monthRateDelta: completionRate - previousMonthCompletionRate,
                    progressValue,
                    targetValue,
                    progressRatio,
                    isCurrentPeriodComplete,
                    currentStreak,
                    bestStreak,
                    completedDaysThisMonth,
                    lastCompletedAt,
                    status,
                };
            })
            .sort((left, right) => {
                const weight = { attention: 0, stable: 1, strong: 2 };
                if (weight[left.status] !== weight[right.status]) {
                    return weight[left.status] - weight[right.status];
                }
                if (left.completionRate !== right.completionRate) {
                    return left.completionRate - right.completionRate;
                }
                return right.currentStreak - left.currentStreak;
            });
    }, [activeHabits, elapsedWeekRatio, logsByHabit, monthStart, now, previousMonthEnd, previousMonthStart, todayStart]);

    const totalCompletionsAllTime = logs.length;
    const monthScheduledTotal = habitStats.reduce((sum, stat) => sum + stat.scheduledPeriodsThisMonth, 0);
    const monthCompletedTotal = habitStats.reduce((sum, stat) => sum + stat.completedPeriodsThisMonth, 0);
    const monthExecutionRate = monthScheduledTotal > 0 ? Math.round((monthCompletedTotal / monthScheduledTotal) * 100) : 0;
    const previousMonthScheduledTotal = habitStats.reduce((sum, stat) => sum + stat.previousMonthScheduledPeriods, 0);
    const previousMonthCompletedTotal = habitStats.reduce((sum, stat) => sum + stat.previousMonthCompletedPeriods, 0);
    const previousMonthExecutionRate =
        previousMonthScheduledTotal > 0 ? Math.round((previousMonthCompletedTotal / previousMonthScheduledTotal) * 100) : 0;
    const currentBestStreak = habitStats.reduce((best, stat) => Math.max(best, stat.currentStreak), 0);
    const habitsNeedingAttention = habitStats.filter((stat) => stat.status === 'attention').length;
    const habitsOnTrack = Math.max(activeHabits.length - habitsNeedingAttention, 0);
    const topHabit = [...habitStats].sort((left, right) => right.completionRate - left.completionRate || right.currentStreak - left.currentStreak)[0];
    const focusHabit = [...habitStats].sort((left, right) => {
        if (left.status === 'attention' && right.status !== 'attention') return -1;
        if (left.status !== 'attention' && right.status === 'attention') return 1;
        return left.completionRate - right.completionRate;
    })[0];

    const activeDaysThisMonth = useMemo(
        () => new Set(currentMonthLogs.map((log) => startOfDay(new Date(log.completedAt)).getTime())).size,
        [currentMonthLogs]
    );
    const previousMonthActiveDays = useMemo(
        () => new Set(previousMonthLogs.map((log) => startOfDay(new Date(log.completedAt)).getTime())).size,
        [previousMonthLogs]
    );
    const averagePerActiveDay = activeDaysThisMonth > 0 ? currentMonthLogs.length / activeDaysThisMonth : 0;

    const todayActionableHabits = useMemo(
        () =>
            activeHabits.filter(
                (habit) => getHabitScheduleType(habit) === 'times_per_week' || isHabitScheduledForDate(habit, now)
            ).length,
        [activeHabits, now]
    );
    const todayClosedHabits = useMemo(
        () =>
            activeHabits.filter((habit) => isHabitCompleteForDate(logsByHabit[habit.id] || [], habit, now)).length,
        [activeHabits, logsByHabit, now]
    );

    const weekdayDistribution = useMemo(() => getWeekdayDistribution(currentMonthLogs), [currentMonthLogs]);
    const weekdayRows = useMemo(
        () =>
            WEEKDAY_ORDER.map((weekday) => ({
                weekday,
                label: capitalize(format(addDays(weekStart, weekday === 0 ? 6 : weekday - 1), 'EEE', { locale: localeObj })),
                value: weekdayDistribution[weekday],
            })),
        [localeObj, weekdayDistribution, weekStart]
    );
    const maxWeekdayValue = Math.max(...weekdayRows.map((row) => row.value), 1);
    const bestWeekday = weekdayRows.reduce((best, row) => (row.value > best.value ? row : best), weekdayRows[0] || { label: copy.noBestDay, value: 0 });

    const heroMessage =
        monthExecutionRate >= 80
            ? copy.monthSummaryStrong
            : monthExecutionRate >= 55
              ? copy.monthSummaryStable
              : copy.monthSummaryAttention;
    const monthRateDelta = monthExecutionRate - previousMonthExecutionRate;
    const weekRateDelta = weekExecutionRate - previousWeekExecutionRate;
    const activeDaysDelta = activeDaysThisMonth - previousMonthActiveDays;

    const getPeriodLabel = (progressValue: number, targetValue: number, unitLabel?: string) =>
        `${progressValue}/${targetValue}${unitLabel ? ` ${unitLabel}` : ''}`;

    const getCadenceLabel = (habit: (typeof activeHabits)[number]) => {
        if (getHabitScheduleType(habit) === 'times_per_week') {
            return `${getHabitPeriodTarget(habit)} ${t.habit.weeklyGoalSuffix}`;
        }

        if (habit.frequency.length === 7) {
            return t.habit.everyDay;
        }

        if (habit.frequency.length <= 3) {
            const shortDays = habit.frequency.map((day) => capitalize(format(addDays(startOfWeek(now), day), 'EEE', { locale: localeObj })));
            return shortDays.join(' • ');
        }

        return `${habit.frequency.length} ${t.habit.selectedDays}`;
    };

    const getStatusLabel = (status: HabitStatus) => {
        if (status === 'strong') return copy.strong;
        if (status === 'attention') return copy.attention;
        return copy.stable;
    };

    const getStatusClasses = (status: HabitStatus) => {
        if (status === 'strong') {
            return {
                pill: 'border-[color:rgba(var(--zenith-active-rgb),0.25)] bg-[color:rgba(var(--zenith-active-rgb),0.12)] text-[var(--zenith-active)]',
                ring: '#10b981',
                track: 'rgba(16,185,129,0.95)',
            };
        }

        if (status === 'attention') {
            return {
                pill: 'border-white/10 bg-white/[0.07] text-white/72',
                ring: '#f59e0b',
                track: 'rgba(245,158,11,0.92)',
            };
        }

        return {
            pill: 'border-white/10 bg-white/[0.05] text-white/68',
            ring: '#f5f5f5',
            track: 'rgba(255,255,255,0.86)',
        };
    };

    const formatLastCheckIn = (timestamp: number | null) => {
        if (!timestamp) return copy.never;

        const daysDiff = differenceInCalendarDays(now, new Date(timestamp));
        if (daysDiff <= 0) return t.common.today;
        if (daysDiff === 1) return copy.yesterday;
        return copy.daysAgo(daysDiff);
    };

    const attentionHint =
        habitsNeedingAttention > 0
            ? language === 'pt'
                ? `${habitsNeedingAttention} ${habitsNeedingAttention === 1 ? 'hábito pede atenção' : 'hábitos pedem atenção'}`
                : `${habitsNeedingAttention} ${habitsNeedingAttention === 1 ? 'habit needs attention' : 'habits need attention'}`
            : copy.onTrackHint;
    const getDeltaToneClass = (delta: number) => {
        if (delta > 0) return 'text-[var(--zenith-active)]';
        if (delta < 0) return 'text-amber-300';
        return 'text-white/72';
    };
    const formatDeltaValue = (delta: number, unit: string) => {
        const sign = delta > 0 ? '+' : '';
        return `${sign}${delta} ${unit}`;
    };
    const comparisonCards = [
        {
            label: copy.monthVsPrevious,
            value: formatDeltaValue(monthRateDelta, copy.pointsShort),
            hint: `${copy.nowShort} ${monthCompletedTotal}/${monthScheduledTotal || 0} • ${copy.beforeShort} ${previousMonthCompletedTotal}/${previousMonthScheduledTotal || 0}`,
            caption: copy.vsLastMonth,
            toneClass: getDeltaToneClass(monthRateDelta),
            icon: TrendingUp,
        },
        {
            label: copy.weekVsPrevious,
            value: formatDeltaValue(weekRateDelta, copy.pointsShort),
            hint: `${copy.nowShort} ${weekTotal} ${t.stats.checkinsLabel} • ${copy.beforeShort} ${previousWeekTotal} ${t.stats.checkinsLabel}`,
            caption: copy.vsLastWeek,
            toneClass: getDeltaToneClass(weekRateDelta),
            icon: Activity,
        },
    ];

    const insightCards = [
        {
            label: copy.averagePerActiveDay,
            value: activeDaysThisMonth > 0 ? averagePerActiveDay.toFixed(1) : '0.0',
            hint: `${copy.activeDayHint} • ${formatDeltaValue(activeDaysDelta, t.stats.daysLabel)}`,
            icon: Activity,
        },
        {
            label: copy.bestDay,
            value: bestWeekday.value > 0 ? bestWeekday.label : copy.noBestDay,
            hint: copy.topDayHint,
            icon: Calendar,
        },
        {
            label: copy.habitsOnTrack,
            value: `${habitsOnTrack}/${activeHabits.length || 0}`,
            hint: attentionHint,
            icon: CheckCircle2,
        },
    ];

    return (
        <main className="app-page relative min-h-[100dvh] overflow-x-hidden text-white">
            <div className="app-main-spacing relative z-10">
                <div className="app-shell">
                    <motion.header
                        className="mb-8"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, type: 'spring' }}
                    >
                        <div className="inline-flex items-center gap-3 rounded-full border border-white/8 bg-white/[0.025] px-3.5 py-2">
                            <span className="app-kicker text-[10px]">{copy.snapshot}</span>
                            <div className="h-3 w-px bg-white/10" />
                            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/45">
                                {copy.monthToDate} • {monthName}
                            </span>
                        </div>

                        <div className="mt-5 flex items-end justify-between gap-4">
                            <div>
                                <h1 className="text-[clamp(2.2rem,8vw,3.2rem)] font-semibold leading-[0.96] text-white">
                                    {t.stats.title}
                                </h1>
                                <p className="mt-3 max-w-[32rem] text-sm leading-relaxed text-white/55">
                                    {heroMessage}
                                </p>
                            </div>
                        </div>
                    </motion.header>

                    {!mounted ? (
                        <div className="space-y-4">
                            <div className="app-card rounded-[32px] p-6">
                                <Skeleton className="h-4 w-28 opacity-40" />
                                <Skeleton className="mt-5 h-14 w-32 opacity-60" />
                                <div className="mt-6 grid grid-cols-3 gap-3">
                                    {Array.from({ length: 3 }).map((_, index) => (
                                        <Skeleton key={index} className="h-20 rounded-2xl opacity-30" />
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                {Array.from({ length: 3 }).map((_, index) => (
                                    <div key={index} className="app-card-soft rounded-[26px] p-5">
                                        <Skeleton className="h-4 w-20 opacity-40" />
                                        <Skeleton className="mt-4 h-8 w-24 opacity-50" />
                                        <Skeleton className="mt-2 h-3 w-32 opacity-30" />
                                    </div>
                                ))}
                            </div>

                            <div className="app-card rounded-[28px] p-5">
                                <Skeleton className="h-4 w-24 opacity-40" />
                                <Skeleton className="mt-6 h-[120px] w-full opacity-30" />
                            </div>
                        </div>
                    ) : (
                        <>
                            <motion.section
                                className="app-card rounded-[32px] p-6"
                                initial={{ opacity: 0, y: 14 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.45, type: 'spring', bounce: 0.18 }}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="app-kicker">{copy.monthlyExecution}</p>
                                        <div className="mt-3 flex items-end gap-3">
                                            <span className="text-[clamp(3.4rem,16vw,5rem)] font-semibold leading-none tracking-[-0.1em] text-white">
                                                {monthExecutionRate}
                                            </span>
                                            <span className="mb-2 text-xl font-semibold text-white/55">%</span>
                                        </div>
                                        <p className="mt-3 text-sm text-white/45">
                                            {monthCompletedTotal}/{monthScheduledTotal || 0} {copy.monthPulse.toLowerCase()}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-right">
                                        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">{t.stats.consistency}</p>
                                        <p className="mt-2 text-2xl font-semibold tracking-[-0.06em] text-white">
                                            {yearlyStats.productivityPercentage}%
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-6 grid grid-cols-3 gap-3">
                                    <div className="rounded-[24px] border border-white/8 bg-white/[0.035] p-4">
                                        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">{copy.activeHabits}</p>
                                        <p className="mt-3 text-2xl font-semibold tracking-[-0.06em] text-white">{activeHabits.length}</p>
                                    </div>

                                    <div className="rounded-[24px] border border-white/8 bg-white/[0.035] p-4">
                                        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">{copy.currentMomentum}</p>
                                        <p className="mt-3 text-2xl font-semibold tracking-[-0.06em] text-white">{currentBestStreak}d</p>
                                    </div>

                                    <div className="rounded-[24px] border border-white/8 bg-white/[0.035] p-4">
                                        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">{copy.todayLoad}</p>
                                        <p className="mt-3 text-2xl font-semibold tracking-[-0.06em] text-white">
                                            {todayClosedHabits}/{todayActionableHabits || 0}
                                        </p>
                                        <p className="mt-2 text-[11px] text-white/35">{copy.todayHint}</p>
                                    </div>
                                </div>
                            </motion.section>

                            <motion.section
                                className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.38, delay: 0.04, type: 'spring' }}
                            >
                                {comparisonCards.map((card, index) => (
                                    <motion.div
                                        key={card.label}
                                        className="app-card-soft rounded-[26px] p-5"
                                        initial={{ opacity: 0, scale: 0.98 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.34, delay: 0.08 + index * 0.06, type: 'spring' }}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="app-kicker">{card.label}</p>
                                                <p className={`mt-3 text-3xl font-semibold tracking-[-0.08em] ${card.toneClass}`}>
                                                    {card.value}
                                                </p>
                                            </div>
                                            <card.icon size={17} className="text-white/28" strokeWidth={1.6} />
                                        </div>

                                        <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-white/32">
                                            {card.caption}
                                        </p>
                                        <p className="mt-3 text-[11px] leading-relaxed text-white/42">{card.hint}</p>
                                    </motion.div>
                                ))}
                            </motion.section>

                            <motion.section
                                className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: 0.08, type: 'spring' }}
                            >
                                {insightCards.map((card, index) => (
                                    <motion.div
                                        key={card.label}
                                        className="app-card-soft rounded-[26px] p-5"
                                        initial={{ opacity: 0, scale: 0.98 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.36, delay: 0.1 + index * 0.06, type: 'spring' }}
                                    >
                                        <card.icon size={16} className="text-white/32" strokeWidth={1.6} />
                                        <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">{card.label}</p>
                                        <p className="mt-2 text-2xl font-semibold tracking-[-0.06em] text-white">{card.value}</p>
                                        <p className="mt-2 text-[11px] leading-relaxed text-white/38">{card.hint}</p>
                                    </motion.div>
                                ))}
                            </motion.section>

                            <motion.section
                                className="mt-4"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: 0.1, type: 'spring' }}
                            >
                                <ActivityHeatmap data={activityMap} />
                            </motion.section>

                            <motion.section
                                className="mt-4 app-card rounded-[32px] p-5"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: 0.14, type: 'spring' }}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="app-kicker">{t.stats.currentWeek}</p>
                                        <div className="mt-3 flex items-end gap-3">
                                            <span className="text-4xl font-semibold tracking-[-0.08em] text-white">{weekExecutionRate}%</span>
                                            <span className="mb-1 text-sm text-white/45">{copy.thisWeek}</span>
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-white/8 bg-white/[0.035] px-4 py-3 text-right">
                                        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">{t.stats.checkinsLabel}</p>
                                        <p className="mt-2 text-2xl font-semibold tracking-[-0.06em] text-white">{weekTotal}</p>
                                    </div>
                                </div>

                                <div className="mt-4 flex items-center justify-between text-[11px] text-white/42">
                                    <span>
                                        <span className="font-semibold text-white/72">{weekCompletedDays}</span>/{pastDays} {t.stats.daysLabel}
                                    </span>
                                    <span>
                                        <span className="font-semibold text-white/72">{perfectWeekDays}</span> {t.stats.perfectDay.toLowerCase()}
                                    </span>
                                </div>

                                <div className="mt-5 flex items-end justify-between gap-1.5">
                                    {weekMetrics.map((metric, index) => {
                                        const maxHeight = 84;
                                        const minHeight = 6;
                                        const barHeight = metric.isFuture ? minHeight : Math.max(minHeight, Math.round(metric.rate * maxHeight));
                                        const barFill =
                                            metric.isFuture
                                                ? 'rgba(255,255,255,0.04)'
                                                : metric.rate >= 1
                                                  ? 'linear-gradient(to top, rgba(16,185,129,0.85), rgba(110,231,183,1))'
                                                  : metric.rate >= 0.5
                                                    ? 'linear-gradient(to top, rgba(255,255,255,0.52), rgba(255,255,255,0.86))'
                                                    : metric.rate > 0
                                                      ? 'linear-gradient(to top, rgba(255,255,255,0.18), rgba(255,255,255,0.36))'
                                                      : 'rgba(255,255,255,0.08)';

                                        return (
                                            <div key={index} className="flex flex-1 flex-col items-center gap-2">
                                                <span
                                                    className={`text-[10px] font-bold ${
                                                        metric.completedCount > 0 ? 'text-white/65' : 'text-transparent'
                                                    }`}
                                                >
                                                    {metric.completedCount > 0 ? metric.completedCount : '0'}
                                                </span>

                                                <div className="flex h-[84px] w-full items-end justify-center">
                                                    <motion.div
                                                        className={`w-full rounded-lg ${metric.isToday ? 'ring-1 ring-white/18 ring-offset-1 ring-offset-black/20' : ''}`}
                                                        style={{ background: barFill }}
                                                        initial={{ height: minHeight, opacity: 0.35 }}
                                                        animate={{ height: barHeight, opacity: 1 }}
                                                        transition={{ duration: 0.55, delay: 0.08 + index * 0.05, ease: [0.16, 1, 0.3, 1] }}
                                                    />
                                                </div>

                                                <span className={`text-[10px] font-bold ${metric.isToday ? 'text-white' : 'text-white/28'}`}>
                                                    {dayLabels[metric.date.getDay()]}
                                                </span>
                                                <span className={`text-[9px] ${metric.isToday ? 'text-white/58' : 'text-white/15'}`}>
                                                    {metric.date.getDate()}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="mt-4 flex items-center gap-4 border-t border-white/5 pt-4">
                                    <div className="flex items-center gap-1.5">
                                        <div className="h-2 w-2 rounded-full bg-[var(--zenith-active)]" />
                                        <span className="text-[10px] text-white/30">{t.stats.perfectDay}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="h-2 w-2 rounded-full bg-white/60" />
                                        <span className="text-[10px] text-white/30">{t.stats.partial}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="h-2 w-2 rounded-full bg-white/12" />
                                        <span className="text-[10px] text-white/30">{t.stats.noEntries}</span>
                                    </div>
                                </div>
                            </motion.section>

                            <motion.section
                                className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.42, delay: 0.18, type: 'spring' }}
                            >
                                <div className="app-card-soft rounded-[30px] p-5">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="app-kicker">{t.stats.productivityByDay}</p>
                                            <p className="mt-2 text-sm text-white/45">{monthName}</p>
                                        </div>
                                        <TrendingUp size={18} className="text-white/30" strokeWidth={1.6} />
                                    </div>

                                    <div className="mt-5 space-y-3">
                                        {weekdayRows.map((row, index) => (
                                            <motion.div
                                                key={row.label}
                                                className="grid grid-cols-[52px_1fr_auto] items-center gap-3"
                                                initial={{ opacity: 0, x: -8 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ duration: 0.34, delay: 0.2 + index * 0.04 }}
                                            >
                                                <span className="text-xs font-semibold text-white/52">{row.label}</span>
                                                <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
                                                    <motion.div
                                                        className="h-full rounded-full bg-[linear-gradient(90deg,rgba(255,255,255,0.34)_0%,rgba(16,185,129,0.92)_100%)]"
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${(row.value / maxWeekdayValue) * 100}%` }}
                                                        transition={{ duration: 0.55, delay: 0.24 + index * 0.05, ease: [0.16, 1, 0.3, 1] }}
                                                    />
                                                </div>
                                                <span className="text-xs font-semibold text-white/66">{row.value}</span>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="app-card-soft rounded-[30px] p-5">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="app-kicker">{copy.topHabit}</p>
                                                <p className="mt-3 text-lg font-semibold tracking-[-0.04em] text-white">
                                                    {topHabit ? topHabit.habit.title : '—'}
                                                </p>
                                                <p className="mt-2 text-sm text-white/45">
                                                    {topHabit ? `${topHabit.completionRate}% • ${topHabit.currentStreak}d` : t.stats.noData}
                                                </p>
                                            </div>
                                            <Flame size={18} className="text-[var(--zenith-active)]" strokeWidth={1.6} />
                                        </div>
                                    </div>

                                    <div className="app-card-soft rounded-[30px] p-5">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="app-kicker">{copy.focusHabit}</p>
                                                <p className="mt-3 text-lg font-semibold tracking-[-0.04em] text-white">
                                                    {focusHabit ? focusHabit.habit.title : '—'}
                                                </p>
                                                <p className="mt-2 text-sm text-white/45">
                                                    {focusHabit ? `${focusHabit.completionRate}% • ${getPeriodLabel(focusHabit.progressValue, focusHabit.targetValue, getHabitUnitLabel(focusHabit.habit))}` : t.stats.noData}
                                                </p>
                                            </div>
                                            <ShieldAlert size={18} className="text-white/32" strokeWidth={1.6} />
                                        </div>
                                    </div>
                                </div>
                            </motion.section>

                            <motion.section
                                className="mt-6"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.42, delay: 0.22, type: 'spring' }}
                            >
                                <div className="mb-4 flex items-end justify-between gap-4">
                                    <div>
                                        <p className="app-kicker">{copy.habitHealth}</p>
                                        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-white">{monthName}</h2>
                                    </div>

                                    <div className="rounded-2xl border border-white/8 bg-white/[0.035] px-4 py-3 text-right">
                                        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">{t.stats.totalCompleted}</p>
                                        <p className="mt-2 text-2xl font-semibold tracking-[-0.06em] text-white">{totalCompletionsAllTime}</p>
                                    </div>
                                </div>

                                {activeHabits.length === 0 ? (
                                    <EmptyState
                                        icon={<Activity size={34} />}
                                        title={copy.emptyStatsTitle}
                                        description={copy.emptyStatsDescription}
                                        className="app-card-soft"
                                        action={
                                            <Link
                                                href="/habit/new"
                                                className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-black transition-transform active:scale-95"
                                            >
                                                <Plus size={15} />
                                                {copy.createHabit}
                                            </Link>
                                        }
                                    />
                                ) : (
                                    <div className="space-y-3">
                                        {habitStats.map((habitStat, index) => {
                                            const {
                                                habit,
                                                completedPeriodsThisMonth,
                                                scheduledPeriodsThisMonth,
                                                completionRate,
                                                progressValue,
                                                targetValue,
                                                currentStreak,
                                                bestStreak,
                                                completedDaysThisMonth,
                                                lastCompletedAt,
                                                status,
                                            } = habitStat;
                                            const isExpanded = expandedId === habit.id;
                                            const statusStyles = getStatusClasses(status);
                                            const unitLabel = getHabitUnitLabel(habit);
                                            const progressLabel = getPeriodLabel(progressValue, targetValue, unitLabel);

                                            return (
                                                <motion.div
                                                    key={habit.id}
                                                    className="app-card-soft overflow-hidden rounded-[28px]"
                                                    initial={{ opacity: 0, y: 14 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ duration: 0.4, delay: 0.04 + index * 0.04, type: 'spring', bounce: 0.16 }}
                                                >
                                                    <button
                                                        onClick={() => setExpandedId(isExpanded ? null : habit.id)}
                                                        className="w-full px-5 py-4 text-left"
                                                    >
                                                        <div className="flex items-start gap-4">
                                                            <div className="relative mt-0.5 h-11 w-11 shrink-0">
                                                                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 36 36" width="44" height="44">
                                                                    <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
                                                                    <motion.circle
                                                                        cx="18"
                                                                        cy="18"
                                                                        r="14"
                                                                        fill="none"
                                                                        stroke={statusStyles.ring}
                                                                        strokeWidth="3"
                                                                        strokeLinecap="round"
                                                                        initial={{ strokeDasharray: '0 87.96' }}
                                                                        animate={{ strokeDasharray: `${Math.min((completionRate / 100) * 87.96, 87.96)} 87.96` }}
                                                                        transition={{ duration: 0.8, delay: 0.14 + index * 0.05, ease: [0.16, 1, 0.3, 1] }}
                                                                    />
                                                                </svg>
                                                                <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white/80">
                                                                    {completionRate}
                                                                </span>
                                                            </div>

                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <div className="min-w-0">
                                                                        <div className="truncate text-[15px] font-semibold text-white/92">{habit.title}</div>
                                                                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/42">
                                                                            <span>
                                                                                {completedPeriodsThisMonth}/{scheduledPeriodsThisMonth || 0} {t.stats.thisMonth}
                                                                            </span>
                                                                            <span>{progressLabel}</span>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center gap-2">
                                                                        <span
                                                                            className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${statusStyles.pill}`}
                                                                        >
                                                                            {getStatusLabel(status)}
                                                                        </span>
                                                                        <motion.div
                                                                            animate={{ rotate: isExpanded ? 180 : 0 }}
                                                                            transition={{ duration: 0.2 }}
                                                                            className="text-white/24"
                                                                        >
                                                                            <ChevronDown size={16} strokeWidth={1.9} />
                                                                        </motion.div>
                                                                    </div>
                                                                </div>

                                                                <div className="mt-4 h-[3px] overflow-hidden rounded-full bg-white/[0.06]">
                                                                    <motion.div
                                                                        className="h-full rounded-full"
                                                                        style={{ background: statusStyles.track }}
                                                                        initial={{ width: 0 }}
                                                                        animate={{ width: `${completionRate}%` }}
                                                                        transition={{ duration: 0.55, delay: 0.12 + index * 0.04, ease: 'easeOut' }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </button>

                                                    <AnimatePresence initial={false}>
                                                        {isExpanded && (
                                                            <motion.div
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                transition={{ duration: 0.25, ease: 'easeInOut' }}
                                                                className="overflow-hidden"
                                                            >
                                                                <div className="px-5 pb-5">
                                                                    <div className="grid grid-cols-3 gap-3">
                                                                        <div className="rounded-2xl border border-white/[0.05] bg-white/[0.03] p-3 text-center">
                                                                            <div className="text-[10px] uppercase tracking-widest text-white/30">{t.habit.currentStreak}</div>
                                                                            <div className="mt-2 text-lg font-bold text-white">{currentStreak}</div>
                                                                        </div>

                                                                        <div className="rounded-2xl border border-white/[0.05] bg-white/[0.03] p-3 text-center">
                                                                            <div className="text-[10px] uppercase tracking-widest text-white/30">{t.stats.bestStreak}</div>
                                                                            <div className="mt-2 text-lg font-bold text-white">{bestStreak}</div>
                                                                        </div>

                                                                        <div className="rounded-2xl border border-white/[0.05] bg-white/[0.03] p-3 text-center">
                                                                            <div className="text-[10px] uppercase tracking-widest text-white/30">{copy.periodProgress}</div>
                                                                            <div className="mt-2 text-lg font-bold text-white">{progressLabel}</div>
                                                                        </div>
                                                                    </div>

                                                                    <div className="mt-4 grid grid-cols-2 gap-3">
                                                                        <div className="rounded-2xl border border-white/[0.05] bg-white/[0.025] p-3">
                                                                            <div className="text-[10px] uppercase tracking-widest text-white/30">{copy.lastCheckIn}</div>
                                                                            <div className="mt-2 text-sm font-semibold text-white/82">{formatLastCheckIn(lastCompletedAt)}</div>
                                                                        </div>

                                                                        <div className="rounded-2xl border border-white/[0.05] bg-white/[0.025] p-3">
                                                                            <div className="text-[10px] uppercase tracking-widest text-white/30">{copy.cadence}</div>
                                                                            <div className="mt-2 text-sm font-semibold text-white/82">{getCadenceLabel(habit)}</div>
                                                                        </div>
                                                                    </div>

                                                                    <HabitCalendar
                                                                        completedDays={completedDaysThisMonth}
                                                                        monthDate={now}
                                                                        onDayClick={() => {}}
                                                                        frequency={getHabitScheduleType(habit) === 'specific_days' ? habit.frequency : undefined}
                                                                        isHardMode={habit.isHardMode}
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
                            </motion.section>
                        </>
                    )}
                </div>
            </div>
        </main>
    );
}
