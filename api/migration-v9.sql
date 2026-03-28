-- api/migration-v9.sql
-- Create tracking tables for Arena Championships and Seasons

-- 1. Create Seasons table
CREATE TABLE IF NOT EXISTS arena_seasons (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  start_at INTEGER NOT NULL,
  end_at INTEGER NOT NULL,
  is_finalized BOOLEAN NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- Index for automatic resets performance
CREATE INDEX IF NOT EXISTS idx_arena_seasons_status ON arena_seasons(is_finalized, end_at);

-- 2. Create Winners table
CREATE TABLE IF NOT EXISTS arena_winners (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  season_id TEXT NOT NULL,
  rank_name TEXT NOT NULL,
  position INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for profile display / trophies
CREATE INDEX IF NOT EXISTS idx_arena_winners_user ON arena_winners(user_id);
