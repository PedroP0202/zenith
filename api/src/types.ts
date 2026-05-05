export type Bindings = {
    DB: D1Database;
    JWT_SECRET: string;
    RESEND_API_KEY: string;
    RATE_LIMIT_KV?: KVNamespace;
    ADMIN_SECRET?: string;
    ENVIRONMENT?: string;
};

export type AuthPayload = {
    id: string;
    [key: string]: unknown;
};

export type ArenaWinner = {
    id: string;
    user_id: string;
    season_id: string;
    rank_name: string;
    position: number | null;
    created_at: number;
};
