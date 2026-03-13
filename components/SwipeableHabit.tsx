'use client';

import { useState } from 'react';
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

    // Transform x into opacity/scale for the trash icon
    const trashOpacity = useTransform(x, [0, -75], [0, 1]);
    const trashScale = useTransform(x, [0, -75], [0.5, 1]);
    const backgroundRed = useTransform(x, [0, -100], ['rgba(239, 68, 68, 0)', 'rgba(239, 68, 68, 0.2)']);

    const handleDragEnd = async (e: MouseEvent | TouchEvent | PointerEvent, { offset, velocity }: PanInfo) => {
        const swipeThreshold = -100;

        // Check if dragged far enough to left
        if (offset.x < swipeThreshold || velocity.x < -400) {
            // Trigger heavy haptic for destructive intent
            deviceHaptics.heavyImpact();

            // Show confirmation modal instead of immediate delete
            setShowDeleteModal(true);

            // Snap back for now, let onDelete happen after confirmation
            controls.start({
                x: 0,
                transition: { type: 'spring', stiffness: 400, damping: 30 }
            });
        } else {
            // Snap back
            controls.start({
                x: 0,
                transition: { type: 'spring', stiffness: 400, damping: 30 }
            });
        }
    };

    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        await controls.start({
            x: -window.innerWidth,
            transition: { type: 'spring', stiffness: 200, damping: 20 }
        });
        onDelete();
        setShowDeleteModal(false);
    };

    if (isDeleting) return null;

    // Atmospheric Gamification (V2.0)
    let glowShadow = 'shadow-[0_0_15px_rgba(255,255,255,0.1)]'; // Base (Neutro)
    let flameColor = 'text-orange-500/80';
    let flameDoneColor = 'text-orange-500/30';

    if (streak >= 365) {
        glowShadow = 'shadow-[0_0_20px_rgba(255,215,0,0.6)]'; // Ouro
        flameColor = 'text-yellow-500/90';
        flameDoneColor = 'text-yellow-500/40';
    } else if (streak >= 90) {
        glowShadow = 'shadow-[0_0_18px_rgba(192,192,192,0.5)]'; // Prata
        flameColor = 'text-gray-400/90';
        flameDoneColor = 'text-gray-400/40';
    } else if (streak >= 30) {
        glowShadow = 'shadow-[0_0_15px_rgba(184,115,51,0.4)]'; // Bronze
        flameColor = 'text-orange-700/90';
        flameDoneColor = 'text-orange-700/40';
    }

    return (
        <motion.div
            className="relative group"
            layout
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            transition={{ duration: 0.4, type: 'spring', bounce: 0.3 }}
        >
            {/* Background Trash Icon */}
            <motion.div
                className="absolute inset-0 rounded-3xl flex items-center justify-end px-6 my-1"
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
                whileTap={{ scale: 0.98 }}
                className={`relative z-10 py-4 px-5 rounded-3xl transition-colors duration-400 flex items-center justify-between ${doneToday ? 'bg-[#151515]' : 'bg-[#0e0e0e]'}`}
            >
                <Link href={`/habit/detail?id=${habit.id}`} className="flex-1 min-w-0 pr-4 block">
                    <div className="flex flex-col">
                        <span className={`text-lg font-medium truncate mb-0.5 transition-colors duration-400 ${doneToday ? 'text-white/40' : 'text-white/90'}`}>
                            {habit.title}
                        </span>
                        <div className="flex items-center gap-2">
                            {streak > 0 ? (
                                <span className={`text-xs font-bold flex items-center gap-1 transition-colors duration-400 ${doneToday ? flameDoneColor : flameColor}`}>
                                    🔥 {streak} {streak === 1 ? 'dia' : 'dias'}
                                </span>
                            ) : (
                                <span className="text-xs font-medium text-white/20">0 dias</span>
                            )}
                        </div>
                    </div>
                </Link>

                {/* The checkmark button */}
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // Provide tactile feedback on toggle
                        deviceHaptics.mediumImpact();

                        // Play sound ONLY when marking as DONE
                        if (!doneToday) {
                            deviceHaptics.playSuccessSound();
                        }

                        onToggle();
                    }}
                    className={`h-12 w-12 rounded-[18px] flex items-center justify-center shrink-0 transition-all duration-500 z-20 ${doneToday ? `bg-white text-black scale-100 ${glowShadow}` : 'bg-transparent border border-white/10 text-transparent hover:border-white/30'}`}
                    aria-label="Marcar como feito"
                >
                    <Check size={22} className={`transition-all duration-400 ${doneToday ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} strokeWidth={3} />
                </button>

            </motion.div>

            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleConfirmDelete}
                title={t.habit.deleteWarning}
                description={t.habit.deleteDesc}
                confirmLabel={t.common.delete}
                cancelLabel={t.common.cancel}
            />
        </motion.div>
    );
}
