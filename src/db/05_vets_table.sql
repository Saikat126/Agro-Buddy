-- ─── 05_vets_table.sql ────────────────────────────────────────────────────────


-- ── 1. Create the table ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vets (

  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The user who added this vet record (NULL = system/admin-seeded records).
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Vet's full name.
  name        TEXT NOT NULL CHECK (char_length(trim(name)) > 0),

  -- Area of expertise (e.g., 'Large Animals', 'Poultry', 'General Practice').
  specialty   TEXT,

  -- Clinic or hospital name.
  clinic      TEXT,

  -- Contact phone number (stored as text to preserve formatting like +880-...).
  phone       TEXT,

  -- Contact email address.
  email       TEXT,

  -- Town, city, or area (e.g., 'Dhaka', 'Sylhet').
  location    TEXT,

  -- Average star rating from 0.0 to 5.0.
  rating      NUMERIC(3, 1) CHECK (rating BETWEEN 0 AND 5),

  -- TRUE if the vet is currently accepting new patients / farm visits.
  available   BOOLEAN NOT NULL DEFAULT TRUE,

  -- TRUE = visible to all logged-in users (community directory).
  -- FALSE = private contact visible only to the user who added them.
  is_public   BOOLEAN NOT NULL DEFAULT TRUE,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()

);


-- ── 2. Row Level Security ─────────────────────────────────────────────────────
ALTER TABLE vets ENABLE ROW LEVEL SECURITY;

-- Public vet records are readable by any authenticated user.
CREATE POLICY "Authenticated users can view public vets"
  ON vets FOR SELECT
  USING (
    is_public = TRUE
    OR auth.uid() = user_id   -- owner always sees their own private records
  );

-- Users can add new vet records.
CREATE POLICY "Users can insert vet records"
  ON vets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only the owner can edit a vet record they added.
CREATE POLICY "Users can update own vet records"
  ON vets FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Only the owner can delete a vet record they added.
CREATE POLICY "Users can delete own vet records"
  ON vets FOR DELETE
  USING (auth.uid() = user_id);


-- ── 3. Indexes ────────────────────────────────────────────────────────────────
-- Search vets by location — the most common filter in the UI.
CREATE INDEX IF NOT EXISTS idx_vets_location  ON vets(location);

-- Filter by availability status quickly.
CREATE INDEX IF NOT EXISTS idx_vets_available ON vets(available);

-- Composite index for the common pattern: public + available vets in a location.
CREATE INDEX IF NOT EXISTS idx_vets_public_available
  ON vets(is_public, available);
