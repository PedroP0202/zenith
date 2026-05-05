import { describe, expect, it } from 'vitest';
import { groupHabitSchema, groupMemberSchema, groupSchema } from '@/api/src/schemas/groups';
import { loginSchema, registerSchema, sendCodeSchema } from '@/api/src/schemas/auth';
import { pushSchema } from '@/api/src/schemas/sync';

const uuid = '00000000-0000-4000-8000-000000000000';

describe('API schemas', () => {
  it('validates auth payloads and rejects weak credentials', () => {
    expect(sendCodeSchema.safeParse({ email: 'user@example.com' }).success).toBe(true);
    expect(loginSchema.safeParse({ email: 'user@example.com', password: 'password1' }).success).toBe(true);
    expect(registerSchema.safeParse({
      name: 'Pedro',
      email: 'user@example.com',
      password: 'password1',
      code: '123456',
      username: 'pedro',
    }).success).toBe(true);

    expect(loginSchema.safeParse({ email: 'nope', password: 'short' }).success).toBe(false);
    expect(registerSchema.safeParse({ name: 'P', email: 'user@example.com', password: '123', code: '123' }).success).toBe(false);
  });

  it('validates sync pushes with habits, logs and tombstones', () => {
    const valid = pushSchema.safeParse({
      lastSyncedAt: Date.now(),
      habits: [{
        id: uuid,
        title: 'Read',
        frequency: [1, 2, 3],
        scheduleType: 'specific_days',
        goalType: 'count',
        targetValue: 3,
        unitLabel: 'pages',
        isHardMode: false,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }],
      logs: [{
        id: '10000000-0000-4000-8000-000000000000',
        habitId: uuid,
        completedAt: Date.now(),
        value: 3,
      }],
      deletedHabitIds: [uuid],
      deletedLogIds: ['10000000-0000-4000-8000-000000000000'],
    });

    expect(valid.success).toBe(true);
    expect(pushSchema.safeParse({ lastSyncedAt: Date.now(), habits: [], logs: [{ id: 'bad' }] }).success).toBe(false);
  });

  it('validates group creation and membership contracts', () => {
    expect(groupSchema.parse({ name: 'Crew', memberIds: [uuid] })).toEqual({ name: 'Crew', memberIds: [uuid] });
    expect(groupSchema.parse({ name: 'Crew' })).toEqual({ name: 'Crew', memberIds: [] });
    expect(groupMemberSchema.safeParse({ friendId: uuid }).success).toBe(true);
    expect(groupHabitSchema.safeParse({ title: 'Workout', frequency: [1, 3, 5] }).success).toBe(true);

    expect(groupSchema.safeParse({ name: 'A' }).success).toBe(false);
    expect(groupHabitSchema.safeParse({ title: 'Workout', frequency: [] }).success).toBe(false);
  });
});
