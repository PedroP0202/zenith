type RateLimitBackend = {
    get: (key: string) => Promise<{ count: number; resetAt: number } | null>;
    put: (key: string, value: { count: number; resetAt: number }, ttlSeconds: number) => Promise<void>;
};

// Local fallback for development and low-volume routes. Production should pass a
// shared backend backed by KV, Durable Objects, or Cloudflare's native limiter.
const RATE_LIMIT_STORE = new Map<string, { count: number; resetAt: number }>();

const memoryBackend: RateLimitBackend = {
    async get(key) {
        return RATE_LIMIT_STORE.get(key) || null;
    },
    async put(key, value) {
        RATE_LIMIT_STORE.set(key, value);
    },
};

export const createKvRateLimitBackend = (kv?: KVNamespace): RateLimitBackend | undefined => {
    if (!kv) return undefined;
    return {
        async get(key) {
            return kv.get<{ count: number; resetAt: number }>(key, 'json');
        },
        async put(key, value, ttlSeconds) {
            await kv.put(key, JSON.stringify(value), { expirationTtl: Math.max(1, ttlSeconds) });
        },
    };
};

export const checkRateLimit = async (
    key: string,
    limit: number,
    windowMs: number,
    backend: RateLimitBackend = memoryBackend
) => {
    const now = Date.now();
    const record = await backend.get(key);

    if (!record || now > record.resetAt) {
        await backend.put(key, { count: 1, resetAt: now + windowMs }, Math.ceil(windowMs / 1000));
        return true;
    }

    if (record.count >= limit) return false;

    record.count++;
    await backend.put(key, record, Math.ceil((record.resetAt - now) / 1000));
    return true;
};
