// Simple in-memory limiter for local/dev and low-volume edge routes.
// For production-scale abuse protection, move this state to KV or Durable Objects.
const RATE_LIMIT_STORE = new Map<string, { count: number; resetAt: number }>();

export const checkRateLimit = (key: string, limit: number, windowMs: number) => {
    const now = Date.now();
    const record = RATE_LIMIT_STORE.get(key);

    if (!record || now > record.resetAt) {
        RATE_LIMIT_STORE.set(key, { count: 1, resetAt: now + windowMs });
        return true;
    }

    if (record.count >= limit) return false;

    record.count++;
    return true;
};
