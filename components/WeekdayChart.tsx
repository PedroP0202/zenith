import { useTranslation } from '../hooks/useTranslation';
import { motion } from 'framer-motion';

interface WeekdayChartProps {
    distribution: number[]; // Array of 7 numbers [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
}

export default function WeekdayChart({ distribution }: WeekdayChartProps) {
    const { t } = useTranslation();
    const maxVal = Math.max(...distribution, 1); // Avoid div by zero

    // Use translations for day initials if available, else fallback
    const daysArr = t.habit?.daysOfWeek || ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    return (
        <div className="w-full bg-[#111111] rounded-3xl p-5 mb-6 overflow-hidden">
            <span className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-6 block">
                {t.stats.productivityByDay}
            </span>
            <div className="flex items-end justify-between h-32 gap-2 mt-4 px-1">
                {distribution.map((val, i) => {
                    const heightPercent = val > 0 ? Math.max((val / maxVal) * 100, 4) : 0;
                    return (
                        <div key={i} className="flex flex-col items-center flex-1 gap-2 h-full">
                            <div className="w-full max-w-[24px] bg-white/5 rounded-t-lg relative flex items-end overflow-hidden" style={{ height: '100%' }}>
                                <motion.div
                                    initial={{ height: 0, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                                    animate={{
                                        height: `${heightPercent}%`,
                                        backgroundColor: [
                                            'rgba(255, 255, 255, 0.1)',
                                            'rgba(255, 255, 255, 0.9)',
                                            'rgba(255, 255, 255, 0.8)'
                                        ]
                                    }}
                                    transition={{
                                        duration: 1.2,
                                        delay: i * 0.1,
                                        ease: [0.34, 1.56, 0.64, 1], // Custom spring-like ease
                                        backgroundColor: { duration: 1.5, times: [0, 0.5, 1] }
                                    }}
                                    className="w-full rounded-t-lg shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                                    title={`${val} ${val === 1 ? t.stats.day : t.stats.days}`}
                                />
                            </div>
                            <span className="text-[10px] text-white/50 font-bold tracking-widest uppercase">
                                {daysArr[i]}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
