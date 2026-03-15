'use client';
import { useStore } from '../../../store/useStore';
import { calculateStreak } from '../../../utils/streak';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, Trash2, Loader2 } from 'lucide-react';
import { Suspense, useState, useEffect, useRef } from 'react';

import { Habit, LogEntry } from '../../../types';
import InfiniteCalendar from '../../../components/InfiniteCalendar';
import { useTranslation } from '../../../hooks/useTranslation';
import ConfirmationModal from '../../../components/ConfirmationModal';
import { deviceHaptics } from '../../../utils/haptics';
import { motion } from 'framer-motion';

function HabitDetailContent() {
    const { t } = useTranslation();
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const router = useRouter();
    const { habits, logs, removeHabit, editHabit, editHabitReminder, toggleHabitLog } = useStore();

    const [localTitle, setLocalTitle] = useState('');
    const [isReminderEnabled, setIsReminderEnabled] = useState(false);
    const [localReminderTime, setLocalReminderTime] = useState('09:00');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const habit = habits.find((h: Habit) => h.id === id);
    const habitLogs = logs.filter((l: LogEntry) => l.habitId === id);
    const streak = calculateStreak(habitLogs, habit?.frequency);

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

    if (!id) return <p>{t.habit.notFound}</p>;

    if (!habit) {
        return (
            <main className="min-h-[100dvh] bg-black text-white flex items-center justify-center">
                <p>{t.habit.notFound}</p>
            </main>
        );
    }

    const handleDelete = () => {
        deviceHaptics.heavyImpact();
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = () => {
        removeHabit(habit.id);
        router.push('/');
    };

    return (
        <main className="min-h-[100dvh] bg-black text-white p-6 font-sans flex flex-col items-center">
            <div className="w-full max-w-md pt-8 flex flex-col h-full min-h-[85vh]">
                <motion.header
                    className="flex justify-between items-center mb-16"
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, type: 'spring', bounce: 0.2 }}
                >
                    <button
                        onClick={() => {
                            deviceHaptics.lightImpact();
                            router.back();
                        }}
                        className="h-12 w-12 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors -ml-3 active:scale-90"
                    >
                        <ChevronLeft size={24} />
                    </button>

                    <button
                        onClick={handleDelete}
                        className="h-12 w-12 flex items-center justify-center rounded-full text-red-500/70 hover:text-red-500 hover:bg-red-500/10 transition-colors active:scale-90"
                        aria-label={t.common.delete}
                    >
                        <Trash2 size={20} />
                    </button>
                </motion.header>

                <div className="flex-1 flex flex-col items-center justify-center text-center">
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
                            if (e.key === 'Enter') {
                                inputRef.current?.blur();
                            }
                        }}
                        className="gap-2 text-3xl font-medium text-white/50 focus:text-white/90 transition-colors mb-12 bg-transparent border-none outline-none text-center w-full caret-white"
                        aria-label={t.habit.editTitle}
                    />

                    {habit && (
                        <InfiniteCalendar
                            habitLogs={habitLogs}
                            frequency={habit.frequency}
                            isHardMode={habit.isHardMode}
                            onDayClick={(date) => {
                                if (!habit) return;

                                const now = new Date();
                                const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                                const cellZero = date.getTime();

                                // Block future date clicks unconditionally
                                if (cellZero > todayZero) {
                                    return;
                                }

                                // Hard Mode: Allow only 'Today', block past days
                                if (habit.isHardMode && cellZero < todayZero) {
                                    return;
                                }

                                // Prevent clicking on non-scheduled days
                                const dayOfWeek = date.getDay();
                                if (habit.frequency && !habit.frequency.includes(dayOfWeek)) {
                                    return;
                                }

                                // Trigger Zustand store
                                deviceHaptics.lightImpact();
                                toggleHabitLog(habit.id, date.getTime());
                            }}
                        />
                    )}

                    <motion.div
                        className="relative flex flex-col items-center justify-center"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6, delay: 0.15, type: 'spring', bounce: 0.25 }}
                    >

                        <span className="text-[9rem] leading-none font-black tracking-tighter text-white drop-shadow-[0_0_40px_rgba(255,255,255,0.15)]">
                            {streak}
                        </span>
                        <div className="flex items-center gap-3 mt-4">
                            <span className="text-xl font-medium text-white/40 uppercase tracking-widest">
                                {streak === 1 ? t.habit.streakDay : t.habit.streakDays}
                            </span>
                            {streak > 0 && (
                                <span className="text-2xl animate-bounce">🔥</span>
                            )}
                        </div>
                    </motion.div>

                    {/* Lembrete Secção (Specific Notification) */}
                    <motion.div
                        className="mt-12 w-full flex flex-col p-4 rounded-2xl bg-white/5 border border-white/5 text-left"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, delay: 0.25, type: 'spring', bounce: 0.15 }}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col pr-4">
                                <label className="text-sm font-bold text-white/90">
                                    {t.habit.reminder}
                                </label>
                                <span className="text-xs text-white/40 mt-1 leading-snug">
                                    {t.habit.reminderDesc}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    deviceHaptics.lightImpact();
                                    const newState = !isReminderEnabled;
                                    setIsReminderEnabled(newState);
                                    if (newState) {
                                        editHabitReminder(habit.id, localReminderTime);
                                    } else {
                                        editHabitReminder(habit.id, undefined);
                                    }
                                }}
                                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isReminderEnabled ? 'bg-white' : 'bg-white/20'}`}
                                role="switch"
                                aria-checked={isReminderEnabled}
                            >
                                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full shadow ring-0 transition duration-200 ease-in-out ${isReminderEnabled ? 'translate-x-5 bg-black' : 'translate-x-0 bg-white'}`} />
                            </button>
                        </div>

                        {isReminderEnabled && (
                            <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                                <span className="text-sm font-medium text-white/60">{t.habit.editTime}</span>
                                <input
                                    type="time"
                                    value={localReminderTime}
                                    onChange={(e) => {
                                        setLocalReminderTime(e.target.value);
                                        editHabitReminder(habit.id, e.target.value);
                                    }}
                                    className="bg-transparent text-white text-lg font-bold outline-none border-b border-white/20 focus:border-white transition-colors"
                                />
                            </div>
                        )}
                    </motion.div>
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
