// ─── AnimalProfilesAPI.js — All CRUD operations for the animals table ─────────

import { supabase } from '../../supabase/supabaseClient';


// ── validateAnimalData ────────────────────────────────────────────────────────
// Checks the data object before any INSERT or UPDATE reaches the database.
// Client-side validation gives instant feedback — no network round-trip needed.
//
// @param data — the animal fields object from the form
// @returns    — an errors object like { name: 'Name is required.' }
//               Returns null when ALL fields are valid.
export function validateAnimalData(data) {
  const errors = {};

  // ── name ──────────────────────────────────────────────────────────────────
  if (!data.name || !data.name.trim()) {
    // trim() removes leading/trailing whitespace so '   ' is treated as empty.
    errors.name = 'Animal name is required.';
  }

  // ── species ───────────────────────────────────────────────────────────────
  if (!data.species || !data.species.trim()) {
    errors.species = 'Species is required (e.g., Cattle, Goat, Chicken).';
  }

  // ── age_years ─────────────────────────────────────────────────────────────
  // Age is optional — only validate if the user filled it in.
  if (data.age_years !== undefined && data.age_years !== null && data.age_years !== '') {
    const age = Number(data.age_years);
    if (isNaN(age) || age < 0) {
      errors.age_years = 'Age must be a positive number (e.g., 1.5 for 18 months).';
    }
  }

  // ── weight_kg ─────────────────────────────────────────────────────────────
  // Weight is optional — only validate if the user filled it in.
  if (data.weight_kg !== undefined && data.weight_kg !== null && data.weight_kg !== '') {
    const weight = Number(data.weight_kg);
    if (isNaN(weight) || weight <= 0) {
      errors.weight_kg = 'Weight must be greater than zero.';
    }
  }

  return Object.keys(errors).length > 0 ? errors : null;
}


// ── fetchAnimals ──────────────────────────────────────────────────────────────
// Retrieves ALL animals that belong to the currently logged-in user.
// Returns: array of animal objects.
// Throws:  Supabase error on network failure or auth error.
export async function fetchAnimals() {
  const { data, error } = await supabase
    .from('animals')
    .select('*')
    .order('created_at', { ascending: false }); // newest first

  if (error) throw error;
  return data; // e.g. [{ id, user_id, name, species, breed, age_years, weight_kg, notes, created_at }]
}


// ── fetchAnimalById ───────────────────────────────────────────────────────────
// Retrieves a single animal by its UUID.
// Useful when loading a detail/edit view without re-fetching the full list.
//
// @param id — the UUID of the animal to fetch
// Returns: a single animal object.
export async function fetchAnimalById(id) {
  const { data, error } = await supabase
    .from('animals')
    .select('*')
    .eq('id', id)   // .eq('column', value) → WHERE id = ?
    .single();       // .single() returns one object instead of an array,
                     // and throws if 0 or >1 rows match

  if (error) throw error;
  return data;
}


// ── createAnimal ──────────────────────────────────────────────────────────────
// Inserts a new animal row for the current user.
//
// @param animalData — form fields: { name, species, breed?, age_years?, weight_kg?, notes? }
// Returns: the newly created animal object (with its server-assigned id).
export async function createAnimal(animalData) {
  // Step 1: validate inputs before touching the network.
  const errors = validateAnimalData(animalData);
  if (errors) {
    // Throw with the errors object stringified so the component can parse it.
    throw new Error(JSON.stringify(errors));
  }

  // Step 2: get the current user's id to set as owner of this animal.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be logged in to add animals.');

  // Step 3: insert the new row.
  const { data, error } = await supabase
    .from('animals')
    .insert([{
      ...animalData,         // spread all form fields
      user_id: user.id,      // explicitly set the owner
    }])
    .select()   // ask Supabase to return the inserted row (with generated id)
    .single();  // we inserted one row, so .single() gives us one object back

  if (error) throw error;
  return data; // the saved animal, including its new UUID
}


// ── updateAnimal ──────────────────────────────────────────────────────────────
// Overwrites the fields of an existing animal.
//
// @param id         — UUID of the animal to update
// @param animalData — object with the fields to change (e.g. { name: 'New Name', age_years: 2 })
// Returns: the updated animal object.
export async function updateAnimal(id, animalData) {
  const errors = validateAnimalData(animalData);
  if (errors) {
    throw new Error(JSON.stringify(errors));
  }

  const { data, error } = await supabase
    .from('animals')
    .update(animalData)   // only the fields passed here are changed
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}


// ── deleteAnimal ──────────────────────────────────────────────────────────────
// Permanently removes an animal record.
//
// @param id — UUID of the animal to delete
// Returns: nothing (void).
export async function deleteAnimal(id) {
  const { error } = await supabase
    .from('animals')
    .delete()
    .eq('id', id);  // RLS prevents deleting another user's animal

  if (error) throw error;
  // No return value — the row is gone, there is nothing to return.
}
