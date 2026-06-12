import { supabase } from '../../supabase/supabaseClient';


// Keep this in sync with the CHECK constraint in the database migration.
// Exporting it here means the form dropdown and the validator use the exact same list.
export const VALID_CATEGORIES = ['Livestock', 'Crops', 'Equipment', 'Supplies', 'Other'];


// Validates a listing before insert or update.
// Returns an errors object, or null if everything looks good.
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


// Fetches all active listings from all users — this is the community marketplace.
// .eq('available', true) hides sold or hidden listings.
export async function fetchListings() {
  const { data, error } = await supabase
    .from('marketplace_items')
    .select('*')
    .eq('available', true)
    .order('created_at', { ascending: false }); // newest first

  if (error) throw error;
  return data;
}


// Fetches only listings in a specific category.
// Guards against invalid category strings before touching the database.
export async function fetchListingsByCategory(category) {
  if (!VALID_CATEGORIES.includes(category)) {
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


// Fetches all of the current user's own listings, including hidden ones,
// so they can manage them from their seller dashboard.
export async function fetchMyListings() {
  // No .eq('available', true) here — we want hidden listings visible to the owner
  const { data, error } = await supabase
    .from('marketplace_items')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}


// Publishes a new listing. available is set to true by default so it shows up immediately.
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


// Edits the fields of an existing listing.
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


// Shows or hides a listing without actually deleting it.
// Handy when something is temporarily out of stock.
export async function toggleAvailability(id, available) {
  const { data, error } = await supabase
    .from('marketplace_items')
    .update({ available })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}


// Permanently removes a listing. RLS prevents removing another user's listing.
export async function deleteListing(id) {
  const { error } = await supabase
    .from('marketplace_items')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
