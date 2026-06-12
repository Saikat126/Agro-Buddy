-- ─── fix_orders_rls_recursion.sql ─────────────────────────────────────────────

-- ── 1. Helper functions ────────────────────────────────────────────────────────

-- Returns the buyer_id of an order — bypasses orders RLS (no recursion).
CREATE OR REPLACE FUNCTION get_order_buyer_id(oid UUID)
RETURNS UUID LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT buyer_id FROM orders WHERE id = oid;
$$;

-- Returns true if the current user has at least one item in the order.
-- Bypasses order_items RLS (no recursion).
CREATE OR REPLACE FUNCTION seller_has_items_in_order(oid UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM order_items
    WHERE order_id = oid AND seller_id = auth.uid()
  );
$$;

-- ── 2. Recreate the policies that caused the cycle ─────────────────────────────

-- order_items: buyer INSERT
DROP POLICY IF EXISTS "Buyers can insert order items" ON order_items;
CREATE POLICY "Buyers can insert order items"
  ON order_items FOR INSERT
  WITH CHECK (get_order_buyer_id(order_id) = auth.uid());

-- order_items: buyer SELECT
DROP POLICY IF EXISTS "Buyers can view own order items" ON order_items;
CREATE POLICY "Buyers can view own order items"
  ON order_items FOR SELECT
  USING (get_order_buyer_id(order_id) = auth.uid());

-- orders: seller SELECT
DROP POLICY IF EXISTS "Sellers can view orders containing their items" ON orders;
CREATE POLICY "Sellers can view orders containing their items"
  ON orders FOR SELECT
  USING (seller_has_items_in_order(id));
