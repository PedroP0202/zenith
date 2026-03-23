-- migration-v7.sql
-- Add username column to users table
ALTER TABLE users ADD COLUMN username TEXT;

-- Backfill existing users with a unique username based on their ID
UPDATE users 
SET username = lower(replace(name, ' ', '')) || substr(hex(randomblob(2)), 1, 4)
WHERE username IS NULL;

-- Create a unique index on the username column
CREATE UNIQUE INDEX idx_users_username ON users(username);
