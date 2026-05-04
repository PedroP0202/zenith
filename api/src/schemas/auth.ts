import { z } from 'zod';

export const registerSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
    code: z.string().length(6),
    username: z.string().min(3).max(20).optional(),
    hp: z.string().optional(),
});

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
});

export const sendCodeSchema = z.object({
    email: z.string().email(),
    hp: z.string().optional(),
});
