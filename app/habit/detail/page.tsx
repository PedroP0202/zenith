'use client';

import { useStore } from '../../../store/useStore';
import { calculateStreak, getBestStreak } from '../../../utils/streak';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, Loader2, Minus, Plus, Repeat, Shield, Trash2 } from 'lucide-react';
import { Suspense, useMemo, useState, useEffect, useRef } from 'react';
import { Habit, LogEntry } from '../../../types';
import InfiniteCalendar from '../../../components/InfiniteCalendar';
import { useTranslation } from '../../../hooks/useTranslation';
import ConfirmationModal from '../../../components/ConfirmationModal';
import { deviceHaptics } from '../../../utils/haptics';
import { motion } from 'framer-motion';
import { getHabitDayProgress, getHabitGoalType, getHabitPeriodTarget, getHabitProgressForDate, getHabitScheduleType, getHabitTargetValue, getHabitUnitLabel, getHabitWeeklyTarget, isHabitCompleteForDate } from '../../../utils/habits';

function HabitDetailContent() {
    const { t } = useTranslation();
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const router = useRouter();
    const {
        habits,
        logs,
        removeHabit,
        editHabit,
        editHabitReminder,
        toggleHabitLog,
        incrementHabitProgress,
        decrementHabitProgress,
    } = useStore();

    const [localTitle, setLocalTitle] = useState('');
    const [isReminderEnabled, setIsReminderEnabled] = useState(false);
    const [localReminderTime, setLocalReminderTime] = useState('09:00');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const habit = habits.find((item: Habit) => item.id === id);
    const habitLogs = logs.filter((item: LogEntry) => item.habitId === id);
    const streak = habit ? calculateStreak(habitLogs, habit) : 0;
    const bestStreak = habit ? getBestStreak(habitLogs, habit) : 0;

    useEffect(() => {
        if (habit) {
            setLocalTitle(habit.title);
            if (habit.reminderTime) {
                setIsReminderEnabled(true);
                setLocalReminderTime(habit.reminderTime);
            } else {
                setIsReminderEnabled(false);
            }
        }
    }, [habit]);

    const now = new Date();
    const todayProgress = habit ? getHabitProgressForDate(habitLogs, habit, now) : 0;
    const todayDayProgress = habit ? getHabitDayProgress(habitLogs, now) : 0;
    const periodTarget = habit ? getHabitPeriodTarget(habit) : 1;
    const isCompleteNow = habit ? isHabitCompleteForDate(habitLogs, habit, now) : false;
    const isQuantitative = habit ? getHabitGoalType(habit) === 'count' : false;
    const unitLabel = habit ? getHabitUnitLabel(habit) : undefined;

    const cadenceLabel = useMemo(() => {
        if (!habit) return '';
        if (getHabitScheduleType(habit) === 'times_per_week') {
            return `${getHabitWeeklyTarget(habit)}x ${t.habit.weeklyGoalSuffix}`;
        }

        if (habit.frequency.length === 7) {
            return t.habit.everyDay;
        }

        return `${habit.frequency.length} ${t.habit.selectedDays}`;
    }, [habit, t.habit.everyDay, t.habit.selectedDays, t.habit.weeklyGoalSuffix]);

    const goalLabel = useMemo(() => {
        if (!habit) return '';
        if (getHabitGoalType(habit) === 'count') {
            return `${getHabitTargetValue(habit)} ${unitLabel || 'un'} ${t.habit.dailyGoalSuffix}`;
        }

        return getHabitScheduleType(habit) === 'times_per_week'
            ? `${periodTarget}x ${t.habit.weeklyGoalSuffix}`
            : `1x ${t.habit.dailyGoalSuffix}`;
    }, [habit, periodTarget, t.habit.dailyGoalSuffix, t.habit.weeklyGoalSuffix, unitLabel]);

    if (!id) return <p>{t.habit.notFound}</p>;

    if (!habit) {
        return (
            <main className="min-h-[100dvh] bg-black text-white flex items-center justify-center">
                <p>{t.habit.notFound}</p>
            </main>
        );
    }

    const handleConfirmDelete = () => {
        removeHabit(habit.id);
        router.push('/');
    };

    return (
        <main className="app-page min-h-[100dvh] text-white">
            <div className="app-main-spacing">
                <div className="app-shell">
                    <motion.header
                        className="mb-8 flex items-center justify-between"
                        initial={{ opacity: 0, y: -12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, type: 'spring', bounce: 0.2 }}
                    >
                        <button
                            onClick={() => {
                                deviceHaptics.lightImpact();
                                router.back();
                            }}
                            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/80 transition-colors hover:bg-white/[0.08] active:scale-95"
                        >
                            <ChevronLeft size={22} />
                        </button>

                        <button
                            onClick={() => {
                                deviceHaptics.heavyImpact();
                                setShowDeleteModal(true);
                            }}
                            className="flex h-12 w-12 items-center justify-center rounded-full text-red-500/70 transition-colors hover:bg-red-500/10 hover:text-red-500 active:scale-95"
                            aria-label={t.common.delete}
                        >
                            <Trash2 size={20} />
                        </button>
                    </motion.header>

                    <motion.section
                        className="app-card rounded-[2rem] p-5"
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45 }}
                    >
                        <input
                            ref={inputRef}
                            type="text"
                            value={localTitle}
                            onChange={(e) => setLocalTitle(e.target.value)}
                            onBlur={() => {
                                if (localTitle.trim() && localTitle !== habit.title) {
                                    editHabit(habit.id, localTitle.trim());
                                } else {
                                    setLocalTitle(habit.title);
                                }
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') inputRef.current?.blur();
                            }}
                            className="w-full border-b border-white/10 bg-transparent pb-3 text-[2rem] font-semibold tracking-[-0.06em] text-white outline-none focus:border-white/30"
                            aria-label={t.habit.editTitle}
                        />

                        <div className="mt-5 flex flex-wrap gap-2">
                            <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">
                                {goalLabel}
                            </span>
                            <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">
                                {cadenceLabel}
                            </span>
                            {habit.isHardMode && (
                                <span className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-red-300">
                                    {t.habit.hardMode}
                                </span>
                            )}
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-3">
                            <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4">
                                <p className="app-kicker">{t.habit.currentStreak}</p>
                                <p className="mt-3 text-4xl font-semibold tracking-[-0.08em] text-white">{streak}</p>
                            </div>
                            <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4">
                                <p className="app-kicker">{t.home.bestRun}</p>
                                <p className="mt-3 text-4xl font-semibold tracking-[-0.08em] text-white">{bestStreak}</p>
                            </div>
                        </div>
                    </motion.section>

                    <motion.section
                        className="app-card mt-5 rounded-[2rem] p-5"
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, delay: 0.05 }}
                    >
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="app-kicker">
                                    {getHabitScheduleType(habit) === 'times_per_week' ? t.habit.thisWeek : t.habit.todayProgress}
                                </p>
                                <p className="mt-2 text-sm leading-6 text-white/55">
                                    {getHabitScheduleType(habit) === 'times_per_week'
                                        ? `${todayProgress}/${periodTarget} ${t.habit.weeklyGoalSuffix}`
                                        : `${todayProgress}/${periodTarget} ${unitLabel || ''}`.trim()}
                                </p>
                            </div>
                            <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold tracking-[-0.03em] text-white">
                                {isCompleteNow ? '100%' : `${Math.min(100, Math.round((todayProgress / periodTarget) * 100))}%`}
                            </div>
                        </div>

                        {isQuantitative ? (
                            <div className="mt-5 flex items-center justify-between rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        deviceHaptics.lightImpact();
                                        decrementHabitProgress(habit.id);
                                    }}
                                    disabled={todayDayProgress <= 0}
                                    className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white transition disabled:opacity-30"
                                    aria-label={t.habit.decrease}
                                >
                                    <Minus size={18} />
                                </button>

                                <div className="text-center">
                                    <p className="text-[2.6rem] font-semibold tracking-[-0.08em] text-white">
                                        {todayDayProgress}/{getHabitTargetValue(habit)}
                                    </p>
                                    <p className="text-sm text-white/45">{unitLabel || t.habit.unitLabel}</p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        deviceHaptics.lightImpact();
                                        incrementHabitProgress(habit.id);
                                    }}
                                    disabled={todayDayProgress >= getHabitTargetValue(habit)}
                                    className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white text-black transition disabled:opacity-40"
                                    aria-label={t.habit.increase}
                                >
                                    <Plus size={18} />
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => {
                                    deviceHaptics.lightImpact();
                                    toggleHabitLog(habit.id);
                                }}
                                className={`mt-5 flex h-14 w-full items-center justify-center rounded-full text-sm font-bold uppercase tracking-[0.18em] transition-all ${isCompleteNow ? 'bg-white text-black' : 'border border-white/10 bg-white/[0.04] text-white'}`}
                            >
                                {isCompleteNow ? t.common.success : t.habit.claimDay}
                            </button>
                        )}
                    </motion.section>

                    <motion.div
                        className="mt-5"
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, delay: 0.1 }}
                    >
                        <InfiniteCalendar
                            habit={habit}
                            habitLogs={habitLogs}
                            onDayClick={(date) => {
                                const nowDate = new Date();
                                const todayZero = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()).getTime();
                                const cellZero = date.getTime();

                                if (cellZero > todayZero) return;
                                if (habit.isHardMode && cellZero < todayZero) return;
                                if (getHabitScheduleType(habit) === 'specific_days' && !habit.frequency.includes(date.getDay())) return;

                                deviceHaptics.lightImpact();
                                toggleHabitLog(habit.id, date.getTime());
                            }}
                        />
                    </motion.div>

                    <motion.section
                        className="app-card mt-5 rounded-[2rem] p-5"
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, delay: 0.15 }}
                    >
                        <div className="space-y-3">
                            <button
                                type="button"
                                onClick={() => {
                                    deviceHaptics.lightImpact();
                                    const nextState = !isReminderEnabled;
                                    setIsReminderEnabled(nextState);
                                    editHabitReminder(habit.id, nextState ? localReminderTime : undefined);
                                }}
                                className="flex w-full items-center justify-between rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4 text-left"
                            >
                                <div>
                                    <p className="text-sm font-semibold text-white">{t.habit.reminder}</p>
                                    <p className="mt-1 text-xs leading-5 text-white/45">{t.habit.reminderDesc}</p>
                                </div>
                                <span className={`inline-flex h-7 w-12 items-center rounded-full transition-colors ${isReminderEnabled ? 'bg-white' : 'bg-white/15'}`}>
                                    <span className={`h-5 w-5 rounded-full transition-transform ${isReminderEnabled ? 'translate-x-6 bg-black' : 'translate-x-1 bg-white'}`} />
                                </span>
                            </button>

                            {isReminderEnabled && (
                                <div className="flex items-center justify-between rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4">
                                    <span className="text-sm text-white/60">{t.habit.editTime}</span>
                                    <input
                                        type="time"
                                        value={localReminderTime}
                                        onChange={(e) => {
                                            setLocalReminderTime(e.target.value);
                                            editHabitReminder(habit.id, e.target.value);
                                        }}
                                        className="bg-transparent text-lg font-semibold tracking-[-0.03em] text-white outline-none"
                                    />
                                </div>
                            )}

                            <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4">
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-[0.9rem] border border-white/8 bg-white/[0.04]">
                                        {getHabitScheduleType(habit) === 'times_per_week'
                                            ? <Repeat size={16} className="text-white/60" />
                                            : <Shield size={16} className="text-white/60" />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-white">{t.habit.preview}</p>
                                        <p className="mt-1 text-xs leading-5 text-white/45">
                                            {goalLabel} · {cadenceLabel}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.section>
                </div>
            </div>

            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleConfirmDelete}
                title={t.habit.deleteWarning}
                description={t.habit.deleteDesc}
                confirmLabel={t.common.delete}
                cancelLabel={t.common.cancel}
            />
        </main>
    );
}

export default function HabitDetail() {
    return (
        <Suspense fallback={<div className="min-h-[100dvh] bg-black flex items-center justify-center"><Loader2 className="animate-spin text-white w-8 h-8" /></div>}>
            <HabitDetailContent />
        </Suspense>
    );
}
