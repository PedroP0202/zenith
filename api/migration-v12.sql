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
    role TEXT NOT NULL DEFAULT 'member',
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
    frequency TEXT NOT NULL,
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
