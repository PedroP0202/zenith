ALTER TABLE habits ADD COLUMN schedule_type TEXT NOT NULL DEFAULT 'specific_days';
ALTER TABLE habits ADD COLUMN weekly_target INTEGER;
ALTER TABLE habits ADD COLUMN goal_type TEXT NOT NULL DEFAULT 'complete';
ALTER TABLE habits ADD COLUMN target_value INTEGER;
ALTER TABLE habits ADD COLUMN unit_label TEXT;

ALTER TABLE logs ADD COLUMN value INTEGER;
