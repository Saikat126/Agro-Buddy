// ─── supabaseClient.js — The single shared Supabase connection ────────────────

import { createClient } from '@supabase/supabase-js';

// process.env.REACT_APP_* variables are injected at build time by Create React App.
// They come from the .env file at the project root.
// If either value is missing, createClient will throw a clear error immediately.
const supabaseUrl  = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey  = process.env.REACT_APP_SUPABASE_ANON_KEY;

// createClient() establishes the connection.
// The anon key is public — it's safe in browser code.
// Row Level Security (RLS) in the database enforces what each user can access.
export const supabase = createClient(supabaseUrl, supabaseKey);
