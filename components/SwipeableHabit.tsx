'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useAnimation, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Check, Trash2 } from 'lucide-react';
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
}

export default function SwipeableHabit({ habit, streak, doneToday, onToggle, onDelete }: SwipeableHabitProps) {
    const x = useMotionValue(0);
    const { t } = useTranslation();
    const controls = useAnimation();
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showPulse, setShowPulse] = useState(false);


    const trashOpacity = useTransform(x, [0, -75], [0, 1]);
    const trashScale = useTransform(x, [0, -75], [0.5, 1]);
    const backgroundRed = useTransform(x, [0, -100], ['rgba(239, 68, 68, 0)', 'rgba(239, 68, 68, 0.2)']);

    const handleDragEnd = async (e: MouseEvent | TouchEvent | PointerEvent, { offset, velocity }: PanInfo) => {
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
            className="relative group mb-4 will-animate overflow-hidden rounded-3xl"
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
                dragElastic={{ left: 0.7, right: 0.05 }}
                style={{ x }}
                onDragEnd={handleDragEnd}
                animate={controls}
                whileTap={{ scale: 0.975 }}
                className={`relative z-10 py-4 px-5 rounded-3xl transition-all duration-300 flex items-center justify-between border ${doneToday ? 'bg-[#141414] border-white/[0.04]' : 'bg-[#0e0e0e] border-transparent hover:border-white/[0.06]'}`}
            >
                <Link href={`/habit/detail?id=${habit.id}`} className="flex-1 min-w-0 pr-4 block card-press">
                    <div className="flex flex-col">
                        <span className={`text-lg font-medium truncate mb-0.5 transition-colors duration-300 ${doneToday ? 'text-white/40' : 'text-white/90'}`}>
                            {habit.title}
                        </span>
                        <div className="flex items-center gap-2">
                            {streak > 0 ? (
                                <span className={`text-xs font-bold flex items-center gap-1 transition-colors duration-300 ${doneToday ? flameDoneColor : flameColor}`}>
                                    🔥 {streak} {streak === 1 ? t.habit.day : t.habit.days}
                                </span>
                            ) : (
                                <span className="text-xs font-medium text-white/20">0 {t.habit.days}</span>
                            )}
                        </div>
                    </div>
                </Link>

                {/* The checkmark button */}
                <div className="relative shrink-0">
                    <motion.button
                        whileTap={{ scale: 0.82 }}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();

                            // Fire toggle immediately for instant response
                            onToggle();

                            if (!doneToday) {
                                deviceHaptics.success();
                                deviceHaptics.playSuccessSound();
                                setShowPulse(true);
                                setTimeout(() => setShowPulse(false), 600);
                            } else {
                                deviceHaptics.lightImpact();
                            }
                        }}
                        className={`relative z-10 h-12 w-12 rounded-[16px] flex items-center justify-center transition-all duration-300 ${doneToday ? `bg-white text-black ${glowShadow}` : 'bg-transparent border border-white/10 text-transparent hover:border-white/30'}`}
                        aria-label="Marcar como feito"
                    >
                        <motion.div
                            initial={false}
                            animate={doneToday ? { scale: [0.6, 1.2, 1], opacity: 1 } : { scale: 0.5, opacity: 0 }}
                            transition={{ duration: 0.35, type: 'spring', stiffness: 500, damping: 22 }}
                        >
                            <Check size={22} strokeWidth={3} />
                        </motion.div>
                    </motion.button>

                    {/* Completion pulse ring */}
                    {showPulse && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-12 h-12 rounded-[16px] animate-pulse-glow bg-white/30" />
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
