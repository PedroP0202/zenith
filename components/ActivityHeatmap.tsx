'use client';
import { useTranslation } from '../hooks/useTranslation';
import { format } from 'date-fns';
import { pt, enUS } from 'date-fns/locale';

interface ActivityHeatmapProps {
    data: { date: Date, count: number }[];
}

export default function ActivityHeatmap({ data }: ActivityHeatmapProps) {
    const { t, language } = useTranslation();
    const localeObj = language === 'pt' ? pt : enUS;

    // A simple minimalist 7-row grid (weeks flow left to right like GitHub)
    // To do this simply, we take our flattened data (oldest to newest)
    // and just render it in a flex container that column-wraps, but CSS Grid
    // with columns based on data length / 7 is easier.

    // We want the grid to flow top-to-bottom, left-to-right.
    // CSS Grid `auto-flow column` achieves this easily.
    const weeksCount = Math.ceil(data.length / 7);

    return (
        <div className="w-full bg-[#111111] rounded-3xl p-5 mb-6">
            <span className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-4 block">
                {t.stats.activity}
            </span>
            <div className="overflow-x-auto pb-2 scrollbar-hide">
                <div
                    className="grid gap-[4px]"
                    style={{
                        gridTemplateRows: 'repeat(7, minmax(0, 1fr))',
                        gridAutoFlow: 'column',
                        gridAutoColumns: 'max-content'
                    }}
                >
                    {data.map((day, i) => {
                        // Max opacity for 4+ habits per day
                        const intensity = Math.min(day.count / 4, 1);
                        const isEmpty = day.count === 0;

                        return (
                            <div
                                key={i}
                                className={`w-[14px] h-[14px] rounded-[3px] transition-colors duration-300 ${isEmpty ? 'bg-white/5' : ''}`}
                                style={!isEmpty ? { backgroundColor: `rgba(255, 255, 255, ${Math.min(0.2 + intensity * 0.8, 1)})` } : {}}
                                title={`${format(day.date, 'dd MMM', { locale: localeObj })}: ${day.count} ${day.count === 1 ? t.stats.day : t.stats.days}`}
                            />
                        );
                    })}
                </div>
            </div>
            <div className="flex justify-between items-center mt-3 text-[10px] text-white/30 uppercase tracking-widest font-semibold">
                <span>{data.length > 0 ? format(data[0].date, 'MMM', { locale: localeObj }) : ''}</span>
                <span>{data.length > 0 ? format(data[data.length - 1].date, 'MMM', { locale: localeObj }) : ''}</span>
            </div>
        </div>
    );
}
