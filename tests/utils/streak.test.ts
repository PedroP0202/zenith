import { describe, expect, it } from 'vitest';
import type { Habit, LogEntry } from '@/types';
import { calculateStreak, getBestStreak, getCompletionsThisMonth, getYearlyStats } from '@/utils/streak';

const day = (isoDate: string) => new Date(`${isoDate}T10:00:00.000Z`).getTime();
const log = (id: string, habitId: string, isoDate: string, value?: number): LogEntry => ({
  id,
  habitId,
  completedAt: day(isoDate),
  value,
});

const baseHabit: Habit = {
  id: 'habit-1',
  title: 'Read',
  frequency: [1, 2, 3, 4, 5],
  scheduleType: 'specific_days',
  goalType: 'complete',
  isActive: true,
  createdAt: day('2026-04-01'),
};

describe('streak helpers', () => {
  it('counts consecutive scheduled days and skips unscheduled days', () => {
    const logs = [
      log('log-1', baseHabit.id, '2026-05-01'),
      log('log-2', baseHabit.id, '2026-05-04'),
      log('log-3', baseHabit.id, '2026-05-05'),
    ];

    expect(calculateStreak(logs, baseHabit, new Date('2026-05-05T12:00:00Z'))).toBe(3);
  });

  it('returns zero when the latest required scheduled day is missed', () => {
    const logs = [log('log-1', baseHabit.id, '2026-05-01')];

    expect(calculateStreak(logs, baseHabit, new Date('2026-05-05T12:00:00Z'))).toBe(0);
  });

  it('supports weekly target streaks for times-per-week habits', () => {
    const weeklyHabit = {
      ...baseHabit,
      scheduleType: 'times_per_week' as const,
      weeklyTarget: 2,
    };
    const logs = [
      log('log-1', weeklyHabit.id, '2026-04-21'),
      log('log-2', weeklyHabit.id, '2026-04-23'),
      log('log-3', weeklyHabit.id, '2026-04-28'),
      log('log-4', weeklyHabit.id, '2026-04-30'),
    ];

    expect(calculateStreak(logs, weeklyHabit, new Date('2026-05-01T12:00:00Z'))).toBe(2);
    expect(getBestStreak(logs, weeklyHabit)).toBe(2);
  });

  it('deduplicates monthly and yearly activity by day', () => {
    const logs = [
      log('log-1', baseHabit.id, '2026-05-01'),
      log('log-2', baseHabit.id, '2026-05-01'),
      log('log-3', baseHabit.id, '2026-05-03'),
      log('log-4', baseHabit.id, '2025-05-03'),
    ];

    expect(getCompletionsThisMonth(logs, new Date('2026-05-05T12:00:00Z'))).toBe(2);
    expect(getYearlyStats(logs, new Date('2026-05-05T12:00:00Z'))).toMatchObject({
      activeDays: 2,
    });
  });
});
