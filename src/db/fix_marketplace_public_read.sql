-- ─── fix_marketplace_public_read.sql ──────────────────────────────────────────

-- Step 1: remove any existing policies that conflict
DROP POLICY IF EXISTS "Authenticated users can view all listings"
  ON marketplace_items;

DROP POLICY IF EXISTS "Anyone can view available listings"
  ON marketplace_items;

-- Step 2: create the new public-read policy
CREATE POLICY "Anyone can view available listings"
  ON marketplace_items FOR SELECT
  USING (true);
