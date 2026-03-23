-- api/migration-v8.sql
-- Add friendships table for connecting users

CREATE TABLE IF NOT EXISTS friendships (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    friend_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending' or 'accepted'
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(friend_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Ensure a unique pair for a friendship request in any direction
-- We can't do (min, max) uniqueness easily in standard SQLite without expression indexes (which might not be fully supported by all D1 environments),
-- so we'll just handle directed uniqueness and rely on application logic to prevent A->B and B->A duplicates.
CREATE UNIQUE INDEX IF NOT EXISTS idx_friendships_directed ON friendships(user_id, friend_id);

-- Index for querying a user's friendships quickly
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);
