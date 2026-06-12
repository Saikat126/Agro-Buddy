// ─── VetFinderAPI.js — All CRUD operations for the vets table ────────────────

import { supabase } from '../../supabase/supabaseClient';


// ── validateVetData ───────────────────────────────────────────────────────────
// Client-side validation before INSERT or UPDATE.
//
// @param data — vet fields from the form
// @returns    — errors object or null
export function validateVetData(data) {
  const errors = {};

  // Name is the only truly required field.
  if (!data.name || !data.name.trim()) {
    errors.name = 'Vet name is required.';
  }

  // Phone: if provided, basic check — at least 7 digits.
  if (data.phone) {
    // Replace everything that's not a digit, then check the length.
    const digits = data.phone.replace(/\D/g, '');
    if (digits.length < 7) {
      errors.phone = 'Phone number must contain at least 7 digits.';
    }
  }

  // Email: if provided, must look like an email.
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    errors.email = 'Please enter a valid email address.';
  }

  // Rating: if provided, must be between 0 and 5.
  if (data.rating !== undefined && data.rating !== null && data.rating !== '') {
    const r = Number(data.rating);
    if (isNaN(r) || r < 0 || r > 5) {
      errors.rating = 'Rating must be a number between 0 and 5.';
    }
  }

  return Object.keys(errors).length > 0 ? errors : null;
}


// ── fetchVets ─────────────────────────────────────────────────────────────────
// Retrieves all public vets visible to the current user.
// RLS automatically applies the policy:
//   is_public = TRUE  OR  auth.uid() = user_id
//
// Returns: array of vet objects.
export async function fetchVets() {
  const { data, error } = await supabase
    .from('vets')
    .select('*')
    .order('name', { ascending: true });  

  if (error) throw error;
  return data;
}


// ── searchVets ────────────────────────────────────────────────────────────────
// Filters vets by name/specialty (text search) and/or location.
// Both parameters are optional — if both are empty, returns all visible vets.
//
// @param query    — keyword to search in name, specialty, and clinic fields
// @param location — city/area string to filter by (e.g., 'Dhaka')
// Returns: array of matching vet objects.
export async function searchVets(query, location) {
  // Start building the query
  let request = supabase
    .from('vets')
    .select('*')
    .order('name', { ascending: true });

  // ── Search across name, specialty, clinic AND location in one OR clause ─────
  // Including location here means a single search term like "Dhaka" matches
  // vets in that area, not just vets whose name contains "Dhaka".
  if (query && query.trim()) {
    const term = `%${query.trim()}%`;

    request = request.or(
      `name.ilike.${term},specialty.ilike.${term},clinic.ilike.${term},location.ilike.${term}`
    );
  }

  // The separate location parameter is kept for callers that want an explicit
  // location filter on top of a name/specialty search.
  if (location && location.trim()) {
    request = request.ilike('location', `%${location.trim()}%`);
  }

  const { data, error } = await request;
  if (error) throw error;
  return data;
}


// ── fetchAvailableVets ────────────────────────────────────────────────────────
// Retrieves only vets who are currently available for farm visits / appointments.
//
// Returns: array of available vet objects.
export async function fetchAvailableVets() {
  const { data, error } = await supabase
    .from('vets')
    .select('*')
    .eq('available', true)          
    .order('rating', { ascending: false });  

  if (error) throw error;
  return data;
}


// ── createVet ─────────────────────────────────────────────────────────────────
// Adds a new vet record to the database.
//
// @param vetData — { name, specialty?, clinic?, phone?, email?, location?,
//                   rating?, available?, is_public? }
// Returns: the newly created vet object.
export async function createVet(vetData) {
  const errors = validateVetData(vetData);
  if (errors) throw new Error(JSON.stringify(errors));

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be logged in to add vet records.');

  const { data, error } = await supabase
    .from('vets')
    .insert([{
      user_id:   user.id,
      name:      vetData.name.trim(),
      specialty: vetData.specialty  || null,
      clinic:    vetData.clinic     || null,
      phone:     vetData.phone      || null,
      email:     vetData.email?.trim() || null,
      location:  vetData.location   || null,
      map_link:  vetData.map_link   || null,
      rating:    vetData.rating     != null ? Number(vetData.rating) : null,
      available: vetData.available  !== undefined ? vetData.available : true,
      is_public: vetData.is_public  !== undefined ? vetData.is_public : true,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}


// ── updateVet ─────────────────────────────────────────────────────────────────
// Edits an existing vet record.
//
// @param id      — UUID of the vet record to update
// @param vetData — updated fields
// Returns: the updated vet object.
export async function updateVet(id, vetData) {
  const errors = validateVetData(vetData);
  if (errors) throw new Error(JSON.stringify(errors));

  const { data, error } = await supabase
    .from('vets')
    .update({
      name:      vetData.name?.trim(),
      specialty: vetData.specialty  || null,
      clinic:    vetData.clinic     || null,
      phone:     vetData.phone      || null,
      email:     vetData.email?.trim() || null,
      location:  vetData.location   || null,
      map_link:  vetData.map_link   || null,
      rating:    vetData.rating     != null ? Number(vetData.rating) : null,
      available: vetData.available,
      is_public: vetData.is_public,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}


// ── updateVetAvailability ─────────────────────────────────────────────────────
// Toggles a vet's availability (available / unavailable) without editing
// all their other details. Used for a quick "toggle" button in the UI.
//
// @param id        — UUID of the vet record
// @param available — new boolean value (true = taking appointments)
// Returns: the updated vet object.
export async function updateVetAvailability(id, available) {
  const { data, error } = await supabase
    .from('vets')
    .update({ available })   
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}


// ── deleteVet ─────────────────────────────────────────────────────────────────
// Permanently deletes a vet record.
//
// @param id — UUID of the vet record to delete
// Returns: nothing (void).
export async function deleteVet(id) {
  const { error } = await supabase
    .from('vets')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
