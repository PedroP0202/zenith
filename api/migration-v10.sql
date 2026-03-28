-- api/migration-v10.sql
-- Add missing columns to the users table for progression and rewards

-- 1. Add total_xp (XP acumulado pelo utilizador)
ALTER TABLE users ADD COLUMN total_xp INTEGER DEFAULT 0;

-- 2. Add level (Nível atual do utilizador)
ALTER TABLE users ADD COLUMN level INTEGER DEFAULT 1;

-- 3. Add last_login_reward_date (Controlo de recompensas diárias)
ALTER TABLE users ADD COLUMN last_login_reward_date TEXT;
