-- ─── 02_tasks_table.sql ───────────────────────────────────────────────────────


-- ── 1. Create the table ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (

  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The user who owns this task.
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Short description of the task (e.g., "Vaccinate herd", "Repair fence").
  title       TEXT NOT NULL CHECK (char_length(trim(title)) > 0),

  -- Optional: the date this task should be completed by (stored as a date, no time).
  due_date    DATE,

  -- Priority level. CHECK restricts values to exactly these three strings.
  -- DEFAULT 'medium' so priority is always set even if the caller omits it.
  priority    TEXT NOT NULL DEFAULT 'medium'
                CHECK (priority IN ('low', 'medium', 'high')),

  -- Whether the task is done. Starts as FALSE (not done).
  completed   BOOLEAN NOT NULL DEFAULT FALSE,

  -- Optional link to an animal (e.g., "Vaccinate Bessie the cow").
  -- ON DELETE SET NULL: if the animal is deleted, the task stays but loses the link.
  animal_id   UUID REFERENCES animals(id) ON DELETE SET NULL,

  -- Any extra context about the task.
  notes       TEXT,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()

);


-- ── 2. Row Level Security ─────────────────────────────────────────────────────
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks"
  ON tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
  ON tasks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks"
  ON tasks FOR DELETE
  USING (auth.uid() = user_id);


-- ── 3. Indexes ────────────────────────────────────────────────────────────────
-- Speed up the common query pattern: "all tasks for this user, ordered by due date"
CREATE INDEX IF NOT EXISTS idx_tasks_user_id  ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

-- Speed up filtering by completion status (e.g., "show only incomplete tasks").
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
