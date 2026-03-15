'use client';
import { useTranslation } from '../hooks/useTranslation';
import { format, isSameDay } from 'date-fns';
import { pt, enUS } from 'date-fns/locale';
import { motion } from 'framer-motion';

interface ActivityHeatmapProps {
    data: { date: Date; count: number }[];
}

export default function ActivityHeatmap({ data }: ActivityHeatmapProps) {
    const { t, language } = useTranslation();
    const localeObj = language === 'pt' ? pt : enUS;
    const today = new Date();

    // Summary stats
    const totalDaysActive = data.filter(d => d.count > 0).length;
    const totalCheckins = data.reduce((s, d) => s + d.count, 0);
    const maxCount = Math.max(...data.map(d => d.count), 1);
    const weeksCount = Math.ceil(data.length / 7);

    // Build month label positions (first day of each month visible)
    const monthLabels: { col: number; label: string }[] = [];
    data.forEach((d, i) => {
        const col = Math.floor(i / 7);
        if (d.date.getDate() <= 7) {
            const label = format(d.date, 'MMM', { locale: localeObj });
            if (!monthLabels.find(m => m.label === label)) {
                monthLabels.push({ col, label });
            }
        }
    });

    // Calculate colour for a cell
    function cellColor(count: number, date: Date): string {
        if (count === 0) return 'rgba(255,255,255,0.05)';
        const t = Math.min(count / maxCount, 1);
        // Gradient: low=white/30 → mid=white/70 → high=green
        if (t <= 0.33) return `rgba(255,255,255,${0.15 + t * 0.6})`;
        if (t <= 0.66) return `rgba(100,240,170,${0.45 + t * 0.4})`;
        return `rgba(0,200,83,${0.7 + t * 0.3})`;
    }

    const CELL = 13;
    const GAP = 3;
    const totalWidth = weeksCount * (CELL + GAP) - GAP;

    return (
        <div className="w-full bg-[#111111] rounded-2xl p-5 mb-6">
            {/* Header row */}
            <div className="flex items-baseline justify-between mb-4">
                <span className="text-[12px] font-bold text-white/40 tracking-wider uppercase">
                    {t.stats.activity}
                </span>
                <span className="text-[12px] text-white/50">
                    <span className="text-white font-semibold">{totalDaysActive}</span> dias &nbsp;·&nbsp;{' '}
                    <span className="text-white font-semibold">{totalCheckins}</span> check-ins
                </span>
            </div>

            {/* Month labels */}
            <div className="relative overflow-x-auto">
                <div style={{ width: totalWidth, minWidth: totalWidth }}>
                    {/* Month name row */}
                    <div className="relative h-4 mb-1">
                        {monthLabels.map(({ col, label }) => (
                            <span
                                key={label}
                                className="absolute text-[9px] font-bold text-white/25 uppercase tracking-widest"
                                style={{ left: col * (CELL + GAP) }}
                            >
                                {label}
                            </span>
                        ))}
                    </div>

                    {/* Grid */}
                    <div
                        className="grid"
                        style={{
                            gridTemplateRows: `repeat(7, ${CELL}px)`,
                            gridAutoFlow: 'column',
                            gridAutoColumns: `${CELL}px`,
                            gap: GAP,
                        }}
                    >
                        {data.map((day, i) => {
                            const isToday = isSameDay(day.date, today);
                            const color = cellColor(day.count, day.date);
                            const label = `${format(day.date, 'EEE dd MMM', { locale: localeObj })} · ${day.count} check-in${day.count !== 1 ? 's' : ''}`;

                            return (
                                <motion.div
                                    key={i}
                                    title={label}
                                    className={`rounded-[3px] ${isToday ? 'ring-1 ring-white/40 ring-offset-1 ring-offset-[#111]' : ''}`}
                                    style={{
                                        width: CELL,
                                        height: CELL,
                                        backgroundColor: color,
                                    }}
                                    initial={{ opacity: 0, scale: 0.6 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{
                                        duration: 0.3,
                                        delay: Math.min(i * 0.003, 0.5),
                                        ease: 'easeOut',
                                    }}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5">
                <span className="text-[10px] text-white/25 font-medium">{t.stats.lessActivity}</span>
                <div className="flex gap-1">
                    {[0, 0.25, 0.5, 0.75, 1].map((t) => (
                        <div
                            key={t}
                            className="rounded-[2px]"
                            style={{
                                width: 11,
                                height: 11,
                                backgroundColor: t === 0
                                    ? 'rgba(255,255,255,0.05)'
                                    : t <= 0.33
                                        ? `rgba(255,255,255,${0.15 + t * 0.6})`
                                        : t <= 0.66
                                            ? `rgba(100,240,170,${0.45 + t * 0.4})`
                                            : `rgba(0,200,83,${0.7 + t * 0.3})`
                            }}
                        />
                    ))}
                </div>
                <span className="text-[10px] text-white/25 font-medium">{t.stats.moreActivity}</span>
            </div>
        </div>
    );
}
