-- api/add_beta_feedbacks.sql
-- Run securely: npx wrangler d1 execute zenith-db --remote --file=./add_beta_feedbacks.sql

CREATE TABLE IF NOT EXISTS beta_feedbacks (
    id TEXT PRIMARY KEY,
    user_name TEXT NOT NULL,
    platform TEXT,
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'unread',
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_beta_feedbacks_status ON beta_feedbacks(status);
