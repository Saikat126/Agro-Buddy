// ─── Marketplace.jsx — Feature: Farm Marketplace ─────────────────────────────
// Displays product listings. Users can search by listing title,
// post new listings, and remove existing ones.

import React, { useState, useEffect, useMemo } from 'react';
import './Marketplace.css';
import { fetchListings, createListing, deleteListing, VALID_CATEGORIES } from './MarketplaceAPI';
import { fetchSellerOrders, updateOrderStatus, deleteOrder } from '../Checkout/OrdersAPI';
import { useConfirm } from '../shared/useConfirm';

// user, addToCart, onGoToCheckout — passed from App.jsx.
export default function Marketplace({ user, addToCart, onGoToCheckout }) {

  // 'browse' | 'orders' — which view is active for signed-in sellers
  const { confirm, dialog } = useConfirm();
  const [view, setView] = useState('browse');

  // listings — full array fetched from the server
  const [listings, setListings] = useState([]);

  // searchQuery — text the user types in the search box
  const [searchQuery, setSearchQuery] = useState('');

  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [showForm, setShowForm] = useState(false);

  // formData mirrors every field in the "Post Listing" form
  const [formData, setFormData] = useState({
    title:       '',
    category:    'Livestock',  
    price:       '',
    unit:        '',          
    seller_name: '',           
    description: '',
  });

  // Seller orders state
  const [sellerOrders,     setSellerOrders]     = useState([]);
  const [ordersLoading,    setOrdersLoading]    = useState(false);
  const [ordersError,      setOrdersError]      = useState(null);

  // Load seller orders when the orders view is activated
  useEffect(() => {
    if (view !== 'orders' || !user) return;
    setOrdersLoading(true);
    setOrdersError(null);
    fetchSellerOrders()
      .then(setSellerOrders)
      .catch(() => setOrdersError('Could not load orders.'))
      .finally(() => setOrdersLoading(false));
  }, [view, user]);

  // ── handleOrderStatusChange ───────────────────────────────────────────────────
  async function handleOrderStatusChange(orderId, newStatus) {
    try {
      if (newStatus === 'cancelled' || newStatus === 'delivered') {
        // Delete the order entirely — cascade removes its order_items too
        await deleteOrder(orderId);
        setSellerOrders((prev) => prev.filter((entry) => entry.order.id !== orderId));
      } else {
        await updateOrderStatus(orderId, newStatus);
        setSellerOrders((prev) =>
          prev.map((entry) =>
            entry.order.id === orderId
              ? { ...entry, order: { ...entry.order, status: newStatus } }
              : entry
          )
        );
      }
    } catch (err) {
      setOrdersError('Could not update order. Please try again.');
      console.error(err);
    }
  }

  // ── Fetch listings once on mount ─────────────────────────────────────────────
  useEffect(() => {
    loadListings();
  }, []);

  async function loadListings() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchListings();
      setListings(data);
    } catch (err) {
      setError('Could not load marketplace listings.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // ── myListings ────────────────────────────────────────────────────────────────
  // The signed-in user's own listings — shown by default when no search is active.
  const myListings = useMemo(() => {
    if (!user) return [];
    return listings.filter((item) => item.user_id === user.id);
  }, [listings, user]);

  // ── searchResults ─────────────────────────────────────────────────────────────
  // All listings whose title matches the search query (every user's listings).
  // Only populated when the search box is non-empty.
  const searchResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];
    return listings.filter((item) =>
      item.title.toLowerCase().includes(q)
    );
  }, [listings, searchQuery]);

  // Convenience flag — true when the user has typed something in the search box
  const isSearching = searchQuery.trim().length > 0;

  // ── handleInputChange ─────────────────────────────────────────────────────────
  // Single handler for all form inputs — updates only the field that changed.
  function handleInputChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  // ── handleAddListing ──────────────────────────────────────────────────────────
  // Validates, posts to API, prepends result to state, resets form.
  async function handleAddListing(e) {
    e.preventDefault(); 

    if (!formData.title.trim() || !formData.price || !formData.seller_name.trim()) {
      alert('Title, price, and seller name are required.');
      return;
    }

    try {
      const newListing = await createListing(formData);
      setListings((prev) => [newListing, ...prev]); 
      setFormData({ title: '', category: 'Livestock', price: '', unit: '', seller_name: '', description: '' });
      setShowForm(false);
    } catch (err) {
      setError('Failed to post listing.');
      console.error(err);
    }
  }

  // ── handleDelete ──────────────────────────────────────────────────────────────
  // Confirms, deletes from server, removes from local state.
  async function handleDelete(id) {
    if (!await confirm('Remove this listing?')) return;
    try {
      await deleteListing(id);
      setListings((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError('Failed to remove listing.');
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="marketplace">
      {dialog}

      {/* Header: title + view toggle (for signed-in users) + post button */}
      <div className="mp-header">
        <div className="mp-header-left">
          <h2 className="section-title" style={{ marginBottom: 0 }}>Farm Marketplace</h2>
          {user && (
            <div className="mp-view-toggle">
              <button
                className={`mp-toggle-btn ${view === 'browse' ? 'active' : ''}`}
                onClick={() => setView('browse')}
              >
                Browse
              </button>
              <button
                className={`mp-toggle-btn ${view === 'orders' ? 'active' : ''}`}
                onClick={() => setView('orders')}
              >
                Incoming Orders
              </button>
            </div>
          )}
        </div>
        {user ? (
          <button className="btn-primary" onClick={() => {
            if (showForm) setFormData({ title: '', category: 'Livestock', price: '', unit: '', seller_name: '', description: '' });
            setShowForm((p) => !p);
          }}>
            {showForm ? 'Cancel' : '+ Post Listing'}
          </button>
        ) : (
          <span className="mp-signin-hint">Sign in to post a listing</span>
        )}
      </div>

      {/* ── Seller: Incoming Orders view ── */}
      {view === 'orders' && user && (
        <SellerOrdersPanel
          orders={sellerOrders}
          loading={ordersLoading}
          error={ordersError}
          onStatusChange={handleOrderStatusChange}
        />
      )}

      {/* ── Browse view (default) ── */}
      {view === 'browse' && (
      <>

      {/* ── Post Listing Form — only reachable when signed in ── */}
      {showForm && user && (
        <form className="mp-form card" onSubmit={handleAddListing}>
          <h3 className="mp-form-title">New Listing</h3>

          <label className="ap-label">
            Title *
            <input
              className="input-field"
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="e.g. Holstein Cows for Sale"
            />
          </label>

          <label className="ap-label">
            Category *
            <select
              className="input-field"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
            >
              {VALID_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </label>

          <div className="mp-row">
            <label className="ap-label">
              Price ($) *
              <input
                className="input-field"
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                min="0"
                placeholder="0.00"
              />
            </label>

            <label className="ap-label">
              Unit
              <input
                className="input-field"
                type="text"
                name="unit"
                value={formData.unit}
                onChange={handleInputChange}
                placeholder="e.g. per head, per kg"
              />
            </label>
          </div>

          <label className="ap-label">
            Seller Name *
            <input
              className="input-field"
              type="text"
              name="seller_name"
              value={formData.seller_name}
              onChange={handleInputChange}
              placeholder="Your name or farm name"
            />
          </label>

          <label className="ap-label">
            Description
            <textarea
              className="input-field"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              placeholder="Details about the listing..."
            />
          </label>

          <button type="submit" className="btn-primary">Post Listing</button>
        </form>
      )}

      {/* ── Search by name only ── */}
      <input
        className="input-field mp-search"
        type="text"
        placeholder="Search by listing name..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      {/* Status / loading */}
      {loading && <p className="ap-loading">Loading listings...</p>}
      {error   && <p className="ap-error">{error}</p>}

      {!loading && !error && (
        <>
          {/* ── No search active ── */}
          {!isSearching && (
            <>
              {user ? (
                // Signed in, no search → show only this user's listings
                <>
                  <p className="mp-section-label">Your Listings</p>
                  {myListings.length === 0 ? (
                    <p className="ap-empty">
                      You haven't posted any listings yet. Click <strong>+ Post Listing</strong> to add one.
                    </p>
                  ) : (
                    <ListingsGrid items={myListings} user={user} onDelete={handleDelete} onAddToCart={addToCart} onGoToCheckout={onGoToCheckout} />
                  )}
                  <p className="mp-search-hint">
                    Search above to browse listings from other farmers.
                  </p>
                </>
              ) : (
                // Signed out, no search → prompt to search
                <p className="ap-empty">Search by listing name to browse the marketplace.</p>
              )}
            </>
          )}

          {/* ── Search active → show all matching listings ── */}
          {isSearching && (
            <>
              {searchResults.length === 0 ? (
                <p className="ap-empty">No listings found for "{searchQuery}".</p>
              ) : (
                <>
                  <p className="mp-section-label">
                    Search results for "{searchQuery}" ({searchResults.length})
                  </p>
                  <ListingsGrid items={searchResults} user={user} onDelete={handleDelete} onAddToCart={addToCart} onGoToCheckout={onGoToCheckout} />
                </>
              )}
            </>
          )}
        </>
      )}

      {/* close the browse <> fragment */}
      </>
      )}

    </div>
  );
}

// ── SellerOrdersPanel ─────────────────────────────────────────────────────────
// Shows all incoming orders that contain at least one of the seller's listings.
// Only rendered when view === 'orders' and user is signed in.
function SellerOrdersPanel({ orders, loading, error, onStatusChange }) {
  const SHIP_LABELS = { inside: 'Inside Dhaka', suburbs: 'Dhaka Suburbs', outside: 'Outside Dhaka', standard: 'Standard Delivery' };

  if (loading) return <p className="ap-loading">Loading orders…</p>;
  if (error)   return <p className="ap-error">{error}</p>;
  if (orders.length === 0) return (
    <p className="ap-empty">No incoming orders yet. Orders will appear here when customers buy your listings.</p>
  );

  return (
    <div className="mp-orders-list">
      {orders.map(({ order, items }) => {
        if (!order) return null; // safety guard if RLS blocks the join
        const isPending   = order.status === 'pending';
        const isConfirmed = order.status === 'confirmed';
        return (
        <div key={order.id} className="mp-order-card card">

          {/* ── Order header ── */}
          <div className="mp-order-header">
            <div>
              <span className="mp-order-id">Order #{order.id.slice(0, 8).toUpperCase()}</span>
              <span className="mp-order-date">
                {new Date(order.created_at).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </span>
            </div>
            <div className="mp-order-header-right">
              <span className={`mp-order-status mp-status-${order.status}`}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </span>
              {/* Action buttons — only for pending or confirmed orders */}
              {isPending && (
                <div className="mp-order-actions">
                  <button
                    className="btn-primary mp-action-btn"
                    onClick={() => onStatusChange(order.id, 'confirmed')}
                  >
                    ✓ Confirm
                  </button>
                  <button
                    className="btn-danger mp-action-btn"
                    onClick={() => onStatusChange(order.id, 'cancelled')}
                  >
                    ✕ Cancel
                  </button>
                </div>
              )}
              {isConfirmed && (
                <div className="mp-order-actions">
                  <button
                    className="btn-primary mp-action-btn"
                    onClick={() => onStatusChange(order.id, 'delivered')}
                  >
                    📦 Mark Delivered
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mp-order-body">

            {/* ── Customer details (seller-only view) ── */}
            <div className="mp-customer-details">
              <p className="mp-order-section-label">Customer Details</p>
              <table className="mp-customer-table">
                <tbody>
                  <tr><td>Name</td><td><strong>{order.customer_name}</strong></td></tr>
                  <tr><td>Address</td><td>{order.customer_address}</td></tr>
                  <tr><td>District</td><td>{order.customer_district}</td></tr>
                  <tr><td>Phone</td><td><a href={`tel:${order.customer_phone}`}>{order.customer_phone}</a></td></tr>
                  <tr><td>Email</td><td><a href={`mailto:${order.customer_email}`}>{order.customer_email}</a></td></tr>
                  {order.customer_note && <tr><td>Note</td><td><em>{order.customer_note}</em></td></tr>}
                  <tr><td>Shipping</td><td>{SHIP_LABELS[order.shipping_method] || order.shipping_method} (৳{order.shipping_fee})</td></tr>
                </tbody>
              </table>
            </div>

            {/* ── Items from this seller ── */}
            <div className="mp-ordered-items">
              <p className="mp-order-section-label">Your Items in This Order</p>
              <table className="mp-items-table">
                <thead>
                  <tr><th>Product</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.title}</td>
                      <td>{item.quantity}</td>
                      <td>${Number(item.price).toFixed(2)}</td>
                      <td><strong>${Number(item.item_subtotal).toFixed(2)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mp-order-your-total">
                Your items total: <strong>${items.reduce((s, i) => s + Number(i.item_subtotal), 0).toFixed(2)}</strong>
              </p>
            </div>
          </div>
        </div>
        ); // close return(
      })}
    </div>
  );
}

// ── ListingsGrid ──────────────────────────────────────────────────────────────
function ListingsGrid({ items, user, onDelete, onAddToCart, onGoToCheckout }) {
  return (
    <div className="mp-grid">
      {items.map((item) => (
        <div key={item.id} className="mp-card card">
          <h3 className="mp-card-title">{item.title}</h3>
          <span className="mp-category-badge">{item.category}</span>
          <div className="mp-price">
            ${Number(item.price).toFixed(2)}
            {item.unit && <span className="mp-unit"> {item.unit}</span>}
          </div>
          <p className="mp-description">{item.description}</p>
          <div className="mp-footer">
            <span className="mp-seller">🧑‍🌾 {item.seller_name}</span>
          </div>
          <div className="mp-card-actions">
            {/* Add to Cart — only for signed-in users who do NOT own this listing */}
            {user && user.id !== item.user_id && (
              <button
                className="btn-primary mp-cart-btn"
                onClick={() => {
                  onAddToCart(item);
                  onGoToCheckout();
                }}
              >
                🛒 Add to Cart
              </button>
            )}
            {/* Owner badge shown instead of the cart button */}
            {user && user.id === item.user_id && (
              <span className="mp-own-badge">Your Listing</span>
            )}
            {/* Remove — only the listing owner */}
            {user && user.id === item.user_id && (
              <button className="btn-danger" onClick={() => onDelete(item.id)}>
                Remove
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
