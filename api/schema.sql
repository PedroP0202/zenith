-- api/schema.sql
-- Run locally via: npx wrangler d1 execute zenith-db --local --file=./schema.sql

DROP TABLE IF EXISTS logs;
DROP TABLE IF EXISTS habits;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    google_id TEXT UNIQUE,
    apple_id TEXT UNIQUE,
    is_verified BOOLEAN NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
);

CREATE TABLE verification_codes (
    email TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    expires_at INTEGER NOT NULL
);

CREATE TABLE habits (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    frequency TEXT NOT NULL, -- Stored as JSON string, e.g. "[0, 1, 2]"
    is_hard_mode BOOLEAN NOT NULL DEFAULT 0,
    reminder_time TEXT,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE logs (
    id TEXT PRIMARY KEY,
    habit_id TEXT NOT NULL,
    completed_at INTEGER NOT NULL,
    synced_at INTEGER NOT NULL,
    FOREIGN KEY(habit_id) REFERENCES habits(id) ON DELETE CASCADE
);

CREATE TABLE beta_feedbacks (
    id TEXT PRIMARY KEY,
    user_name TEXT NOT NULL,
    platform TEXT,
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'unread', -- can be 'unread', 'read', 'resolved'
    created_at INTEGER NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_habits_user_id ON habits(user_id);
CREATE INDEX idx_logs_habit_id ON logs(habit_id);
CREATE INDEX idx_beta_feedbacks_status ON beta_feedbacks(status);
