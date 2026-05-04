import { z } from 'zod';

export const groupSchema = z.object({
    name: z.string().trim().min(2).max(40),
    memberIds: z.array(z.string().uuid()).max(20).default([]),
});

export const groupMemberSchema = z.object({
    friendId: z.string().uuid(),
});

export const groupHabitSchema = z.object({
    title: z.string().trim().min(2).max(80),
    frequency: z.array(z.number().int().min(0).max(6)).min(1).max(7),
});
