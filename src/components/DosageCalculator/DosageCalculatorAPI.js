// ─── DosageCalculatorAPI.js — Persist and retrieve dosage records ─────────────

import { supabase } from '../../supabase/supabaseClient';


// ── computeEndDate ────────────────────────────────────────────────────────────
// Calculates the last day of a treatment course given a start date and duration.
//
// @param startDate    — ISO date string: 'YYYY-MM-DD'
// @param durationDays — integer number of days the treatment lasts
//
// Returns: ISO date string for the end date (e.g., '2026-06-11')
//
// Why do this in JS rather than SQL?
//   We want to preview the end date in the UI before saving, so the component
//   can display it in real-time while the user fills out the form.
export function computeEndDate(startDate, durationDays) {
  // Parse the start date string into a Date object.
  const start = new Date(startDate);

  // setDate() mutates the Date in place. We set the day to (current day + durationDays).
  // JavaScript's Date handles month/year rollovers automatically.
  // e.g., June 4 + 30 days → July 4, no manual month math needed.
  start.setDate(start.getDate() + Number(durationDays));

  // toISOString() returns a full ISO timestamp like '2026-06-11T00:00:00.000Z'.
  // .split('T')[0] extracts just the date part: '2026-06-11'.
  return start.toISOString().split('T')[0];
}


// ── validateDosageRecord ──────────────────────────────────────────────────────
// Validates all fields that will be written to the dosage_records table.
//
// @param record — the full dosage record object (pre-INSERT)
// @returns      — errors object or null
export function validateDosageRecord(record) {
  const errors = {};

  // ── animal_name ───────────────────────────────────────────────────────────
  if (!record.animal_name || !record.animal_name.trim()) {
    errors.animal_name = 'Animal name is required.';
  }

  // ── medication ────────────────────────────────────────────────────────────
  if (!record.medication || !record.medication.trim()) {
    errors.medication = 'Medication name is required.';
  }

  // ── weight_kg ─────────────────────────────────────────────────────────────
  if (!record.weight_kg || Number(record.weight_kg) <= 0) {
    errors.weight_kg = 'Animal weight must be greater than zero.';
  }

  // ── dose_per_kg ───────────────────────────────────────────────────────────
  if (!record.dose_per_kg || Number(record.dose_per_kg) <= 0) {
    errors.dose_per_kg = 'Dose per kg must be greater than zero.';
  }

  // ── concentration ─────────────────────────────────────────────────────────
  if (!record.concentration || Number(record.concentration) <= 0) {
    errors.concentration = 'Concentration must be greater than zero.';
  }

  // ── frequency_days ────────────────────────────────────────────────────────
  if (!record.frequency_days || Number(record.frequency_days) < 1) {
    errors.frequency_days = 'Frequency must be at least 1 day.';
  }

  // ── duration_days ─────────────────────────────────────────────────────────
  if (!record.duration_days || Number(record.duration_days) < 1) {
    errors.duration_days = 'Duration must be at least 1 day.';
  }

  // ── start_date ────────────────────────────────────────────────────────────
  if (!record.start_date || isNaN(Date.parse(record.start_date))) {
    errors.start_date = 'A valid start date is required.';
  }

  return Object.keys(errors).length > 0 ? errors : null;
}


// ── saveDosageRecord ──────────────────────────────────────────────────────────
// Persists a completed dosage calculation to the database.
//
// @param record — object with ALL of these fields:
//   animal_name, animal_id?, medication, weight_kg, dose_per_kg, concentration,
//   total_mg, total_ml, frequency_days, duration_days, start_date, notes?
//
// Returns: the newly saved dosage record (with generated id and end_date).
export async function saveDosageRecord(record) {
  // Step 1: validate.
  const errors = validateDosageRecord(record);
  if (errors) throw new Error(JSON.stringify(errors));

  // Step 2: get current user.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be logged in to save dosage records.');

  // Step 3: compute the end date from start + duration.
  const endDate = computeEndDate(record.start_date, record.duration_days);

  // Step 4: insert the record.
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
  return data; // the saved record, including its id and computed end_date
}


// ── fetchDosageRecords ────────────────────────────────────────────────────────
// Retrieves all dosage history for the current user, newest first.
//
// Returns: array of dosage record objects.
export async function fetchDosageRecords() {
  const { data, error } = await supabase
    .from('dosage_records')
    .select('*')
    .order('created_at', { ascending: false }); // most recent first

  if (error) throw error;
  return data;
}


// ── fetchDosageRecordsByAnimal ────────────────────────────────────────────────
// Retrieves dosage history for a specific animal.
// Useful when viewing an animal's health history.
//
// @param animalId — UUID of the animal
// Returns: array of dosage records for that animal.
export async function fetchDosageRecordsByAnimal(animalId) {
  const { data, error } = await supabase
    .from('dosage_records')
    .select('*')
    .eq('animal_id', animalId)
    .order('start_date', { ascending: false });

  if (error) throw error;
  return data;
}


// ── fetchActiveTreatments ─────────────────────────────────────────────────────
// Retrieves dosage records where the treatment is still ongoing.
// "Active" means: start_date <= today AND end_date >= today.
//
// Returns: array of active dosage records.
export async function fetchActiveTreatments() {
  // Get today's date as an ISO string (YYYY-MM-DD).
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('dosage_records')
    .select('*')
    .lte('start_date', today)  // treatment started on or before today
    .gte('end_date',   today)  // treatment ends on or after today
    .order('end_date', { ascending: true }); // soonest to end first

  if (error) throw error;
  return data;
}


// ── deleteDosageRecord ────────────────────────────────────────────────────────
// Permanently deletes a dosage record.
//
// @param id — UUID of the record to delete
// Returns: nothing (void).
export async function deleteDosageRecord(id) {
  const { error } = await supabase
    .from('dosage_records')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
