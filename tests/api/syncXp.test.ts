import { describe, expect, it } from 'vitest';
import { calculateCanonicalHabitPoints, calculateCanonicalXp } from '@/api/src/services/syncXp';

const day = (isoDate: string) => new Date(`${isoDate}T10:00:00.000Z`).getTime();

describe('sync XP calculation', () => {
  it('awards XP once per completed binary scheduled period', () => {
    const habits = [{
      id: 'habit-1',
      frequency: JSON.stringify([1, 2, 3, 4, 5]),
      schedule_type: 'specific_days',
      goal_type: 'complete',
      is_hard_mode: 0,
    }];
    const logs = [
      { habit_id: 'habit-1', completed_at: day('2026-05-04') },
      { habit_id: 'habit-1', completed_at: day('2026-05-05') },
      { habit_id: 'habit-1', completed_at: day('2026-05-10') },
    ];

    expect(calculateCanonicalXp(habits, logs)).toBe(20);
  });

  it('requires count and weekly targets before awarding points', () => {
    const habits = [
      {
        id: 'water',
        frequency: JSON.stringify([0, 1, 2, 3, 4, 5, 6]),
        schedule_type: 'specific_days',
        goal_type: 'count',
        target_value: 3,
        is_hard_mode: 1,
      },
      {
        id: 'gym',
        frequency: JSON.stringify([0, 1, 2, 3, 4, 5, 6]),
        schedule_type: 'times_per_week',
        weekly_target: 2,
        goal_type: 'complete',
        is_hard_mode: 0,
      },
    ];
    const logs = [
      { habit_id: 'water', completed_at: day('2026-05-04'), value: 2 },
      { habit_id: 'water', completed_at: day('2026-05-05'), value: 3 },
      { habit_id: 'gym', completed_at: day('2026-05-04') },
      { habit_id: 'gym', completed_at: day('2026-05-06') },
    ];

    expect(calculateCanonicalXp(habits, logs)).toBe(30);
  });

  it('limits arena points to the requested season window', () => {
    const habit = {
      id: 'habit-1',
      frequency: JSON.stringify([0, 1, 2, 3, 4, 5, 6]),
      schedule_type: 'specific_days',
      goal_type: 'complete',
      is_hard_mode: 0,
    };
    const logs = [
      { habit_id: 'habit-1', completed_at: day('2026-04-30') },
      { habit_id: 'habit-1', completed_at: day('2026-05-01') },
      { habit_id: 'habit-1', completed_at: day('2026-05-02') },
      { habit_id: 'habit-1', completed_at: day('2026-06-01') },
    ];

    expect(calculateCanonicalHabitPoints([habit], logs, {
      startAt: new Date('2026-05-01T00:00:00.000Z').getTime(),
      endAt: new Date('2026-06-01T00:00:00.000Z').getTime(),
    })).toBe(20);
  });
});
