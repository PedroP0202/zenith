"use client";
import { useState, useEffect } from 'react';
import { useStore } from '../../../store/useStore';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import { motion, AnimatePresence } from 'framer-motion';

export default function NewHabit() {
    const { t } = useTranslation();
    const [title, setTitle] = useState('');
    const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
    const [isHardMode, setIsHardMode] = useState(false);
    const [isReminderEnabled, setIsReminderEnabled] = useState(false);
    const [reminderTime, setReminderTime] = useState('09:00');
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const { addHabit } = useStore();
    const router = useRouter();

    const suggestions = t.habit.suggestions || [
        "Ler 10 páginas",
        "Meditar 5 minutos",
        "Treinar 30 minutos"
    ];

    useEffect(() => {
        if (!title.trim()) {
            const interval = setInterval(() => {
                setPlaceholderIndex((prev) => (prev + 1) % suggestions.length);
            }, 3000);
            return () => clearInterval(interval);
        }
    }, [title, suggestions.length]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (title.trim() && selectedDays.length > 0) {
            const finalReminderTime = isReminderEnabled ? reminderTime : undefined;
            addHabit(title.trim(), selectedDays, isHardMode, finalReminderTime);
            router.push('/');
        }
    };

    const toggleDay = (dayIndex: number) => {
        if (selectedDays.includes(dayIndex)) {
            setSelectedDays(prev => prev.filter(d => d !== dayIndex));
        } else {
            setSelectedDays(prev => [...prev, dayIndex].sort());
        }
    };

    const daysOfWeek = t.habit.daysOfWeek.map((label, index) => ({ label, index }));

    return (
        <main className="min-h-[100dvh] bg-black text-white p-6 font-sans flex flex-col items-center">
            <div className="w-full max-w-md pt-8">
                <button
                    onClick={() => router.back()}
                    className="mb-12 h-12 w-12 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors -ml-3"
                >
                    <ChevronLeft size={24} />
                </button>

                <form onSubmit={handleSubmit} className="flex flex-col gap-8">
                    <label htmlFor="title" className="text-2xl font-bold tracking-tight text-white/90">
                        {t.habit.questionTitle}
                    </label>

                    <div className="relative">
                        <input
                            id="title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            autoFocus
                            className="w-full bg-transparent border-b-2 border-white/20 focus:border-[var(--zenith-active)] text-2xl py-4 outline-none transition-colors relative z-10"
                            autoComplete="off"
                        />
                        <AnimatePresence mode="wait">
                            {!title && (
                                <motion.div
                                    key={placeholderIndex}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -15, filter: "blur(4px)" }}
                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                    className="absolute left-0 top-1/2 -translate-y-1/2 text-2xl text-white/20 pointer-events-none tracking-tight font-medium w-full truncate pr-4"
                                >
                                    Ex: {suggestions[placeholderIndex]}...
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="mt-4">
                        <label className="text-sm font-medium text-white/50 mb-4 block uppercase tracking-widest">
                            {t.habit.frequency}
                        </label>
                        <div className="flex justify-between">
                            {daysOfWeek.map(day => {
                                const isSelected = selectedDays.includes(day.index);
                                return (
                                    <button
                                        key={day.index}
                                        type="button"
                                        onClick={() => toggleDay(day.index)}
                                        className={`h-11 w-11 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${isSelected
                                            ? 'bg-white text-black'
                                            : 'bg-[#111111] text-white/40 hover:text-white/80'
                                            }`}
                                    >
                                        {day.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                        <div className="flex flex-col pr-4">
                            <label className="text-sm font-bold text-white/90">
                                {t.habit.hardMode}
                            </label>
                            <span className="text-xs text-white/40 mt-1 leading-snug">
                                {t.habit.hardModeDesc}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsHardMode(!isHardMode)}
                            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isHardMode ? 'bg-red-500' : 'bg-white/20'}`}
                            role="switch"
                            aria-checked={isHardMode}
                        >
                            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isHardMode ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    <div className="mt-2 flex flex-col p-4 rounded-2xl bg-white/5 border border-white/5">
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
                                onClick={() => setIsReminderEnabled(!isReminderEnabled)}
                                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isReminderEnabled ? 'bg-white' : 'bg-white/20'}`}
                                role="switch"
                                aria-checked={isReminderEnabled}
                            >
                                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full shadow ring-0 transition duration-200 ease-in-out ${isReminderEnabled ? 'translate-x-5 bg-black' : 'translate-x-0 bg-white'}`} />
                            </button>
                        </div>

                        {isReminderEnabled && (
                            <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                                <span className="text-sm font-medium text-white/60">{t.habit.reminderTime}</span>
                                <input
                                    type="time"
                                    value={reminderTime}
                                    onChange={(e) => setReminderTime(e.target.value)}
                                    className="bg-transparent text-white text-lg font-bold outline-none border-b border-white/20 focus:border-white transition-colors"
                                />
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={!title.trim()}
                        className="mt-8 bg-white text-black font-bold text-lg py-4 rounded-full disabled:opacity-30 disabled:scale-100 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        {t.habit.create}
                    </button>
                </form>
            </div>
        </main>
    );
}
