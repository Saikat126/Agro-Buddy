import { supabase } from '../../supabase/supabaseClient';


// Mirrors the CHECK constraint in the database migration.
// Export so the UI can build the type dropdown from the same list.
export const EVENT_TYPES = ['vet', 'harvest', 'market', 'medication', 'other'];


// Validates an event before insert or update.
// event_date is required because you can't put an event on a calendar without a date.
export function validateEventData(data) {
  const errors = {};

  if (!data.title || !data.title.trim()) {
    errors.title = 'Event title is required.';
  }

  if (!data.event_date) {
    errors.event_date = 'Event date is required.';
  } else if (isNaN(Date.parse(data.event_date))) {
    errors.event_date = 'Event date must be a valid date (YYYY-MM-DD).';
  }

  if (data.event_type && !EVENT_TYPES.includes(data.event_type)) {
    errors.event_type = `Event type must be one of: ${EVENT_TYPES.join(', ')}.`;
  }

  return Object.keys(errors).length > 0 ? errors : null;
}


// Fetches all events for the current user, sorted by date ascending
// so the closest upcoming events appear first.
export async function fetchEvents() {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .order('event_date', { ascending: true });

  if (error) throw error;
  return data;
}


// Fetches events for a specific month. Useful if you want to lazy-load
// one month at a time instead of pulling everything upfront.
export async function fetchEventsByMonth(year, month) {
  const mm = String(month).padStart(2, '0');
  const startDate = `${year}-${mm}-01`;

  // new Date(year, month, 0) gives the last day of the *previous* month,
  // which happens to be the last day of the month we actually want
  const lastDay = new Date(year, month, 0).getDate();
  const endDate  = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .gte('event_date', startDate)
    .lte('event_date', endDate)
    .order('event_date', { ascending: true });

  if (error) throw error;
  return data;
}


// Fetches only events of a given type — e.g., show only vet visits.
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


// Saves a new event. completed defaults to false — the user can mark it done later.
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


// Edits an existing event's details.
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


// Marks an event done (or un-marks it). Useful for tracking "vet visit completed", etc.
export async function markEventComplete(id, completed) {
  const { data, error } = await supabase
    .from('calendar_events')
    .update({ completed })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}


// Permanently deletes a single event.
export async function deleteEvent(id) {
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', id);

  if (error) throw error;
}


// Deletes all events whose date has already passed.
// Called automatically on calendar load so stale events don't pile up.
// RLS ensures users can only delete their own events even though this runs for everyone.
export async function deletePastEvents() {
  const today = new Date().toISOString().split('T')[0];

  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .lt('event_date', today); // strictly less than today — today's events stay

  if (error) throw error;
}
