'use client';
import { getDaysInMonth, startOfMonth, getDay } from 'date-fns';
import { useTranslation } from '../hooks/useTranslation';

interface HabitCalendarProps {
    completedDays: number[];
    monthDate: Date;
    onDayClick: (date: Date) => void;
    frequency?: number[];
    isHardMode?: boolean;
}

export default function HabitCalendar({ completedDays, monthDate, onDayClick, frequency, isHardMode }: HabitCalendarProps) {
    const { t } = useTranslation();
    const daysInMonth = getDaysInMonth(monthDate);
    const startDay = getDay(startOfMonth(monthDate)); // 0 = Sunday, 1 = Monday, etc.

    // Adjust so week starts on Monday (0 = Monday, 6 = Sunday)
    const padding = startDay === 0 ? 6 : startDay - 1;

    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const paddedCells = Array.from({ length: padding }, (_, i) => i);

    const weekDays = t.habit.calendarDaysOfWeek;

    return (
        <div className="mt-8 pt-8 border-t border-white/5 w-full">
            <div className="grid grid-cols-7 gap-2.5 mb-3 text-center">
                {weekDays.map((day, i) => (
                    <div key={i} className="text-xs font-bold text-white/30">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-2.5">
                {paddedCells.map((_, i) => (
                    <div key={`pad-${i}`} className="aspect-square opacity-0"></div>
                ))}

                {days.map(day => {
                    const isCompleted = completedDays.includes(day);

                    const now = new Date();
                    const cellDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
                    const dayOfWeek = cellDate.getDay();

                    // Compare using strictly zero'd local times for guaranteed exactness
                    const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                    const cellZero = cellDate.getTime();

                    const isToday = cellZero === todayZero;
                    const isFuture = cellZero > todayZero;
                    const isPast = cellZero < todayZero;
                    const isScheduled = frequency ? frequency.includes(dayOfWeek) : true;

                    let isClickable = true;

                    // Logic to visually disable non-editable days
                    if (isFuture) isClickable = false;
                    if (!isScheduled) isClickable = false;
                    if (isHardMode && isPast) isClickable = false;

                    // If it is already completed, allow them to un-click it EXCEPT if it's past in hard mode
                    if (isCompleted && (!isHardMode || isToday)) {
                        isClickable = true;
                    }

                    const handleDayClick = () => {
                        if (!isClickable) return;
                        onDayClick(cellDate);
                    };

                    return (
                        <button
                            key={day}
                            onClick={handleDayClick}
                            disabled={!isClickable}
                            className={`aspect-square flex items-center justify-center rounded-xl text-sm font-bold transition-all duration-300 ${isClickable ? 'cursor-pointer hover:scale-110 active:scale-95' : 'cursor-default'} ${!isClickable && !isCompleted
                                ? 'opacity-20 text-white/20'
                                : isCompleted
                                    ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.25)] opacity-100'
                                    : isToday
                                        ? 'bg-transparent border border-white/30 text-white/90'
                                        : 'bg-white-[0.03] text-white/30 hover:bg-white/10'
                                }`}
                        >
                            {day}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
