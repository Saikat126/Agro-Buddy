// ─── CalendarAPI.js — All CRUD operations for calendar_events ────────────────

import { supabase } from '../../supabase/supabaseClient';


// ── EVENT_TYPES ───────────────────────────────────────────────────────────────
// Mirror of the CHECK constraint in 04_calendar_table.sql.
// Export this constant so the UI can build a type dropdown from it.
export const EVENT_TYPES = ['vet', 'harvest', 'market', 'medication', 'other'];


// ── validateEventData ─────────────────────────────────────────────────────────
// Client-side validation before INSERT or UPDATE.
//
// @param data — event fields from the form
// @returns    — errors object or null
export function validateEventData(data) {
  const errors = {};

  if (!data.title || !data.title.trim()) {
    errors.title = 'Event title is required.';
  }

  // event_date is required — you can't show an event on a calendar without a date.
  if (!data.event_date) {
    errors.event_date = 'Event date is required.';
  } else if (isNaN(Date.parse(data.event_date))) {
    // Date.parse('not-a-date') returns NaN — catch malformed date strings.
    errors.event_date = 'Event date must be a valid date (YYYY-MM-DD).';
  }

  // Validate event_type if provided.
  if (data.event_type && !EVENT_TYPES.includes(data.event_type)) {
    errors.event_type = `Event type must be one of: ${EVENT_TYPES.join(', ')}.`;
  }

  return Object.keys(errors).length > 0 ? errors : null;
}


// ── fetchEvents ───────────────────────────────────────────────────────────────
// Retrieves ALL events for the current user, sorted by date (soonest first)
// Returns: array of event objects.
export async function fetchEvents() {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .order('event_date', { ascending: true });

  if (error) throw error;
  return data;
}


// ── fetchEventsByMonth ────────────────────────────────────────────────────────
// Retrieves all events that fall within a specific calendar month.
//
// @param year  — 4-digit year (number), e.g. 2026
// @param month — 1-indexed month (number), e.g. 6 for June
// Returns: array of event objects in that month.
export async function fetchEventsByMonth(year, month) {
  // Pad the month to two digits: month=6 → '06'
  const mm = String(month).padStart(2, '0');

  // First day of the month: e.g. '2026-06-01'
  const startDate = `${year}-${mm}-01`;

  // Last day of the month: we use a trick — go to the 1st of NEXT month, then
  // subtract 1 day, to correctly handle months with 28/29/30/31 days.
  const lastDay = new Date(year, month, 0).getDate(); // month (not month-1) gives last day
  const endDate  = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .gte('event_date', startDate)  // event_date >= '2026-06-01'
    .lte('event_date', endDate)    // event_date <= '2026-06-30'
    .order('event_date', { ascending: true });

  if (error) throw error;
  return data;
}


// ── fetchEventsByType ─────────────────────────────────────────────────────────
// Retrieves events filtered by a specific type (e.g., show only vet visits).
//
// @param eventType — one of EVENT_TYPES: 'vet', 'harvest', 'market', etc.
// Returns: array of events of that type.
export async function fetchEventsByType(eventType) {
  if (!EVENT_TYPES.includes(eventType)) {
    throw new Error(`Invalid event type: "${eventType}". Must be one of: ${EVENT_TYPES.join(', ')}.`);
  }

  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('event_type', eventType)
    .order('event_date', { ascending: true });

  if (error) throw error;
  return data;
}


// ── createEvent ───────────────────────────────────────────────────────────────
// Saves a new calendar event.
//
// @param eventData — { title, event_date, event_type?, notes?, animal_id? }
// Returns: the newly created event object.
export async function createEvent(eventData) {
  const errors = validateEventData(eventData);
  if (errors) throw new Error(JSON.stringify(errors));

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be logged in to create events.');

  const { data, error } = await supabase
    .from('calendar_events')
    .insert([{
      user_id:    user.id,
      title:      eventData.title.trim(),
      event_date: eventData.event_date,
      event_type: eventData.event_type || 'other', 
      notes:      eventData.notes      || null,
      completed:  false,                             
      animal_id:  eventData.animal_id  || null,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}


// ── updateEvent ───────────────────────────────────────────────────────────────
// Edits the fields of an existing event.
//
// @param id        — UUID of the event to update
// @param eventData — updated fields
// Returns: the updated event object.
export async function updateEvent(id, eventData) {
  const errors = validateEventData(eventData);
  if (errors) throw new Error(JSON.stringify(errors));

  const { data, error } = await supabase
    .from('calendar_events')
    .update({
      title:      eventData.title?.trim(),
      event_date: eventData.event_date,
      event_type: eventData.event_type || 'other',
      notes:      eventData.notes      || null,
      animal_id:  eventData.animal_id  || null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}


// ── markEventComplete ─────────────────────────────────────────────────────────
// Marks an event as completed (or un-marks it).
// Useful for tracking "vet visit done", "harvest finished", etc.
//
// @param id        — UUID of the event
// @param completed — true = done, false = not done
// Returns: the updated event object.
export async function markEventComplete(id, completed) {
  const { data, error } = await supabase
    .from('calendar_events')
    .update({ completed })   // only this one column changes
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}


// ── deleteEvent ───────────────────────────────────────────────────────────────
// Permanently deletes a calendar event.
//
// @param id — UUID of the event to delete
// Returns: nothing (void).
export async function deleteEvent(id) {
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', id);

  if (error) throw error;
}


// ── deletePastEvents ──────────────────────────────────────────────────────────
// Deletes all events whose event_date is strictly before today.
// Called automatically on calendar load so stale events are purged from the DB.
// RLS ensures only the current user's own events are deleted.
//
// Returns: nothing (void).
export async function deletePastEvents() {
  const today = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'

  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .lt('event_date', today);

  if (error) throw error;
}
