-- Migration: Add arena_points to users
ALTER TABLE users ADD COLUMN arena_points INTEGER DEFAULT 0;
