-- ─── fix_seller_order_policy.sql ──────────────────────────────────────────────

CREATE POLICY "Sellers can view orders containing their items"
  ON orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM order_items
      WHERE order_items.order_id = orders.id
        AND order_items.seller_id = auth.uid()
    )
  );
