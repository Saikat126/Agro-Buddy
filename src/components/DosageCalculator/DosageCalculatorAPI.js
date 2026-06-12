import { supabase } from '../../supabase/supabaseClient';


// Works out the last day of the treatment from the start date + duration.
// We do this in JS (rather than letting the DB compute it) so the UI can
// show the end date in real-time while the user is still filling out the form.
export function computeEndDate(startDate, durationDays) {
  const start = new Date(startDate);
  start.setDate(start.getDate() + Number(durationDays)); // JS handles month rollover
  return start.toISOString().split('T')[0]; // strip the time part → 'YYYY-MM-DD'
}


// Validates every field before we touch the database.
// All numeric fields must be positive; start_date must be a real date.
export function validateDosageRecord(record) {
  const errors = {};

  if (!record.animal_name || !record.animal_name.trim()) {
    errors.animal_name = 'Animal name is required.';
  }

  if (!record.medication || !record.medication.trim()) {
    errors.medication = 'Medication name is required.';
  }

  if (!record.weight_kg || Number(record.weight_kg) <= 0) {
    errors.weight_kg = 'Animal weight must be greater than zero.';
  }

  if (!record.dose_per_kg || Number(record.dose_per_kg) <= 0) {
    errors.dose_per_kg = 'Dose per kg must be greater than zero.';
  }

  if (!record.concentration || Number(record.concentration) <= 0) {
    errors.concentration = 'Concentration must be greater than zero.';
  }

  if (!record.frequency_days || Number(record.frequency_days) < 1) {
    errors.frequency_days = 'Frequency must be at least 1 day.';
  }

  if (!record.duration_days || Number(record.duration_days) < 1) {
    errors.duration_days = 'Duration must be at least 1 day.';
  }

  if (!record.start_date || isNaN(Date.parse(record.start_date))) {
    errors.start_date = 'A valid start date is required.';
  }

  return Object.keys(errors).length > 0 ? errors : null;
}


// Saves a completed dosage calculation to the database.
// The end_date is computed here and stored so we can show it in the history
// without having to recalculate it every time.
export async function saveDosageRecord(record) {
  const errors = validateDosageRecord(record);
  if (errors) throw new Error(JSON.stringify(errors));

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be logged in to save dosage records.');

  const endDate = computeEndDate(record.start_date, record.duration_days);

  const { data, error } = await supabase
    .from('dosage_records')
    .insert([{
      user_id:        user.id,
      animal_id:      record.animal_id      || null,
      animal_name:    record.animal_name.trim(),
      medication:     record.medication.trim(),
      weight_kg:      Number(record.weight_kg),
      dose_per_kg:    Number(record.dose_per_kg),
      concentration:  Number(record.concentration),
      total_mg:       Number(record.total_mg),
      total_ml:       Number(record.total_ml),
      frequency_days: Number(record.frequency_days),
      duration_days:  Number(record.duration_days),
      start_date:     record.start_date,
      end_date:       endDate,
      notes:          record.notes || null,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}


// Fetches all saved records for the current user, newest first.
export async function fetchDosageRecords() {
  const { data, error } = await supabase
    .from('dosage_records')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}


// Fetches records for a specific animal — useful for a per-animal health history view.
export async function fetchDosageRecordsByAnimal(animalId) {
  const { data, error } = await supabase
    .from('dosage_records')
    .select('*')
    .eq('animal_id', animalId)
    .order('start_date', { ascending: false });

  if (error) throw error;
  return data;
}


// Fetches records where the treatment is still ongoing today
// (start_date <= today AND end_date >= today).
export async function fetchActiveTreatments() {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('dosage_records')
    .select('*')
    .lte('start_date', today)
    .gte('end_date',   today)
    .order('end_date', { ascending: true }); // soonest to end first

  if (error) throw error;
  return data;
}


// Permanently deletes a dosage record. No soft-delete here.
export async function deleteDosageRecord(id) {
  const { error } = await supabase
    .from('dosage_records')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
