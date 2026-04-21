'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useAnimation, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Check, Flame, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Habit } from '../types';
import ConfirmationModal from './ConfirmationModal';
import { useTranslation } from '../hooks/useTranslation';
import { deviceHaptics } from '../utils/haptics';

interface SwipeableHabitProps {
    habit: Habit;
    streak: number;
    doneToday: boolean;
    onToggle: () => void;
    onDelete: () => void;
    comboMultiplier?: number;
}

export default function SwipeableHabit({ habit, streak, doneToday, onToggle, onDelete, comboMultiplier = 1 }: SwipeableHabitProps) {
    const x = useMotionValue(0);
    const { t } = useTranslation();
    const controls = useAnimation();
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showPulse, setShowPulse] = useState(false);


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

    // Atmospheric Gamification (V2.0)
    let glowShadow = 'shadow-[0_0_15px_rgba(255,255,255,0.1)]';
    let flameColor = 'text-orange-500/80';
    let flameDoneColor = 'text-orange-500/30';

    if (streak >= 365) {
        glowShadow = 'shadow-[0_0_20px_rgba(255,215,0,0.6)]';
        flameColor = 'text-yellow-500/90';
        flameDoneColor = 'text-yellow-500/40';
    } else if (streak >= 90) {
        glowShadow = 'shadow-[0_0_18px_rgba(192,192,192,0.5)]';
        flameColor = 'text-gray-400/90';
        flameDoneColor = 'text-gray-400/40';
    } else if (streak >= 30) {
        glowShadow = 'shadow-[0_0_15px_rgba(184,115,51,0.4)]';
        flameColor = 'text-orange-700/90';
        flameDoneColor = 'text-orange-700/40';
    }

    return (
        <motion.div
            className="relative group will-animate overflow-hidden rounded-3xl"
            style={{ touchAction: 'pan-y' }}
            layout
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            transition={{ duration: 0.45, type: 'spring', bounce: 0.25 }}
        >
            {/* Background Trash Icon */}
            <motion.div
                className="absolute inset-0 rounded-3xl flex items-center justify-end px-6"
                style={{ backgroundColor: backgroundRed }}
            >
                <motion.div style={{ opacity: trashOpacity, scale: trashScale }}>
                    <Trash2 className="text-red-500" size={26} />
                </motion.div>
            </motion.div>

            {/* Foreground Draggable Card */}
            <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={{ left: 0.5, right: 0.02 }}
                dragMomentum={false}
                style={{ x }}
                onDragEnd={handleDragEnd}
                animate={controls}
                whileTap={{ scale: 0.975 }}
                className={`relative z-10 flex items-center justify-between rounded-[1.75rem] border p-4 transition-all duration-300 backdrop-blur-xl ${doneToday ? 'bg-white/[0.025] border-white/[0.04] shadow-none' : 'bg-white/[0.04] border-white/[0.08] shadow-glass hover:bg-white/[0.055]'}`}
            >
                <Link href={`/habit/detail?id=${habit.id}`} className="card-press block min-w-0 flex-1 pr-4">
                    <div className="flex items-center gap-3">
                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] border text-sm font-bold uppercase tracking-[0.16em] ${doneToday ? 'border-white/[0.08] bg-white/[0.03] text-white/35' : 'border-white/[0.12] bg-white/[0.05] text-white/70'}`}>
                            {habit.title.slice(0, 1)}
                        </div>
                        <div className="min-w-0">
                            <span className={`block truncate text-base font-semibold tracking-[-0.02em] transition-colors duration-300 sm:text-[1.05rem] ${doneToday ? 'text-white/45' : 'text-white/92'}`}>
                                {habit.title}
                            </span>
                            <div className="mt-1.5 flex items-center gap-2">
                                {streak > 0 ? (
                                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors duration-300 ${doneToday ? `border-white/[0.06] bg-white/[0.03] ${flameDoneColor}` : `border-white/[0.08] bg-white/[0.04] ${flameColor}`}`}>
                                        <Flame size={12} strokeWidth={2.3} />
                                        {streak} {streak === 1 ? t.habit.day : t.habit.days}
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-white/30">
                                        <Flame size={12} strokeWidth={2.3} />
                                        0 {t.habit.days}
                                    </span>
                                )}
                                {doneToday && (
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/28">
                                        {t.common.today}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </Link>

                <div className="relative shrink-0">
                    <motion.button
                        whileTap={{ scale: 0.82 }}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();

                            onToggle();

                            if (!doneToday) {
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
                        className={`relative z-10 flex h-14 w-14 items-center justify-center rounded-[1.1rem] transition-all duration-300 ${doneToday ? `bg-white text-black ${glowShadow}` : 'bg-white/[0.03] border border-white/10 text-transparent hover:border-white/30 hover:bg-white/[0.06]'}`}
                        aria-label="Marcar como feito"
                    >
                        <motion.div
                            initial={false}
                            animate={doneToday ? { scale: [0.6, 1.2, 1], opacity: 1 } : { scale: 0.5, opacity: 0 }}
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
