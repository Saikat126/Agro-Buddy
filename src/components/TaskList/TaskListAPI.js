import { supabase } from '../../supabase/supabaseClient';


// The database uses snake_case column names; React components prefer camelCase.
// This function converts one raw DB row into the shape the UI expects.
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


// Title is the only field that's truly required — everything else is optional.
// Returns an errors object, or null when everything's fine.
export function validateTaskData(data) {
  const errors = {};

  if (!data.title || !data.title.trim()) {
    errors.title = 'Task title is required.';
  }

  // Only check the date if the user actually filled it in
  if (data.dueDate || data.due_date) {
    const raw = data.dueDate || data.due_date;
    if (isNaN(Date.parse(raw))) {
      errors.dueDate = 'Due date must be a valid date (YYYY-MM-DD).';
    }
  }

  // toLowerCase lets the form pass 'High' and we still match 'high'
  const allowed = ['low', 'medium', 'high'];
  if (data.priority && !allowed.includes(data.priority.toLowerCase())) {
    errors.priority = `Priority must be 'low', 'medium', or 'high'.`;
  }

  return Object.keys(errors).length > 0 ? errors : null;
}


// Fetches all tasks for the current user sorted by due date, earliest first.
// Tasks without a due date float to the bottom (nullsFirst: false).
export async function fetchTasks() {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('due_date', { ascending: true, nullsFirst: false });

  if (error) throw error;
  return data.map(normalizeTask);
}


// Convenience fetch for when you only want pending or completed tasks.
export async function fetchTasksByCompletion(completed) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('completed', completed)
    .order('due_date', { ascending: true, nullsFirst: false });

  if (error) throw error;
  return data.map(normalizeTask);
}


// Creates a new task. The component passes camelCase fields; we convert them
// to snake_case before inserting because that's what the database columns are named.
export async function createTask(taskData) {
  const errors = validateTaskData(taskData);
  if (errors) throw new Error(JSON.stringify(errors));

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be logged in to create tasks.');

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


// Flips the completed state for a single task.
// The component sends the *new* value (not "toggle"), which avoids race conditions
// if the user clicks really fast.
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


// Full update — replaces all editable fields of an existing task.
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


// Permanently deletes a task. There's no soft-delete here — it's gone.
export async function deleteTask(id) {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
