import { supabase } from '../../supabase/supabaseClient';


// Creates the parent order row first, then inserts one order_item per cart entry.
// seller_id on each item is set to item.user_id (the listing owner) — this is what
// lets the seller later query "show me all order_items where seller_id = me".
export async function placeOrder(billing, shipping, cart) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be signed in to place an order.');

  const subtotal = cart.reduce((s, item) => s + Number(item.price) * item.quantity, 0);
  const total    = subtotal + shipping.fee;

  // Insert the order header first so we get an order.id to attach the items to
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert([{
      buyer_id:          user.id,
      customer_name:     billing.fullName.trim(),
      customer_address:  billing.address.trim(),
      customer_district: billing.district.trim(),
      customer_phone:    billing.phone.trim(),
      customer_email:    billing.email.trim(),
      customer_note:     billing.note?.trim() || null,
      shipping_method:   shipping.method,
      shipping_fee:      shipping.fee,
      subtotal:          parseFloat(subtotal.toFixed(2)),
      total:             parseFloat(total.toFixed(2)),
      status:            'pending',
    }])
    .select()
    .single();

  if (orderErr) throw orderErr;

  // Now insert one row per cart item, linked to the order we just created
  const orderItems = cart.map((item) => ({
    order_id:      order.id,
    listing_id:    item.id,
    seller_id:     item.user_id, // the person who posted the listing
    title:         item.title,
    price:         parseFloat(Number(item.price).toFixed(2)),
    quantity:      item.quantity,
    item_subtotal: parseFloat((Number(item.price) * item.quantity).toFixed(2)),
  }));

  const { error: itemsErr } = await supabase
    .from('order_items')
    .insert(orderItems);

  if (itemsErr) throw itemsErr;

  return order;
}


// Fetches all orders that contain at least one item belonging to the current seller.
// The result is grouped by order_id so the UI can render one card per order.
// Note: we must filter by seller_id explicitly — without it, a seller would also
// see their own purchases because the buyer RLS policy overlaps.
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
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Group individual item rows by their parent order
  const grouped = {};
  for (const row of data) {
    if (!row.order) continue; // RLS blocked the join — skip this row
    const oid = row.order_id;
    if (!grouped[oid]) {
      grouped[oid] = { order: row.order, items: [] };
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

  // Sort the grouped results so the newest orders come first
  return Object.values(grouped).sort(
    (a, b) => new Date(b.order.created_at) - new Date(a.order.created_at)
  );
}


// Fetches all orders placed by the current user (buyer view), newest first.
// Each order includes its line items so the buyer can see what they ordered.
// The .eq('buyer_id', user.id) is necessary even with RLS because the seller
// policy also allows sellers to read orders containing their items.
export async function fetchBuyerOrders() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

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


// Deletes an order and all its items (CASCADE handles the child rows).
// Called when a seller cancels or marks an order as delivered.
export async function deleteOrder(orderId) {
  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', orderId);

  if (error) throw error;
}


// Lets a seller move an order through the lifecycle: pending → confirmed → delivered.
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
