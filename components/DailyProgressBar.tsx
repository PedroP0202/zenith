'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../hooks/useTranslation';

interface DailyProgressBarProps {
    total: number;
    completed: number;
}

export default function DailyProgressBar({ total, completed }: DailyProgressBarProps) {
    const { t } = useTranslation();
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    const isFull = percentage === 100 && total > 0;

    return (
        <div className="w-full mb-10 px-1">
            <div className="flex justify-between items-end mb-3">
                <div className="flex flex-col">
                    <span className="text-[12px] font-bold text-white/40 uppercase tracking-widest mb-1">
                        {t.home.dailyBrief}
                    </span>
                    <h3 className="text-lg font-medium text-white/90">
                        {isFull ? 'Dia Completo! ✨' : `${completed} de ${total} concluídos`}
                    </h3>
                </div>
                <span className="text-2xl font-bold text-white/20">
                    {Math.round(percentage)}%
                </span>
            </div>

            <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden relative">
                <motion.div
                    className={`h-full rounded-full transition-colors duration-500 ${isFull ? 'bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)]' : 'bg-white/40'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ type: 'spring', stiffness: 50, damping: 15 }}
                />
                
                {/* Glow effect on completion */}
                <AnimatePresence>
                    {isFull && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 1, 0] }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="absolute inset-0 bg-white blur-md"
                        />
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
