'use client';
import { useRef, useEffect } from 'react';
import { getDaysInMonth, startOfMonth, getDay, subMonths, format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { useTranslation } from '../hooks/useTranslation';

interface InfiniteCalendarProps {
    habitLogs: any[];
    onDayClick: (date: Date) => void;
    frequency?: number[];
    isHardMode?: boolean;
    monthsToGenerate?: number;
}

export default function InfiniteCalendar({ habitLogs, onDayClick, frequency, isHardMode, monthsToGenerate = 12 }: InfiniteCalendarProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const { language } = useTranslation();
    const dateLocale = language === 'pt' ? ptBR : enUS;

    // Convert logs into a Set of 'YYYY-MM-DD' for O(1) lookups
    const completedSet = new Set(
        habitLogs.map(log => {
            const d = new Date(log.completedAt);
            return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        })
    );

    const currentDate = new Date();
    const monthsArray = Array.from({ length: monthsToGenerate }, (_, i) => {
        return subMonths(currentDate, (monthsToGenerate - 1) - i);
    });

    useEffect(() => {
        // Wait for rendering to settle, then scroll to the end seamlessly
        setTimeout(() => {
            if (scrollRef.current) {
                // Instantly snap to the rightmost end (current month)
                scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
            }
        }, 50);
    }, []);

    const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

    return (
        <div
            className="relative w-full overflow-hidden my-6 select-none"
            style={{ maskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)' }}
        >
            <div
                ref={scrollRef}
                className="flex gap-4 overflow-x-auto snap-x snap-mandatory hide-scrollbar px-[15%] pb-4 pt-2 w-full"
                style={{ scrollBehavior: 'auto' }} // auto for initial jump, CSS can override if needed later
            >
                {monthsArray.map((monthDate, index) => {
                    const daysInMonth = getDaysInMonth(monthDate);
                    const startDay = getDay(startOfMonth(monthDate));

                    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
                    const paddedCells = Array.from({ length: startDay }, (_, i) => i);

                    const monthYearStr = format(monthDate, 'MMMM yyyy', { locale: dateLocale });

                    return (
                        <div key={index} className="flex-shrink-0 w-[260px] snap-center bg-white/[0.02] border border-white/5 rounded-[2rem] p-5 flex flex-col items-center select-none">
                            <h3 className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] mb-4 capitalize">
                                {monthYearStr}
                            </h3>

                            <div className="w-full">
                                <div className="grid grid-cols-7 gap-1.5 mb-2 text-center select-none">
                                    {weekDays.map((d, i) => (
                                        <div key={i} className="text-[9px] font-bold text-white/30 cursor-default">
                                            {d}
                                        </div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7 gap-1.5 w-full">
                                    {paddedCells.map((_, i) => (
                                        <div key={`pad-${i}`} className="aspect-square"></div>
                                    ))}
                                    {days.map(day => {
                                        const cellDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
                                        const now = new Date();

                                        const lookupKey = `${cellDate.getFullYear()}-${cellDate.getMonth()}-${day}`;
                                        const isCompleted = completedSet.has(lookupKey);
                                        const dayOfWeek = cellDate.getDay();

                                        const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                                        const cellZero = cellDate.getTime();

                                        const isToday = cellZero === todayZero;
                                        const isFuture = cellZero > todayZero;
                                        const isPast = cellZero < todayZero;

                                        // Domain starts at 0 = Sunday, identical to JS standard getDay()
                                        const isScheduled = frequency ? frequency.includes(dayOfWeek) : true;

                                        let isClickable = true;

                                        if (isFuture) isClickable = false;
                                        if (!isScheduled) isClickable = false;
                                        if (isHardMode && isPast) isClickable = false;

                                        if (isCompleted && (!isHardMode || isToday)) {
                                            isClickable = true;
                                        }

                                        return (
                                            <button
                                                key={day}
                                                onClick={() => isClickable && onDayClick(cellDate)}
                                                disabled={!isClickable}
                                                className={`aspect-square flex items-center justify-center rounded-lg text-xs font-bold transition-all duration-300 w-full ${isClickable ? 'cursor-pointer hover:scale-110 active:scale-95' : 'cursor-default'} ${!isClickable && !isCompleted
                                                    ? 'opacity-20 text-white/10'
                                                    : isCompleted
                                                        ? 'bg-[var(--zenith-active)] text-black shadow-[0_0_12px_rgba(255,255,255,0.4)] opacity-100'
                                                        : isToday
                                                            ? 'bg-transparent border border-white/40 text-white/90 shadow-[inset_0_0_8px_rgba(255,255,255,0.1)]'
                                                            : 'bg-white/[0.04] text-white/40 hover:bg-white/10'
                                                    }`}
                                            >
                                                {day}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <style jsx>{`
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .hide-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
}
