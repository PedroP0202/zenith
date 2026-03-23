-- Add opt_in_leaderboard to users
ALTER TABLE users ADD COLUMN opt_in_leaderboard BOOLEAN NOT NULL DEFAULT 0;
