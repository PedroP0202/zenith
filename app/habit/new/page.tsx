"use client";

import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../../../store/useStore';
import { useRouter } from 'next/navigation';
import { Bell, CalendarDays, CheckCircle2, ChevronLeft, Hash, Layers3, Repeat, Shield } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import { motion, AnimatePresence } from 'framer-motion';
import { deviceHaptics } from '../../../utils/haptics';
import { HabitGoalType, HabitScheduleType } from '../../../types';

export default function NewHabit() {
    const { t } = useTranslation();
    const { addHabit } = useStore();
    const router = useRouter();

    const [title, setTitle] = useState('');
    const [goalType, setGoalType] = useState<HabitGoalType>('complete');
    const [scheduleType, setScheduleType] = useState<HabitScheduleType>('specific_days');
    const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
    const [weeklyTarget, setWeeklyTarget] = useState(1);
    const [targetValue, setTargetValue] = useState(3);
    const [unitLabel, setUnitLabel] = useState('');
    const [isHardMode, setIsHardMode] = useState(false);
    const [isReminderEnabled, setIsReminderEnabled] = useState(false);
    const [reminderTime, setReminderTime] = useState('09:00');
    const [placeholderIndex, setPlaceholderIndex] = useState(0);

    const suggestions = t.habit.suggestions || [
        'Ler 10 paginas',
        'Meditar 5 minutos',
        'Treinar 30 minutos'
    ];

    useEffect(() => {
        if (!title.trim()) {
            const interval = setInterval(() => {
                setPlaceholderIndex((prev) => (prev + 1) % suggestions.length);
            }, 3000);
            return () => clearInterval(interval);
        }
    }, [title, suggestions.length]);

    const daysOfWeek = t.habit.daysOfWeek.map((label, index) => ({ label, index }));
    const hasValidDays = scheduleType === 'times_per_week' || selectedDays.length > 0;
    const hasValidTarget = goalType === 'complete' || targetValue >= 1;
    const canSubmit = title.trim().length > 0 && hasValidDays && hasValidTarget;

    const cadenceSummary = useMemo(() => {
        if (scheduleType === 'times_per_week') {
            return `${weeklyTarget}x ${t.habit.weeklyGoalSuffix}`;
        }

        if (selectedDays.length === 7) {
            return t.habit.everyDay;
        }

        return `${selectedDays.length} ${t.habit.selectedDays}`;
    }, [scheduleType, weeklyTarget, selectedDays.length, t.habit.everyDay, t.habit.selectedDays, t.habit.weeklyGoalSuffix]);

    const goalSummary = useMemo(() => {
        if (goalType === 'count') {
            const unit = unitLabel.trim() || 'un';
            return `${targetValue} ${unit} ${t.habit.dailyGoalSuffix}`;
        }

        return t.habit.typeCompleteDesc;
    }, [goalType, targetValue, unitLabel, t.habit.dailyGoalSuffix, t.habit.typeCompleteDesc]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) {
            deviceHaptics.error();
            return;
        }

        addHabit({
            title: title.trim(),
            frequency: selectedDays,
            scheduleType,
            weeklyTarget: scheduleType === 'times_per_week' ? weeklyTarget : undefined,
            goalType,
            targetValue: goalType === 'count' ? targetValue : undefined,
            unitLabel: goalType === 'count' ? unitLabel.trim() : undefined,
            isHardMode,
            reminderTime: isReminderEnabled ? reminderTime : undefined,
        });

        deviceHaptics.success();
        router.push('/');
    };

    const toggleDay = (dayIndex: number) => {
        deviceHaptics.lightImpact();
        if (selectedDays.includes(dayIndex)) {
            setSelectedDays((prev) => prev.filter((day) => day !== dayIndex));
            return;
        }

        setSelectedDays((prev) => [...prev, dayIndex].sort((a, b) => a - b));
    };

    return (
        <main className="app-page min-h-[100dvh] text-white">
            <div className="app-main-spacing">
                <div className="app-shell">
                    <motion.button
                        onClick={() => {
                            deviceHaptics.lightImpact();
                            router.back();
                        }}
                        className="mb-8 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/80 transition-colors hover:bg-white/[0.08] active:scale-95"
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, type: 'spring' }}
                    >
                        <ChevronLeft size={22} />
                    </motion.button>

                    <motion.header
                        className="mb-8 space-y-3"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45 }}
                    >
                        <p className="app-kicker">{t.habit.newTitle}</p>
                        <h1 className="text-[2.4rem] font-semibold leading-[0.95] tracking-[-0.06em] text-white">
                            {t.habit.questionTitle}
                        </h1>
                        <p className="max-w-[24rem] text-sm leading-6 text-white/55">
                            {t.habit.premiumHint}
                        </p>
                    </motion.header>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <motion.section
                            className="app-card rounded-[2rem] p-5"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.05 }}
                        >
                            <label htmlFor="title" className="app-kicker">
                                {t.habit.habitTag}
                            </label>
                            <div className="relative mt-4">
                                <input
                                    id="title"
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    autoFocus
                                    autoComplete="off"
                                    className="w-full bg-transparent pb-3 text-[1.8rem] font-semibold tracking-[-0.05em] text-white outline-none border-b border-white/10 focus:border-white/30"
                                />
                                <AnimatePresence mode="wait">
                                    {!title && (
                                        <motion.div
                                            key={placeholderIndex}
                                            initial={{ opacity: 0, y: 14 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
                                            transition={{ duration: 0.45, ease: 'easeOut' }}
                                            className="pointer-events-none absolute left-0 top-1/2 w-full -translate-y-1/2 truncate pr-6 text-[1.8rem] font-medium tracking-[-0.04em] text-white/18"
                                        >
                                            Ex: {suggestions[placeholderIndex]}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.section>

                        <motion.section
                            className="app-card rounded-[2rem] p-5"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.1 }}
                        >
                            <div className="mb-4 flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] border border-white/10 bg-white/[0.04]">
                                    <Layers3 size={18} className="text-white/70" />
                                </div>
                                <div>
                                    <p className="app-kicker">{t.habit.goal}</p>
                                    <p className="mt-1 text-sm text-white/55">{goalSummary}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        deviceHaptics.lightImpact();
                                        setGoalType('complete');
                                    }}
                                    className={`rounded-[1.5rem] border p-4 text-left transition-all ${goalType === 'complete' ? 'border-white/20 bg-white/[0.08] shadow-[0_16px_32px_rgba(0,0,0,0.18)]' : 'border-white/8 bg-white/[0.03] text-white/65'}`}
                                >
                                    <CheckCircle2 size={18} className={goalType === 'complete' ? 'text-white' : 'text-white/50'} />
                                    <p className="mt-4 text-base font-semibold tracking-[-0.03em]">{t.habit.typeComplete}</p>
                                    <p className="mt-2 text-sm leading-5 text-white/50">{t.habit.typeCompleteDesc}</p>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        deviceHaptics.lightImpact();
                                        if (scheduleType === 'times_per_week') {
                                            setScheduleType('specific_days');
                                        }
                                        setGoalType('count');
                                    }}
                                    className={`rounded-[1.5rem] border p-4 text-left transition-all ${goalType === 'count' ? 'border-white/20 bg-white/[0.08] shadow-[0_16px_32px_rgba(0,0,0,0.18)]' : 'border-white/8 bg-white/[0.03] text-white/65'}`}
                                >
                                    <Hash size={18} className={goalType === 'count' ? 'text-white' : 'text-white/50'} />
                                    <p className="mt-4 text-base font-semibold tracking-[-0.03em]">{t.habit.typeCount}</p>
                                    <p className="mt-2 text-sm leading-5 text-white/50">{t.habit.typeCountDesc}</p>
                                </button>
                            </div>

                            {goalType === 'count' && (
                                <div className="mt-4 grid grid-cols-[1fr_1.2fr] gap-3">
                                    <label className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4">
                                        <span className="app-kicker">{t.habit.targetValue}</span>
                                        <input
                                            type="number"
                                            min={1}
                                            value={targetValue}
                                            onChange={(e) => setTargetValue(Math.max(1, Number(e.target.value) || 1))}
                                            className="mt-3 w-full bg-transparent text-2xl font-semibold tracking-[-0.05em] text-white outline-none"
                                        />
                                    </label>

                                    <label className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4">
                                        <span className="app-kicker">{t.habit.unitLabel}</span>
                                        <input
                                            type="text"
                                            value={unitLabel}
                                            onChange={(e) => setUnitLabel(e.target.value)}
                                            placeholder={t.habit.unitPlaceholder}
                                            className="mt-3 w-full bg-transparent text-lg font-medium tracking-[-0.03em] text-white outline-none placeholder:text-white/20"
                                        />
                                    </label>
                                </div>
                            )}
                        </motion.section>

                        <motion.section
                            className="app-card rounded-[2rem] p-5"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.15 }}
                        >
                            <div className="mb-4 flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] border border-white/10 bg-white/[0.04]">
                                    <CalendarDays size={18} className="text-white/70" />
                                </div>
                                <div>
                                    <p className="app-kicker">{t.habit.cadence}</p>
                                    <p className="mt-1 text-sm text-white/55">{cadenceSummary}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        deviceHaptics.lightImpact();
                                        setScheduleType('specific_days');
                                    }}
                                    className={`rounded-[1.5rem] border p-4 text-left transition-all ${scheduleType === 'specific_days' ? 'border-white/20 bg-white/[0.08] shadow-[0_16px_32px_rgba(0,0,0,0.18)]' : 'border-white/8 bg-white/[0.03] text-white/65'}`}
                                >
                                    <CalendarDays size={18} className={scheduleType === 'specific_days' ? 'text-white' : 'text-white/50'} />
                                    <p className="mt-4 text-base font-semibold tracking-[-0.03em]">{t.habit.specificDays}</p>
                                    <p className="mt-2 text-sm leading-5 text-white/50">{t.habit.specificDaysDesc}</p>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        deviceHaptics.lightImpact();
                                        if (goalType === 'count') {
                                            setGoalType('complete');
                                        }
                                        setScheduleType('times_per_week');
                                    }}
                                    className={`rounded-[1.5rem] border p-4 text-left transition-all ${scheduleType === 'times_per_week' ? 'border-white/20 bg-white/[0.08] shadow-[0_16px_32px_rgba(0,0,0,0.18)]' : 'border-white/8 bg-white/[0.03] text-white/65'}`}
                                >
                                    <Repeat size={18} className={scheduleType === 'times_per_week' ? 'text-white' : 'text-white/50'} />
                                    <p className="mt-4 text-base font-semibold tracking-[-0.03em]">{t.habit.timesPerWeek}</p>
                                    <p className="mt-2 text-sm leading-5 text-white/50">{t.habit.timesPerWeekDesc}</p>
                                </button>
                            </div>

                            {scheduleType === 'specific_days' ? (
                                <div className="mt-4 flex items-center justify-between gap-2">
                                    {daysOfWeek.map((day) => {
                                        const isSelected = selectedDays.includes(day.index);
                                        return (
                                            <button
                                                key={day.index}
                                                type="button"
                                                onClick={() => toggleDay(day.index)}
                                                className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold transition-all ${isSelected ? 'bg-white text-black shadow-[0_12px_24px_rgba(255,255,255,0.16)]' : 'bg-white/[0.04] text-white/40 hover:bg-white/[0.08] hover:text-white/70'}`}
                                            >
                                                {day.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-7">
                                    {Array.from({ length: 7 }, (_, index) => index + 1).map((count) => (
                                        <button
                                            key={count}
                                            type="button"
                                            onClick={() => {
                                                deviceHaptics.lightImpact();
                                                setWeeklyTarget(count);
                                            }}
                                            className={`rounded-[1.2rem] border px-3 py-3 text-sm font-semibold transition-all ${weeklyTarget === count ? 'border-white/20 bg-white/[0.08] text-white' : 'border-white/8 bg-white/[0.03] text-white/55'}`}
                                        >
                                            {count}x
                                        </button>
                                    ))}
                                </div>
                            )}
                        </motion.section>

                        <motion.section
                            className="app-card rounded-[2rem] p-5"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.2 }}
                        >
                            <div className="mb-4 flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] border border-white/10 bg-white/[0.04]">
                                    <Bell size={18} className="text-white/70" />
                                </div>
                                <div>
                                    <p className="app-kicker">{t.habit.preview}</p>
                                    <p className="mt-1 text-sm text-white/55">
                                        {title.trim() || '...'} · {goalSummary} · {cadenceSummary}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        deviceHaptics.lightImpact();
                                        setIsHardMode((prev) => !prev);
                                    }}
                                    className="flex w-full items-center justify-between rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4 text-left"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-[0.9rem] border border-white/8 bg-white/[0.04]">
                                            <Shield size={16} className="text-white/60" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-white">{t.habit.hardMode}</p>
                                            <p className="mt-1 text-xs leading-5 text-white/45">{t.habit.hardModeDesc}</p>
                                        </div>
                                    </div>
                                    <span className={`inline-flex h-7 w-12 items-center rounded-full transition-colors ${isHardMode ? 'bg-red-500' : 'bg-white/15'}`}>
                                        <span className={`h-5 w-5 rounded-full bg-white transition-transform ${isHardMode ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </span>
                                </button>

                                <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            deviceHaptics.lightImpact();
                                            setIsReminderEnabled((prev) => !prev);
                                        }}
                                        className="flex w-full items-center justify-between text-left"
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
                                        <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
                                            <span className="text-sm text-white/60">{t.habit.reminderTime}</span>
                                            <input
                                                type="time"
                                                value={reminderTime}
                                                onChange={(e) => setReminderTime(e.target.value)}
                                                className="bg-transparent text-lg font-semibold tracking-[-0.03em] text-white outline-none"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.section>

                        <motion.button
                            type="submit"
                            disabled={!canSubmit}
                            className="flex h-14 w-full items-center justify-center rounded-full bg-white text-sm font-bold uppercase tracking-[0.18em] text-black transition-all hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-30 disabled:translate-y-0"
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.45, delay: 0.25 }}
                        >
                            {t.habit.create}
                        </motion.button>
                    </form>
                </div>
            </div>
        </main>
    );
}
