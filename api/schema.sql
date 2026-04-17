-- api/schema.sql
-- Run locally via: npx wrangler d1 execute zenith-db --local --file=./schema.sql

DROP TABLE IF EXISTS beta_feedbacks;
DROP TABLE IF EXISTS group_habit_logs;
DROP TABLE IF EXISTS group_habits;
DROP TABLE IF EXISTS group_members;
DROP TABLE IF EXISTS social_groups;
DROP TABLE IF EXISTS logs;
DROP TABLE IF EXISTS habits;
DROP TABLE IF EXISTS verification_codes;
DROP TABLE IF EXISTS users;

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    google_id TEXT UNIQUE,
    apple_id TEXT UNIQUE,
    language TEXT DEFAULT 'pt',
    login_attempts INTEGER DEFAULT 0,
    lockout_until INTEGER DEFAULT 0,
    is_verified BOOLEAN NOT NULL DEFAULT 0,
    opt_in_leaderboard BOOLEAN NOT NULL DEFAULT 0,
    total_xp INTEGER DEFAULT 0,
    arena_points INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    username TEXT UNIQUE,
    last_login_reward_date TEXT,
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS verification_codes (
    email TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS habits (
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

CREATE TABLE IF NOT EXISTS logs (
    id TEXT PRIMARY KEY,
    habit_id TEXT NOT NULL,
    completed_at INTEGER NOT NULL,
    synced_at INTEGER NOT NULL,
    FOREIGN KEY(habit_id) REFERENCES habits(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS beta_feedbacks (
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

-- Arena Championship Winners & Decorations
CREATE TABLE IF NOT EXISTS arena_winners (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  season_id TEXT NOT NULL, -- Format: YYYY-MM (e.g., "2026-03")
  rank_name TEXT NOT NULL, -- The final tier name (e.g., "Zenith", "Avatar")
  position INTEGER,        -- Numeric position (1, 2, 3...)
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_arena_winners_user ON arena_winners(user_id);

-- Track seasons for automatic resets
CREATE TABLE IF NOT EXISTS arena_seasons (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  start_at INTEGER NOT NULL,
  end_at INTEGER NOT NULL,
  is_finalized BOOLEAN NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- Index for user lookups by username
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);

CREATE INDEX IF NOT EXISTS idx_arena_seasons_status ON arena_seasons(is_finalized, end_at);

-- Friendships system
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
CREATE UNIQUE INDEX IF NOT EXISTS idx_friendships_directed ON friendships(user_id, friend_id);

-- Index for querying a user's friendships quickly
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);

-- Collaborative groups and shared habits
CREATE TABLE IF NOT EXISTS social_groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    owner_user_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(owner_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS group_members (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member', -- 'owner' or 'member'
    invited_by_user_id TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(group_id) REFERENCES social_groups(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(invited_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_group_members_unique ON group_members(group_id, user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);

CREATE TABLE IF NOT EXISTS group_habits (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    title TEXT NOT NULL,
    frequency TEXT NOT NULL, -- Stored as JSON string, e.g. "[1,2,3]"
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_by_user_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(group_id) REFERENCES social_groups(id) ON DELETE CASCADE,
    FOREIGN KEY(created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_group_habits_group_id ON group_habits(group_id);

CREATE TABLE IF NOT EXISTS group_habit_logs (
    id TEXT PRIMARY KEY,
    group_habit_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    completed_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(group_habit_id) REFERENCES group_habits(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_group_habit_logs_daily_unique ON group_habit_logs(group_habit_id, user_id, completed_at);
CREATE INDEX IF NOT EXISTS idx_group_habit_logs_habit_id ON group_habit_logs(group_habit_id);
