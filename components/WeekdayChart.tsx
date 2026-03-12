'use client';
import { useTranslation } from '../hooks/useTranslation';

interface WeekdayChartProps {
    distribution: number[]; // Array of 7 numbers [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
}

export default function WeekdayChart({ distribution }: WeekdayChartProps) {
    const { t } = useTranslation();
    const maxVal = Math.max(...distribution, 1); // Avoid div by zero

    // Use translations for day initials if available, else fallback
    const daysArr = t.habit?.daysOfWeek || ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    return (
        <div className="w-full bg-[#111111] rounded-3xl p-5 mb-6">
            <span className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-6 block">
                {t.stats.productivityByDay}
            </span>
            <div className="flex items-end justify-between h-32 gap-2 mt-4">
                {distribution.map((val, i) => {
                    const heightPercent = val > 0 ? Math.max((val / maxVal) * 100, 4) : 0;
                    return (
                        <div key={i} className="flex flex-col items-center flex-1 gap-2 h-full">
                            <div className="w-full max-w-[24px] bg-white/5 rounded-t-lg relative flex items-end overflow-hidden" style={{ height: '100%' }}>
                                <div
                                    className="w-full bg-white/80 rounded-t-lg transition-all duration-700 ease-out"
                                    style={{ height: `${heightPercent}%` }}
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
