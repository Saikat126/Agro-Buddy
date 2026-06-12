// ─── TaskListAPI.js — All CRUD operations for the tasks table ─────────────────

import { supabase } from '../../supabase/supabaseClient';


// ── normalizeTask ─────────────────────────────────────────────────────────────
// Converts a raw database row (snake_case) to a camelCase object that React
// components can use directly.
//
// @param row — a raw row returned by Supabase (snake_case keys)
// @returns   — a new object with camelCase keys
export function normalizeTask(row) {
  return {
    id:          row.id,
    userId:      row.user_id,
    title:       row.title,
    dueDate:     row.due_date,
    priority:    row.priority,
    completed:   row.completed,
    isRepeating: row.is_repeating ?? false,
    animalId:    row.animal_id,
    notes:       row.notes,
    createdAt:   row.created_at,
  };
}


// ── validateTaskData ──────────────────────────────────────────────────────────
// Client-side validation before any INSERT or UPDATE.
//
// @param data — task fields from the form (can use either camelCase or snake_case)
// @returns    — errors object ({ title?: string, dueDate?: string }) or null
export function validateTaskData(data) {
  const errors = {};

  // Title is the only required field — everything else is optional.
  if (!data.title || !data.title.trim()) {
    errors.title = 'Task title is required.';
  }

  // If a due date is provided, make sure it is a real date.
  if (data.dueDate || data.due_date) {
    const raw = data.dueDate || data.due_date;
    if (isNaN(Date.parse(raw))) {
      // Date.parse returns NaN for strings that can't be parsed as dates.
      errors.dueDate = 'Due date must be a valid date (YYYY-MM-DD).';
    }
  }

  // Priority must be one of the three allowed values if provided.
  // .toLowerCase() lets the UI pass 'High' / 'Medium' / 'Low' without errors.
  const allowed = ['low', 'medium', 'high'];
  if (data.priority && !allowed.includes(data.priority.toLowerCase())) {
    errors.priority = `Priority must be 'low', 'medium', or 'high'.`;
  }

  return Object.keys(errors).length > 0 ? errors : null;
}


// ── fetchTasks ────────────────────────────────────────────────────────────────
// Retrieves all tasks for the current user, sorted by due date ascending
// (earliest deadline first, so overdue tasks appear at the top).
//
// Returns: array of normalised task objects (camelCase).
export async function fetchTasks() {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    // nulls last: tasks without a due date go to the bottom of the list
    .order('due_date', { ascending: true, nullsFirst: false });

  if (error) throw error;

  // Map every raw row through normalizeTask() to convert to camelCase.
  return data.map(normalizeTask);
}


// ── fetchTasksByCompletion ────────────────────────────────────────────────────
// Retrieves only complete or only incomplete tasks.
// Useful for a "To-Do" vs "Done" toggle in the UI.
//
// @param completed — true = fetch completed tasks, false = fetch pending tasks
// Returns: array of normalised task objects.
export async function fetchTasksByCompletion(completed) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('completed', completed)   // WHERE completed = true/false
    .order('due_date', { ascending: true, nullsFirst: false });

  if (error) throw error;
  return data.map(normalizeTask);
}


// ── createTask ────────────────────────────────────────────────────────────────
// Inserts a new task row.
//
// @param taskData — { title, dueDate?, priority?, animalId?, notes? }
//   Note: the component passes camelCase; we convert to snake_case before
//   sending to Supabase (the database columns are snake_case).
//
// Returns: the newly created, normalised task object.
export async function createTask(taskData) {
  const errors = validateTaskData(taskData);
  if (errors) throw new Error(JSON.stringify(errors));

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be logged in to create tasks.');

  // Convert camelCase input fields to snake_case for the database.
  const { data, error } = await supabase
    .from('tasks')
    .insert([{
      user_id:      user.id,
      title:        taskData.title.trim(),
      due_date:     taskData.dueDate    || taskData.due_date  || null,
      priority:     (taskData.priority  || 'medium').toLowerCase(),
      completed:    false,
      is_repeating: taskData.isRepeating ?? false,
      animal_id:    taskData.animalId   || taskData.animal_id || null,
      notes:        taskData.notes      || null,
    }])
    .select()
    .single();

  if (error) throw error;
  return normalizeTask(data); 
}


// ── toggleTaskComplete ────────────────────────────────────────────────────────
// Flips the `completed` boolean for a single task.
//
// @param id        — UUID of the task
// @param completed — the NEW value to save (true = done, false = not done)
// Returns: the updated, normalised task object.
export async function toggleTaskComplete(id, completed) {
  const { data, error } = await supabase
    .from('tasks')
    .update({ completed })    
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return normalizeTask(data);
}


// ── updateTask ────────────────────────────────────────────────────────────────
// Updates any fields of an existing task (full edit).
//
// @param id       — UUID of the task to update
// @param taskData — updated fields (camelCase accepted)
//
// Returns: the updated, normalised task object.
export async function updateTask(id, taskData) {
  const errors = validateTaskData(taskData);
  if (errors) throw new Error(JSON.stringify(errors));

  const { data, error } = await supabase
    .from('tasks')
    .update({
      title:     taskData.title?.trim(),
      due_date:  taskData.dueDate  || taskData.due_date  || null,
      priority:  taskData.priority?.toLowerCase(),
      animal_id: taskData.animalId || taskData.animal_id || null,
      notes:     taskData.notes    || null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return normalizeTask(data);
}


// ── deleteTask ────────────────────────────────────────────────────────────────
// Permanently removes a task.
//
// @param id — UUID of the task to delete
// Returns: nothing (void).
export async function deleteTask(id) {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
