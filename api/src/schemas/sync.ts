import { z } from 'zod';

export const habitSchema = z.object({
    id: z.string().uuid(),
    title: z.string().min(1).max(200),
    frequency: z.array(z.number().min(0).max(6)).max(7),
    scheduleType: z.enum(['specific_days', 'times_per_week']).optional(),
    weeklyTarget: z.number().int().min(1).max(7).nullable().optional(),
    goalType: z.enum(['complete', 'count']).optional(),
    targetValue: z.number().int().min(1).nullable().optional(),
    unitLabel: z.string().max(24).nullable().optional(),
    isHardMode: z.boolean().optional(),
    reminderTime: z.string().regex(/^([01]\d|2[0-3]):?([0-5]\d)$/).nullable().optional(),
    isActive: z.boolean(),
    createdAt: z.number(),
    updatedAt: z.number().optional(),
});

export const logSchema = z.object({
    id: z.string().uuid(),
    habitId: z.string().uuid(),
    completedAt: z.number(),
    value: z.number().int().min(1).optional(),
});

export const pushSchema = z.object({
    habits: z.array(habitSchema),
    logs: z.array(logSchema),
    lastSyncedAt: z.number(),
    deletedHabitIds: z.array(z.string().uuid()).optional(),
    deletedLogIds: z.array(z.string().uuid()).optional(),
});
