import { supabase } from '../../supabase/supabaseClient';


// Validates before any insert or update. Only name and species are required;
// age and weight are optional but must make sense if the user bothered to fill them in.
// Returns an errors object, or null if everything checks out.
export function validateAnimalData(data) {
  const errors = {};

  if (!data.name || !data.name.trim()) {
    errors.name = 'Animal name is required.';
  }

  if (!data.species || !data.species.trim()) {
    errors.species = 'Species is required (e.g., Cattle, Goat, Chicken).';
  }

  // Only validate age if the user actually entered something
  if (data.age_years !== undefined && data.age_years !== null && data.age_years !== '') {
    const age = Number(data.age_years);
    if (isNaN(age) || age < 0) {
      errors.age_years = 'Age must be a positive number (e.g., 1.5 for 18 months).';
    }
  }

  // Same for weight — optional, but can't be zero or negative
  if (data.weight_kg !== undefined && data.weight_kg !== null && data.weight_kg !== '') {
    const weight = Number(data.weight_kg);
    if (isNaN(weight) || weight <= 0) {
      errors.weight_kg = 'Weight must be greater than zero.';
    }
  }

  return Object.keys(errors).length > 0 ? errors : null;
}


// Fetches all animals for the current user, newest first.
// RLS on the database makes sure users only ever see their own animals.
export async function fetchAnimals() {
  const { data, error } = await supabase
    .from('animals')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}


// Fetches a single animal by id — useful if you need a detail view
// without re-fetching the entire list.
export async function fetchAnimalById(id) {
  const { data, error } = await supabase
    .from('animals')
    .select('*')
    .eq('id', id)
    .single(); // throws if 0 or more than 1 row matches

  if (error) throw error;
  return data;
}


// Inserts a new animal. We attach the current user's id so RLS knows who owns it.
// Returns the saved row including the server-generated id.
export async function createAnimal(animalData) {
  const errors = validateAnimalData(animalData);
  if (errors) {
    throw new Error(JSON.stringify(errors));
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be logged in to add animals.');

  const { data, error } = await supabase
    .from('animals')
    .insert([{
      ...animalData,
      user_id: user.id,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}


// Updates an existing animal's fields. Only the fields passed in are changed.
export async function updateAnimal(id, animalData) {
  const errors = validateAnimalData(animalData);
  if (errors) {
    throw new Error(JSON.stringify(errors));
  }

  const { data, error } = await supabase
    .from('animals')
    .update(animalData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}


// Permanently deletes an animal. RLS prevents deleting another user's animal
// even if someone passes a foreign id.
export async function deleteAnimal(id) {
  const { error } = await supabase
    .from('animals')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
