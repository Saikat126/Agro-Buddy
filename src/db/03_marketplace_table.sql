-- ─── 03_marketplace_table.sql ─────────────────────────────────────────────────


-- ── 1. Create the table ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS marketplace_items (

  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The farmer who posted this listing.
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Display title for the listing (e.g., "Friesian Cow — 3 years old").
  title        TEXT NOT NULL CHECK (char_length(trim(title)) > 0),

  -- Product category. CHECK restricts to the predefined list so the UI's
  -- category filter always matches valid database values.
  category     TEXT NOT NULL
                 CHECK (category IN ('Livestock', 'Crops', 'Equipment', 'Supplies', 'Other')),

  -- Price in local currency (up to 99,999,999,999.99).
  -- CHECK ensures the price is always positive.
  price        NUMERIC(12, 2) NOT NULL CHECK (price > 0),

  -- Unit of sale (e.g., "per head", "per kg", "each").
  unit         TEXT NOT NULL CHECK (char_length(trim(unit)) > 0),

  -- Seller's display name (can differ from the auth account name).
  seller_name  TEXT NOT NULL CHECK (char_length(trim(seller_name)) > 0),

  -- Longer description of the product.
  description  TEXT,

  -- Optional URL to a product image.
  image_url    TEXT,

  -- Whether this listing is still active. Sellers can "hide" a listing
  -- without deleting it by setting this to FALSE.
  available    BOOLEAN NOT NULL DEFAULT TRUE,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()

);


-- ── 2. Row Level Security ─────────────────────────────────────────────────────
ALTER TABLE marketplace_items ENABLE ROW LEVEL SECURITY;

-- PUBLIC READ: everyone (signed-in OR signed-out) can browse available listings.
-- USING (true) means no restriction on SELECT — the available=TRUE filter in
-- the API query still hides sold/hidden listings.
CREATE POLICY "Anyone can view available listings"
  ON marketplace_items FOR SELECT
  USING (true);

-- Only the owner can post new listings (they cannot impersonate other sellers).
CREATE POLICY "Users can insert own listings"
  ON marketplace_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only the owner can edit their listing.
CREATE POLICY "Users can update own listings"
  ON marketplace_items FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Only the owner can remove their listing.
CREATE POLICY "Users can delete own listings"
  ON marketplace_items FOR DELETE
  USING (auth.uid() = user_id);


-- ── 3. Indexes ────────────────────────────────────────────────────────────────
-- Browsing and filtering by category is the most common query.
CREATE INDEX IF NOT EXISTS idx_marketplace_category  ON marketplace_items(category);

-- Filter to show only available listings efficiently.
CREATE INDEX IF NOT EXISTS idx_marketplace_available ON marketplace_items(available);

-- Seller's own listings page: quick lookup by user_id.
CREATE INDEX IF NOT EXISTS idx_marketplace_user_id   ON marketplace_items(user_id);
