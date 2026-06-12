// ─── OrdersAPI.js — Save and retrieve orders ──────────────────────────────────

import { supabase } from '../../supabase/supabaseClient';


// ── placeOrder ────────────────────────────────────────────────────────────────
// Creates an order record and one order_item per cart entry.
//
// @param billing  — { fullName, address, district, phone, email, note }
// @param shipping — { method: 'inside'|'suburbs'|'outside', fee: number }
// @param cart     — array of cart items from App.jsx state
//                   Each item: { id, title, price, quantity, user_id, ... }
//
// Returns: the saved order object.
export async function placeOrder(billing, shipping, cart) {
  // Step 1: get the current buyer's id.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be signed in to place an order.');

  // Step 2: calculate totals.
  const subtotal = cart.reduce((s, item) => s + Number(item.price) * item.quantity, 0);
  const total    = subtotal + shipping.fee;

  // Step 3: insert the parent order row.
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert([{
      buyer_id:         user.id,
      customer_name:    billing.fullName.trim(),
      customer_address: billing.address.trim(),
      customer_district:billing.district.trim(),
      customer_phone:   billing.phone.trim(),
      customer_email:   billing.email.trim(),
      customer_note:    billing.note?.trim() || null,
      shipping_method:  shipping.method,
      shipping_fee:     shipping.fee,
      subtotal:         parseFloat(subtotal.toFixed(2)),
      total:            parseFloat(total.toFixed(2)),
      status:           'pending',
    }])
    .select()
    .single();

  if (orderErr) throw orderErr;

  // Step 4: insert one order_item row per cart entry.
  // seller_id comes from item.user_id (the listing owner) — this is what lets
  // the seller query "all order_items where seller_id = me".
  const orderItems = cart.map((item) => ({
    order_id:     order.id,
    listing_id:   item.id,
    seller_id:    item.user_id,                          
    title:        item.title,
    price:        parseFloat(Number(item.price).toFixed(2)),
    quantity:     item.quantity,
    item_subtotal:parseFloat((Number(item.price) * item.quantity).toFixed(2)),
  }));

  const { error: itemsErr } = await supabase
    .from('order_items')
    .insert(orderItems);

  if (itemsErr) throw itemsErr;

  return order;
}


// ── fetchSellerOrders ─────────────────────────────────────────────────────────
// Retrieves all orders that contain at least one item from the current seller.
// Multiple items from the same seller in one order appear as separate rows.
// The component groups them by order_id for display.
export async function fetchSellerOrders() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('order_items')
    .select(`
      *,
      order:orders (
        id,
        customer_name,
        customer_address,
        customer_district,
        customer_phone,
        customer_email,
        customer_note,
        shipping_method,
        shipping_fee,
        subtotal,
        total,
        status,
        created_at
      )
    `)
    // Must filter explicitly: the buyer RLS policy also lets buyers read their
    // own order_items, so without this a buyer would see their purchases here.
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Group rows by order_id so the UI can render one card per order.
  // Skip any row whose joined order is null — this happens when the seller-read
  // RLS policy hasn't been applied yet (run fix_seller_order_policy.sql).
  const grouped = {};
  for (const row of data) {
    if (!row.order) continue; // null = RLS blocked the orders join
    const oid = row.order_id;
    if (!grouped[oid]) {
      grouped[oid] = {
        order: row.order,
        items: [],
      };
    }
    grouped[oid].items.push({
      id:           row.id,
      listing_id:   row.listing_id,
      title:        row.title,
      price:        row.price,
      quantity:     row.quantity,
      item_subtotal:row.item_subtotal,
    });
  }

  // Return as a sorted array (newest first by order created_at).
  return Object.values(grouped).sort(
    (a, b) => new Date(b.order.created_at) - new Date(a.order.created_at)
  );
}


// ── fetchBuyerOrders ──────────────────────────────────────────────────────────
// Returns all orders placed by the current user, newest first.
// Each order includes its line items so the buyer can see what they ordered.
export async function fetchBuyerOrders() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // .eq('buyer_id', user.id) is required even though RLS exists:
  // the seller SELECT policy also lets sellers read orders containing their items,
  // so without this filter a seller would see their customers' orders here too.
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, customer_name, customer_address, customer_district,
      shipping_method, shipping_fee, subtotal, total,
      status, created_at,
      order_items ( id, title, price, quantity, item_subtotal )
    `)
    .eq('buyer_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}


// ── deleteOrder ───────────────────────────────────────────────────────────────
// Permanently removes an order and all its items (CASCADE delete).
// Called when a seller cancels an order.
export async function deleteOrder(orderId) {
  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', orderId);

  if (error) throw error;
}


// ── updateOrderStatus ─────────────────────────────────────────────────────────
// Allows a seller to confirm or cancel an order they have items in.
//
// @param orderId — UUID of the order to update
// @param status  — 'confirmed' | 'cancelled' | 'delivered'
//
// Returns: the updated order object.
export async function updateOrderStatus(orderId, status) {
  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
