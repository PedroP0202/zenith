ALTER TABLE users ADD COLUMN google_id TEXT;
ALTER TABLE users ADD COLUMN apple_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_apple_id ON users(apple_id);

CREATE TABLE IF NOT EXISTS verification_codes (
    email TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    expires_at INTEGER NOT NULL
);
