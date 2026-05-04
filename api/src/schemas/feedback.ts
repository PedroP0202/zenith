import { z } from 'zod';

export const feedbackSchema = z.object({
    feedback: z.string().min(1).max(2000),
    user: z.string().max(100).optional(),
    platform: z.string().max(100).optional(),
});
