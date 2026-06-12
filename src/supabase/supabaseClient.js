import { createClient } from '@supabase/supabase-js';

// These come from the .env file at the project root.
// The anon key is safe to expose in the browser — it's not a secret.
// What actually keeps data safe is Row Level Security on the database side.
const supabaseUrl  = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey  = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
