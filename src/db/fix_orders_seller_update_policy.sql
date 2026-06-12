-- ─── fix_orders_seller_update_policy.sql ──────────────────────────────────────

DROP POLICY IF EXISTS "Sellers can update status of their orders" ON orders;
DROP POLICY IF EXISTS "Sellers can delete their orders"           ON orders;

CREATE POLICY "Sellers can update status of their orders"
  ON orders FOR UPDATE
  USING (seller_has_items_in_order(id))
  WITH CHECK (seller_has_items_in_order(id));

-- Cancelling an order deletes it entirely (CASCADE removes order_items too).
CREATE POLICY "Sellers can delete their orders"
  ON orders FOR DELETE
  USING (seller_has_items_in_order(id));
