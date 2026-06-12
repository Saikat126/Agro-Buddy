-- ─── 04_calendar_table.sql ────────────────────────────────────────────────────


-- ── 1. Create the table ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS calendar_events (

  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- What the event is (e.g., "Annual vaccination", "Sell calves at market").
  title       TEXT NOT NULL CHECK (char_length(trim(title)) > 0),

  -- The day the event occurs. Stored as DATE (no time component) so calendar
  -- views can filter by year/month/day without time-zone complications.
  event_date  DATE NOT NULL,

  -- Category that determines which colour/icon the calendar uses.
  event_type  TEXT NOT NULL DEFAULT 'other'
                CHECK (event_type IN ('vet', 'harvest', 'market', 'medication', 'other')),

  -- Optional free-text description or reminder notes.
  notes       TEXT,

  -- Track whether this event has been acted on (e.g., vet visit completed).
  completed   BOOLEAN NOT NULL DEFAULT FALSE,

  -- Optionally link the event to a specific animal.
  animal_id   UUID REFERENCES animals(id) ON DELETE SET NULL,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()

);


-- ── 2. Row Level Security ─────────────────────────────────────────────────────
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own events"
  ON calendar_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own events"
  ON calendar_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own events"
  ON calendar_events FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own events"
  ON calendar_events FOR DELETE
  USING (auth.uid() = user_id);


-- ── 3. Indexes ────────────────────────────────────────────────────────────────
-- Month view query: WHERE user_id = ? AND event_date BETWEEN start AND end
-- A composite index covers both columns in one scan.
CREATE INDEX IF NOT EXISTS idx_calendar_user_date
  ON calendar_events(user_id, event_date);

-- Filter by event type (e.g., show only vet visits on the calendar).
CREATE INDEX IF NOT EXISTS idx_calendar_event_type ON calendar_events(event_type);
