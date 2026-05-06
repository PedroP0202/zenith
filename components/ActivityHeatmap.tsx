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
    const activityWord = language === 'pt' ? 'registo' : 'check-in';
    const activityWordPlural = language === 'pt' ? 'registos' : 'check-ins';

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
        if (t <= 0.33) return `rgba(255,255,255,${0.12 + t * 0.45})`;
        if (t <= 0.66) return `rgba(16,185,129,${0.28 + t * 0.34})`;
        return `rgba(16,185,129,${0.56 + t * 0.22})`;
    }

    const CELL = 13;
    const GAP = 3;
    const totalWidth = weeksCount * (CELL + GAP) - GAP;

    return (
        <div className="app-card-soft rounded-[28px] p-5 md:p-6">
            <div className="mb-5 flex items-baseline justify-between gap-4">
                <span className="app-kicker">{t.stats.activity}</span>
                <span className="text-[12px] text-white/48">
                    <span className="font-semibold text-white/80">{totalDaysActive}</span> {t.stats.daysLabel}
                    {' · '}
                    <span className="font-semibold text-white/80">{totalCheckins}</span> {t.stats.checkinsLabel}
                </span>
            </div>

            <div className="scroll-smooth-ios relative overflow-x-auto -mx-1 px-1">
                <div style={{ width: totalWidth, minWidth: totalWidth }}>
                    <div className="relative h-4 mb-1">
                        {monthLabels.map(({ col, label }) => (
                            <span
                                key={label}
                                className="absolute text-[9px] font-bold uppercase tracking-widest text-white/24"
                                style={{ left: col * (CELL + GAP) }}
                            >
                                {label}
                            </span>
                        ))}
                    </div>

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
                            const label = `${format(day.date, 'EEE dd MMM', { locale: localeObj })} · ${day.count} ${
                                day.count === 1 ? activityWord : activityWordPlural
                            }`;

                            return (
                                <motion.div
                                    key={i}
                                    title={label}
                                    className={`rounded-[4px] ${isToday ? 'ring-1 ring-white/30 ring-offset-1 ring-offset-[#0d0d0f]' : ''}`}
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

            <div className="mt-4 flex items-center gap-4 border-t border-white/5 pt-4">
                <span className="text-[10px] font-medium text-white/25">{t.stats.lessActivity}</span>
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
                                            ? `rgba(255,255,255,${0.12 + t * 0.45})`
                                            : t <= 0.66
                                                ? `rgba(16,185,129,${0.28 + t * 0.34})`
                                                : `rgba(16,185,129,${0.56 + t * 0.22})`
                            }}
                        />
                    ))}
                </div>
                <span className="text-[10px] font-medium text-white/25">{t.stats.moreActivity}</span>
            </div>
        </div>
    );
}
