-- ─── 07_tasks_repeating_migration.sql ──────────────────────────────────────
-- Adds the is_repeating flag to existing tasks tables.
-- Run once in Supabase SQL Editor.

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS is_repeating BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for quickly fetching all repeating tasks
CREATE INDEX IF NOT EXISTS idx_tasks_repeating ON tasks(is_repeating);
