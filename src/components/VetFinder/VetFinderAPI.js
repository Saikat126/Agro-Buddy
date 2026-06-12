import { supabase } from '../../supabase/supabaseClient';


// Name is the only required field. Phone and email are optional,
// but if the user fills them in we at least sanity-check the format.
export function validateVetData(data) {
  const errors = {};

  if (!data.name || !data.name.trim()) {
    errors.name = 'Vet name is required.';
  }

  if (data.phone) {
    // Strip everything that isn't a digit and check the length
    const digits = data.phone.replace(/\D/g, '');
    if (digits.length < 7) {
      errors.phone = 'Phone number must contain at least 7 digits.';
    }
  }

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    errors.email = 'Please enter a valid email address.';
  }

  if (data.rating !== undefined && data.rating !== null && data.rating !== '') {
    const r = Number(data.rating);
    if (isNaN(r) || r < 0 || r > 5) {
      errors.rating = 'Rating must be a number between 0 and 5.';
    }
  }

  return Object.keys(errors).length > 0 ? errors : null;
}


// Fetches all vets visible to the current user.
// The RLS policy handles the filter: public vets OR vets added by this user.
export async function fetchVets() {
  const { data, error } = await supabase
    .from('vets')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data;
}


// Searches vets by name, specialty, clinic, and location in a single OR clause
// so one search term like "Dhaka" matches vets in that area, not just vets named "Dhaka...".
// The separate location param is there for callers that want an explicit location filter
// on top of a text search — not used by the UI currently but handy for future use.
export async function searchVets(query, location) {
  let request = supabase
    .from('vets')
    .select('*')
    .order('name', { ascending: true });

  if (query && query.trim()) {
    const term = `%${query.trim()}%`;
    request = request.or(
      `name.ilike.${term},specialty.ilike.${term},clinic.ilike.${term},location.ilike.${term}`
    );
  }

  if (location && location.trim()) {
    request = request.ilike('location', `%${location.trim()}%`);
  }

  const { data, error } = await request;
  if (error) throw error;
  return data;
}


// Fetches only vets who are flagged as currently available.
// Results are ordered by rating so the best-rated vets come first.
export async function fetchAvailableVets() {
  const { data, error } = await supabase
    .from('vets')
    .select('*')
    .eq('available', true)
    .order('rating', { ascending: false });

  if (error) throw error;
  return data;
}


// Adds a new vet to the shared directory.
// available and is_public default to true so the vet shows up for everyone immediately.
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


// Updates a vet's details.
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


// Quick toggle for availability — used instead of a full update when you
// just want to flip the "taking appointments" switch.
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


// Permanently removes a vet record. RLS makes sure you can only delete your own.
export async function deleteVet(id) {
  const { error } = await supabase
    .from('vets')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
