'use client';
import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { getCompletionsThisMonth, getCompletedDaysThisMonth, getYearlyStats, getBestStreak, calculateStreak, getDailyActivityMap, getWeekdayDistribution } from '../../utils/streak';
import HabitCalendar from '../../components/HabitCalendar';
import ActivityHeatmap from '../../components/ActivityHeatmap';
import WeekdayChart from '../../components/WeekdayChart';
import { format } from 'date-fns';
import { enUS, pt } from 'date-fns/locale';
import { useTranslation } from '../../hooks/useTranslation';

export default function StatsPage() {
    const { t, language } = useTranslation();
    const { habits, logs } = useStore();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const activeHabits = habits.filter(h => h.isActive);

    // Create a Set of active habit IDs for fast lookup
    const activeHabitIds = new Set(activeHabits.map(h => h.id));
    // Filter globally to only compute stats for habits that are not in the Trash
    const activeLogs = logs.filter(l => activeHabitIds.has(l.habitId));

    const now = mounted ? new Date() : new Date();
    const localeObj = language === 'pt' ? pt : enUS;
    const monthName = mounted ? format(now, 'MMMM', { locale: localeObj }) : '...';
    const year = now.getFullYear();

    const yearlyStats = getYearlyStats(activeLogs, now);
    const activityMap = getDailyActivityMap(activeLogs, 63, now); // 9 weeks
    const weekdayDist = getWeekdayDistribution(activeLogs);

    return (
        <main className="min-h-[100dvh] bg-black text-white p-6 pb-32 font-sans flex flex-col items-center">
            <div className="w-full max-w-md pt-8">
                <header className="mb-14 flex flex-col items-start transition-opacity duration-500 opacity-100">
                    <span className="text-[12px] font-bold text-white/50 tracking-wider mb-2 uppercase">
                        {t.stats.overview}
                    </span>
                    <h1 className="text-[2.5rem] leading-tight font-medium tracking-tight text-white capitalize">
                        {t.stats.title}
                    </h1>
                </header>

                <ActivityHeatmap data={activityMap} />

                <WeekdayChart distribution={weekdayDist} />

                <div className="mb-12">
                    <h2 className="text-[13px] font-bold text-white/50 tracking-wider mb-4 uppercase">
                        {t.stats.yourYear} ({year})
                    </h2>
                    <div className="flex gap-4">
                        <div className="flex-1 bg-[#111111] rounded-3xl p-5 flex flex-col justify-between">
                            <span className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-4">{t.stats.consistency}</span>
                            <span className="text-3xl font-bold text-white">{yearlyStats.productivityPercentage}%</span>
                        </div>
                        <div className="flex-1 bg-[#111111] rounded-3xl p-5 flex flex-col justify-between">
                            <span className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-4">{t.stats.focusDays}</span>
                            <span className="text-3xl font-bold text-white">{yearlyStats.activeDays}</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h2 className="text-[13px] font-bold text-white/50 tracking-wider mb-2 uppercase">
                        {monthName}
                    </h2>
                    {activeHabits.length === 0 ? (
                        <p className="text-center opacity-50 mt-12">{t.stats.noData}</p>
                    ) : (
                        activeHabits.map((habit) => {
                            const habitLogs = logs.filter(l => l.habitId === habit.id);
                            const completions = getCompletionsThisMonth(habitLogs);

                            return (
                                <div key={habit.id} className="relative z-10 py-5 px-6 rounded-3xl bg-[#111111] transition-colors duration-400 flex flex-col">
                                    <div className="flex justify-between items-center w-full">
                                        <span className="text-lg font-medium text-white/90 truncate mr-4">
                                            {habit.title}
                                        </span>
                                        <div className="flex flex-col items-end shrink-0">
                                            <span className="text-2xl font-bold text-white">
                                                {completions}
                                            </span>
                                            <span className="text-[10px] font-medium text-white/40 uppercase tracking-widest">
                                                {completions === 1 ? t.stats.day : t.stats.days}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex gap-4 mb-6 mt-4">
                                        <div className="flex-1 bg-white/5 rounded-2xl p-4 flex flex-col justify-between items-center text-center">
                                            <span className="text-white/40 text-[10px] font-semibold uppercase tracking-widest mb-1">{t.habit.currentStreak}</span>
                                            <span className="text-xl font-bold text-[var(--zenith-active)] shadow-sm">{calculateStreak(habitLogs, habit.frequency, now)}</span>
                                        </div>
                                        <div className="flex-1 bg-white/5 rounded-2xl p-4 flex flex-col justify-between items-center text-center">
                                            <span className="text-white/40 text-[10px] font-semibold uppercase tracking-widest mb-1">{t.stats.bestStreak}</span>
                                            <span className="text-xl font-bold text-white shadow-sm">{getBestStreak(habitLogs, habit.frequency)}</span>
                                        </div>
                                    </div>

                                    <HabitCalendar completedDays={getCompletedDaysThisMonth(habitLogs, now)} monthDate={now} onDayClick={() => { }} />
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </main>
    );
}
