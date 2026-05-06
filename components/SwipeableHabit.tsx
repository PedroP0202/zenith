'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useAnimation, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Check, Flame, Minus, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Habit } from '../types';
import ConfirmationModal from './ConfirmationModal';
import { useTranslation } from '../hooks/useTranslation';
import { deviceHaptics } from '../utils/haptics';
import { getHabitGoalType } from '../utils/habits';

interface SwipeableHabitProps {
    habit: Habit;
    streak: number;
    isComplete: boolean;
    progressValue: number;
    targetValue: number;
    progressLabel: string;
    onToggle: () => void;
    onDelete: () => void;
    onIncrement?: () => void;
    onDecrement?: () => void;
    comboMultiplier?: number;
}

export default function SwipeableHabit({
    habit,
    streak,
    isComplete,
    progressValue,
    targetValue,
    progressLabel,
    onToggle,
    onDelete,
    onIncrement,
    onDecrement,
    comboMultiplier = 1,
}: SwipeableHabitProps) {
    const x = useMotionValue(0);
    const { t } = useTranslation();
    const controls = useAnimation();
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showPulse, setShowPulse] = useState(false);
    const isQuantitative = getHabitGoalType(habit) === 'count';

    const trashOpacity = useTransform(x, [0, -75], [0, 1]);
    const trashScale = useTransform(x, [0, -75], [0.5, 1]);
    const backgroundRed = useTransform(x, [0, -100], ['rgba(239, 68, 68, 0)', 'rgba(239, 68, 68, 0.2)']);

    const handleDragEnd = async (_event: MouseEvent | TouchEvent | PointerEvent, { offset, velocity }: PanInfo) => {
        const swipeThreshold = -100;
        if (offset.x < swipeThreshold || velocity.x < -400) {
            deviceHaptics.heavyImpact();
            setShowDeleteModal(true);
            controls.start({ x: 0, transition: { type: 'spring', stiffness: 400, damping: 30 } });
        } else {
            controls.start({ x: 0, transition: { type: 'spring', stiffness: 400, damping: 30 } });
        }
    };

    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        await controls.start({ x: -window.innerWidth, transition: { type: 'spring', stiffness: 200, damping: 20 } });
        onDelete();
        setShowDeleteModal(false);
    };

    if (isDeleting) return null;

    let flameColor = 'text-white/55';
    let flameDoneColor = 'text-white/28';

    if (streak >= 365) {
        flameColor = 'text-yellow-300/85';
        flameDoneColor = 'text-yellow-300/35';
    } else if (streak >= 90) {
        flameColor = 'text-white/70';
        flameDoneColor = 'text-white/35';
    } else if (streak >= 30) {
        flameColor = 'text-amber-300/75';
        flameDoneColor = 'text-amber-300/32';
    }

    return (
        <motion.div
            className="relative group will-animate overflow-hidden rounded-2xl"
            style={{ touchAction: 'pan-y' }}
            layout
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            transition={{ duration: 0.45, type: 'spring', bounce: 0.25 }}
        >
            <motion.div
                className="absolute inset-0 flex items-center justify-end rounded-2xl px-6"
                style={{ backgroundColor: backgroundRed }}
            >
                <motion.div style={{ opacity: trashOpacity, scale: trashScale }}>
                    <Trash2 className="text-red-500" size={26} />
                </motion.div>
            </motion.div>

            <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={{ left: 0.5, right: 0.02 }}
                dragMomentum={false}
                style={{ x }}
                onDragEnd={handleDragEnd}
                animate={controls}
                whileTap={{ scale: 0.975 }}
                className={`relative z-10 flex items-center justify-between rounded-2xl border p-4 transition-colors duration-300 ${isComplete ? 'bg-white/[0.02] border-white/[0.05]' : 'bg-white/[0.032] border-white/[0.08] hover:bg-white/[0.05]'}`}
            >
                <Link href={`/habit/detail?id=${habit.id}`} className="card-press block min-w-0 flex-1 pr-4">
                    <div className="flex items-center gap-3">
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-sm font-semibold uppercase tracking-[0.12em] ${isComplete ? 'border-white/[0.08] bg-white/[0.025] text-white/35' : 'border-white/[0.1] bg-white/[0.04] text-white/70'}`}>
                            {habit.title.slice(0, 1)}
                        </div>
                        <div className="min-w-0">
                            <span className={`block truncate text-base font-semibold tracking-[-0.02em] transition-colors duration-300 sm:text-[1.05rem] ${isComplete ? 'text-white/55' : 'text-white/92'}`}>
                                {habit.title}
                            </span>
                            <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                {streak > 0 && (
                                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors duration-300 ${isComplete ? `border-white/[0.06] bg-white/[0.02] ${flameDoneColor}` : `border-white/[0.08] bg-white/[0.03] ${flameColor}`}`}>
                                        <Flame size={12} strokeWidth={2.3} />
                                        {streak} {streak === 1 ? t.habit.day : t.habit.days}
                                    </span>
                                )}
                                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.1em] ${isComplete ? 'border-white/[0.08] bg-white/[0.03] text-white/55' : 'border-white/[0.06] bg-white/[0.025] text-white/38'}`}>
                                    {progressLabel}
                                </span>
                            </div>
                        </div>
                    </div>
                </Link>

                {isQuantitative ? (
                    <div className={`relative flex shrink-0 items-center gap-1 rounded-xl border p-1 ${isComplete ? 'border-white/10 bg-white/[0.05]' : 'border-white/8 bg-white/[0.025]'}`}>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onDecrement?.();
                            }}
                            disabled={progressValue <= 0}
                            className="flex h-10 w-10 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/8 disabled:opacity-30"
                            aria-label={t.habit.decrease}
                        >
                            <Minus size={16} />
                        </button>

                        <div className="min-w-[4.6rem] text-center">
                            <p className={`text-base font-semibold tracking-[-0.05em] ${isComplete ? 'text-white' : 'text-white/85'}`}>
                                {progressValue}/{targetValue}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onIncrement?.();

                                if (!isComplete && progressValue + 1 >= targetValue) {
                                    if (comboMultiplier >= 3) deviceHaptics.heavyImpact();
                                    else if (comboMultiplier === 2) deviceHaptics.mediumImpact();
                                    else deviceHaptics.success();
                                    setShowPulse(true);
                                    setTimeout(() => setShowPulse(false), 600);
                                } else {
                                    deviceHaptics.lightImpact();
                                }
                            }}
                            disabled={progressValue >= targetValue}
                            className={`relative flex h-10 w-10 items-center justify-center rounded-lg transition ${isComplete ? 'bg-white text-black' : 'bg-white/[0.06] text-white hover:bg-white/[0.1]'} disabled:opacity-40`}
                            aria-label={t.habit.increase}
                        >
                            <Plus size={16} />
                        </button>

                        {showPulse && (
                            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                <div className={`h-12 w-12 rounded-[1rem] animate-pulse-glow ${comboMultiplier >= 3 ? 'bg-orange-500/30' : comboMultiplier === 2 ? 'bg-yellow-500/30' : 'bg-white/30'}`} />
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="relative shrink-0">
                        <motion.button
                            whileTap={{ scale: 0.82 }}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onToggle();

                                if (!isComplete) {
                                    if (comboMultiplier >= 3) deviceHaptics.heavyImpact();
                                    else if (comboMultiplier === 2) deviceHaptics.mediumImpact();
                                    else deviceHaptics.success();
                                    deviceHaptics.playSuccessSound(comboMultiplier);
                                    setShowPulse(true);
                                    setTimeout(() => setShowPulse(false), 600);
                                } else {
                                    deviceHaptics.lightImpact();
                                }
                            }}
                            className={`relative z-10 flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-xl transition-colors duration-300 ${isComplete ? 'bg-white text-black' : 'border border-white/10 bg-white/[0.025] text-transparent hover:border-white/24 hover:bg-white/[0.05]'}`}
                            aria-label="Marcar como feito"
                        >
                            <motion.div
                                initial={false}
                                animate={isComplete ? { scale: [0.6, 1.2, 1], opacity: 1 } : { scale: 0.5, opacity: 0 }}
                                transition={{ duration: 0.35, type: 'spring', stiffness: 500, damping: 22 }}
                            >
                                <Check size={24} strokeWidth={3} />
                            </motion.div>
                        </motion.button>

                        {showPulse && (
                            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                <div className={`h-14 w-14 rounded-[1.1rem] animate-pulse-glow ${comboMultiplier >= 3 ? 'bg-orange-500/30' : comboMultiplier === 2 ? 'bg-yellow-500/30' : 'bg-white/30'}`} />
                            </div>
                        )}
                    </div>
                )}
            </motion.div>

            {typeof document !== 'undefined' && createPortal(
                <ConfirmationModal
                    isOpen={showDeleteModal}
                    onClose={() => setShowDeleteModal(false)}
                    onConfirm={handleConfirmDelete}
                    title={t.habit.deleteWarning}
                    description={t.habit.deleteDesc}
                    confirmLabel={t.common.delete}
                    cancelLabel={t.common.cancel}
                />,
                document.body
            )}
        </motion.div>
    );
}
