// ─── MarketplaceAPI.js — All CRUD operations for marketplace_items ────────────

import { supabase } from '../../supabase/supabaseClient';


// ── VALID_CATEGORIES ──────────────────────────────────────────────────────────
// Mirror of the CHECK constraint in 03_marketplace_table.sql.
// Defined here so the component can use it to build the category dropdown,
// and so validateListingData() can check against the same list.
export const VALID_CATEGORIES = ['Livestock', 'Crops', 'Equipment', 'Supplies', 'Other'];


// ── validateListingData ───────────────────────────────────────────────────────
// Client-side validation before INSERT or UPDATE.
//
// @param data — listing fields from the form
// @returns    — errors object or null
export function validateListingData(data) {
  const errors = {};

  if (!data.title || !data.title.trim()) {
    errors.title = 'Listing title is required.';
  }

  if (!data.category || !VALID_CATEGORIES.includes(data.category)) {
    errors.category = `Category must be one of: ${VALID_CATEGORIES.join(', ')}.`;
  }

  if (data.price === undefined || data.price === null || data.price === '') {
    errors.price = 'Price is required.';
  } else if (isNaN(Number(data.price)) || Number(data.price) <= 0) {
    // Price must be a positive number. <= 0 catches zero and negative values.
    errors.price = 'Price must be a positive number.';
  }

  if (!data.unit || !data.unit.trim()) {
    errors.unit = 'Unit is required (e.g., "per head", "per kg").';
  }

  if (!data.seller_name || !data.seller_name.trim()) {
    errors.seller_name = 'Seller name is required.';
  }

  return Object.keys(errors).length > 0 ? errors : null;
}


// ── fetchListings ─────────────────────────────────────────────────────────────
// Retrieves ALL available listings from ALL users (the community marketplace).
//
// .eq('available', true) filters out hidden/sold listings.
// newest first so fresh listings appear at the top.
//
// Returns: array of listing objects.
export async function fetchListings() {
  const { data, error } = await supabase
    .from('marketplace_items')
    .select('*')
    .eq('available', true)                              // only active listings
    .order('created_at', { ascending: false });          // newest first

  if (error) throw error;
  return data;
}


// ── fetchListingsByCategory ───────────────────────────────────────────────────
// Retrieves available listings filtered by a single category.
//
// @param category — one of VALID_CATEGORIES
// Returns: array of listing objects in that category.
export async function fetchListingsByCategory(category) {
  if (!VALID_CATEGORIES.includes(category)) {
    // Guard against invalid category strings before hitting the database.
    throw new Error(`Invalid category: "${category}". Must be one of: ${VALID_CATEGORIES.join(', ')}.`);
  }

  const { data, error } = await supabase
    .from('marketplace_items')
    .select('*')
    .eq('available', true)
    .eq('category', category)   
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}


// ── fetchMyListings ───────────────────────────────────────────────────────────
// Retrieves ALL listings (available AND hidden) owned by the current user.
// Used for the "My Listings" / seller dashboard view.
//
// Returns: array of the current user's listing objects.
export async function fetchMyListings() {
  // No .eq('available', true) here — we want to show hidden listings too
  // so the seller can re-activate or delete them.
  const { data, error } = await supabase
    .from('marketplace_items')
    .select('*')
    .order('created_at', { ascending: false });


  if (error) throw error;
  return data;
}


// ── createListing ─────────────────────────────────────────────────────────────
// Publishes a new marketplace listing for the current user.
//
// @param listingData — { title, category, price, unit, seller_name, description?, image_url? }
// Returns: the newly created listing object.
export async function createListing(listingData) {
  const errors = validateListingData(listingData);
  if (errors) throw new Error(JSON.stringify(errors));

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be logged in to create a listing.');

  const { data, error } = await supabase
    .from('marketplace_items')
    .insert([{
      user_id:     user.id,
      title:       listingData.title.trim(),
      category:    listingData.category,
      price:       Number(listingData.price),         
      unit:        listingData.unit.trim(),
      seller_name: listingData.seller_name.trim(),
      description: listingData.description || null,
      image_url:   listingData.image_url   || null,
      available:   true,                               
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}


// ── updateListing ─────────────────────────────────────────────────────────────
// Edits the fields of an existing listing.
//
// @param id          — UUID of the listing to update
// @param listingData — fields to change
// Returns: the updated listing object.
export async function updateListing(id, listingData) {
  const errors = validateListingData(listingData);
  if (errors) throw new Error(JSON.stringify(errors));

  const { data, error } = await supabase
    .from('marketplace_items')
    .update({
      title:       listingData.title?.trim(),
      category:    listingData.category,
      price:       Number(listingData.price),
      unit:        listingData.unit?.trim(),
      seller_name: listingData.seller_name?.trim(),
      description: listingData.description || null,
      image_url:   listingData.image_url   || null,
    })
    .eq('id', id)    
    .select()
    .single();

  if (error) throw error;
  return data;
}


// ── toggleAvailability ────────────────────────────────────────────────────────
// Shows or hides a listing without deleting it.
// Hiding is useful when an item sells or is temporarily out of stock.
//
// @param id        — UUID of the listing
// @param available — true = show listing, false = hide listing
// Returns: the updated listing object.
export async function toggleAvailability(id, available) {
  const { data, error } = await supabase
    .from('marketplace_items')
    .update({ available })   // only the `available` column is changed
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}


// ── deleteListing ─────────────────────────────────────────────────────────────
// Permanently deletes a listing.
//
// @param id — UUID of the listing to delete
// Returns: nothing (void).
export async function deleteListing(id) {
  const { error } = await supabase
    .from('marketplace_items')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
