-- ─── 07_orders_table.sql ──────────────────────────────────────────────────────


-- ── 1. orders ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The authenticated user who placed the order.
  buyer_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Customer details captured at checkout time.
  customer_name    TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  customer_district TEXT NOT NULL,
  customer_phone   TEXT NOT NULL,
  customer_email   TEXT NOT NULL,
  customer_note    TEXT,

  -- Shipping choice: 'inside' | 'suburbs' | 'outside'
  shipping_method  TEXT NOT NULL DEFAULT 'inside',
  shipping_fee     NUMERIC(10, 2) NOT NULL,
  subtotal         NUMERIC(12, 2) NOT NULL,
  total            NUMERIC(12, 2) NOT NULL,

  -- Order lifecycle: 'pending' | 'confirmed' | 'delivered' | 'cancelled'
  status           TEXT NOT NULL DEFAULT 'pending',

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Buyers can place orders.
CREATE POLICY "Buyers can insert orders"
  ON orders FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

-- Buyers can view their own orders.
CREATE POLICY "Buyers can view own orders"
  ON orders FOR SELECT
  USING (auth.uid() = buyer_id);

-- Sellers can view orders that contain at least one of their listings.
-- Uses seller_has_items_in_order() (SECURITY DEFINER) to avoid the RLS cycle
-- that would arise from querying order_items while order_items policies query orders.
CREATE POLICY "Sellers can view orders containing their items"
  ON orders FOR SELECT
  USING (seller_has_items_in_order(id));

-- Sellers can confirm or mark delivered orders containing their items.
CREATE POLICY "Sellers can update status of their orders"
  ON orders FOR UPDATE
  USING (seller_has_items_in_order(id))
  WITH CHECK (seller_has_items_in_order(id));

-- Cancelling an order deletes it entirely (CASCADE removes order_items too).
CREATE POLICY "Sellers can delete their orders"
  ON orders FOR DELETE
  USING (seller_has_items_in_order(id));


-- ── 2. order_items ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Parent order.
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  -- The marketplace listing that was purchased.
  listing_id    UUID REFERENCES marketplace_items(id) ON DELETE SET NULL,

  -- The seller who owns that listing — denormalised here so RLS can filter
  -- efficiently without joining through marketplace_items every time.
  seller_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Snapshot of the listing at purchase time (title/price can change later).
  title         TEXT NOT NULL,
  price         NUMERIC(12, 2) NOT NULL,
  quantity      INTEGER NOT NULL CHECK (quantity > 0),
  item_subtotal NUMERIC(12, 2) NOT NULL,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- ── SECURITY DEFINER helpers (break the RLS cross-reference cycle) ─────────────
--
-- Without these, an order_items policy that queries orders + an orders policy
-- that queries order_items creates infinite recursion in PostgreSQL's RLS engine.
-- SECURITY DEFINER functions run as the DB owner and bypass RLS on the table
-- they query, so the cycle never starts.

-- Returns the buyer_id of an order without triggering orders RLS.
CREATE OR REPLACE FUNCTION get_order_buyer_id(oid UUID)
RETURNS UUID LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT buyer_id FROM orders WHERE id = oid;
$$;

-- Returns true if the current user is a seller in the given order.
CREATE OR REPLACE FUNCTION seller_has_items_in_order(oid UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM order_items
    WHERE order_id = oid AND seller_id = auth.uid()
  );
$$;

-- Buyers can insert order_items when placing an order.
CREATE POLICY "Buyers can insert order items"
  ON order_items FOR INSERT
  WITH CHECK (get_order_buyer_id(order_id) = auth.uid());

-- Sellers can read order_items for their own listings.
CREATE POLICY "Sellers can view their order items"
  ON order_items FOR SELECT
  USING (auth.uid() = seller_id);

-- Buyers can read their own order items.
CREATE POLICY "Buyers can view own order items"
  ON order_items FOR SELECT
  USING (get_order_buyer_id(order_id) = auth.uid());


-- ── 3. Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id     ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order   ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_seller  ON order_items(seller_id);
