-- ─── 06_dosage_records_table.sql ──────────────────────────────────────────────


-- ── 1. Create the table ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dosage_records (

  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Optional link to the animals table. SET NULL if the animal record is later
  -- deleted — we keep the dosage history even without the animal profile.
  animal_id       UUID REFERENCES animals(id) ON DELETE SET NULL,

  -- Snapshot of the animal's name at save time (so history is readable even
  -- after the animal record is deleted or renamed).
  animal_name     TEXT NOT NULL CHECK (char_length(trim(animal_name)) > 0),

  -- The medication or drug name (e.g., 'Oxytetracycline', 'Ivermectin').
  medication      TEXT NOT NULL CHECK (char_length(trim(medication)) > 0),

  -- ── Inputs to the dosage calculation ──────────────────────────────────────
  -- These three values are what the user entered before hitting "Calculate".

  -- Animal body weight in kg at the time of calculation.
  weight_kg       NUMERIC(8, 2) NOT NULL CHECK (weight_kg > 0),

  -- Prescribed dose rate in mg per kg of body weight.
  dose_per_kg     NUMERIC(8, 4) NOT NULL CHECK (dose_per_kg > 0),

  -- Medication concentration in mg per ml (from the drug label).
  concentration   NUMERIC(8, 4) NOT NULL CHECK (concentration > 0),

  -- ── Results from the dosage calculation ───────────────────────────────────
  -- Computed by DosageCalculatorLogic.js and stored here for reference.

  -- Total milligrams needed: weight_kg × dose_per_kg
  total_mg        NUMERIC(10, 4) NOT NULL,

  -- Volume in ml to administer: total_mg / concentration
  total_ml        NUMERIC(10, 4) NOT NULL,

  -- ── Treatment schedule ────────────────────────────────────────────────────
  -- How often to give the dose (1 = daily, 7 = weekly, etc.)
  frequency_days  INTEGER NOT NULL DEFAULT 1 CHECK (frequency_days > 0),

  -- How many days the full treatment course lasts.
  duration_days   INTEGER NOT NULL DEFAULT 7 CHECK (duration_days > 0),

  -- First day of treatment.
  start_date      DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Last day of treatment: calculated as start_date + duration_days.
  -- Storing it avoids recalculating every time the history is displayed.
  end_date        DATE NOT NULL,

  -- Any extra notes the farmer added (withdrawal period reminders, etc.)
  notes           TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Data integrity: end_date must come on or after start_date.
  CONSTRAINT end_after_start CHECK (end_date >= start_date)

);


-- ── 2. Row Level Security ─────────────────────────────────────────────────────
ALTER TABLE dosage_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own dosage records"
  ON dosage_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dosage records"
  ON dosage_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Update is allowed in case the user needs to correct a note.
CREATE POLICY "Users can update own dosage records"
  ON dosage_records FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own dosage records"
  ON dosage_records FOR DELETE
  USING (auth.uid() = user_id);


-- ── 3. Indexes ────────────────────────────────────────────────────────────────
-- History page: all records for this user, newest first.
CREATE INDEX IF NOT EXISTS idx_dosage_user_id   ON dosage_records(user_id);

-- Filter history by animal.
CREATE INDEX IF NOT EXISTS idx_dosage_animal_id ON dosage_records(animal_id);

-- Date-range queries (e.g., "show treatments active this week").
CREATE INDEX IF NOT EXISTS idx_dosage_dates
  ON dosage_records(start_date, end_date);
