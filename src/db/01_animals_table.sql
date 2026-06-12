-- ─── 01_animals_table.sql ─────────────────────────────────────────────────────


-- ── 1. Create the table ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS animals (

  -- Primary key: a UUID generated automatically for each new row.
  -- UUIDs are better than integers for distributed systems — no collision risk.
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Links this animal to the authenticated user who created it.
  -- auth.users is Supabase's built-in user table (managed automatically).
  -- ON DELETE CASCADE: if the user is deleted, all their animals are removed too.
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- The animal's name — required field, cannot be blank.
  name        TEXT NOT NULL CHECK (char_length(trim(name)) > 0),

  -- Species like 'Cattle', 'Goat', 'Chicken', 'Sheep', etc.
  species     TEXT NOT NULL CHECK (char_length(trim(species)) > 0),

  -- Breed is optional (e.g., 'Holstein', 'Boer')
  breed       TEXT,

  -- Age in years stored as a decimal (e.g., 1.5 = 18 months).
  -- Must be zero or positive — a negative age makes no sense.
  age_years   NUMERIC(5, 2) CHECK (age_years >= 0),

  -- Body weight in kilograms. Must be positive if provided.
  weight_kg   NUMERIC(8, 2) CHECK (weight_kg > 0),

  -- Free-text notes (health observations, feeding notes, etc.)
  notes       TEXT,

  -- Automatically set to the current UTC time when the row is inserted.
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()

);


-- ── 2. Row Level Security (RLS) ───────────────────────────────────────────────
-- RLS means Supabase checks every query against a policy before returning data.
-- Without RLS, ANY authenticated user could read/modify ALL animals.

-- Enable RLS on this table (required before adding policies).
ALTER TABLE animals ENABLE ROW LEVEL SECURITY;

-- POLICY: SELECT — users can only read their own animals.
-- auth.uid() is a Supabase function that returns the current user's UUID.
CREATE POLICY "Users can view own animals"
  ON animals FOR SELECT
  USING (auth.uid() = user_id);

-- POLICY: INSERT — users can only create animals owned by themselves.
-- WITH CHECK prevents someone from setting user_id to another person's id.
CREATE POLICY "Users can insert own animals"
  ON animals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- POLICY: UPDATE — users can only update their own animals.
CREATE POLICY "Users can update own animals"
  ON animals FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- POLICY: DELETE — users can only delete their own animals.
CREATE POLICY "Users can delete own animals"
  ON animals FOR DELETE
  USING (auth.uid() = user_id);


-- ── 3. Indexes ────────────────────────────────────────────────────────────────
-- An index on user_id speeds up the WHERE user_id = ? filter that every query
-- uses. Without this, Postgres scans the whole table on every request.
CREATE INDEX IF NOT EXISTS idx_animals_user_id ON animals(user_id);

-- Index on species so filtering by species (e.g., "show all cattle") is fast.
CREATE INDEX IF NOT EXISTS idx_animals_species ON animals(species);
