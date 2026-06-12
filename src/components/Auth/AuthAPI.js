import { supabase } from '../../supabase/supabaseClient';


// Quick email/password check before we bother hitting the network.
// Returns an object like { email: '...', password: '...' } with whatever failed,
// or null if everything looks fine.
export function validateAuthInputs(email, password) {
  const errors = {};

  if (!email || !email.trim()) {
    errors.email = 'Email is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    // Not trying to be RFC-perfect here — just catch the obvious typos
    errors.email = 'Please enter a valid email address.';
  }

  if (!password) {
    errors.password = 'Password is required.';
  } else if (password.length < 6) {
    // Supabase enforces 6 chars minimum so we mirror that here
    // to give instant feedback instead of a round-trip error
    errors.password = 'Password must be at least 6 characters.';
  }

  return Object.keys(errors).length > 0 ? errors : null;
}


// Creates a new user account. fullName gets stored in user_metadata
// so we can show it in the navbar without a separate database lookup.
export async function signUp(email, password, fullName) {
  const errors = validateAuthInputs(email, password);
  if (errors) {
    throw new Error(Object.values(errors).join(' '));
  }

  const { data, error } = await supabase.auth.signUp({
    email:    email.trim(),
    password: password,
    options: {
      data: { full_name: fullName?.trim() || '' },
    },
  });

  if (error) throw error;
  return data; // { user, session }
}


// Signs in an existing user. Supabase handles the token and stores it in
// localStorage automatically — we don't need to touch it ourselves.
export async function signIn(email, password) {
  const errors = validateAuthInputs(email, password);
  if (errors) {
    throw new Error(Object.values(errors).join(' '));
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email:    email.trim(),
    password: password,
  });

  if (error) throw error;
  return data; // { user, session }
}


// Clears the session. Supabase wipes the localStorage token automatically.
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}


// Used on app startup to check if there's already a valid session
// (e.g., the user refreshed the page). getUser() validates with the server
// rather than just reading localStorage, so it catches expired tokens.
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user; // null when nobody is logged in
}


// Subscribe to auth events — sign in, sign out, token refresh, etc.
// The returned subscription.unsubscribe() should be called in useEffect cleanup
// to avoid memory leaks when the component unmounts.
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(callback);
}


// Sends a password-reset email. Supabase emails the user a link that redirects
// back to the app with a recovery token — the SDK fires PASSWORD_RECOVERY when it lands.
export async function requestPasswordReset(email) {
  if (!email || !email.trim()) throw new Error('Email is required.');
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: window.location.origin,
  });
  if (error) throw error;
}


// Updates the current user's password. Only valid during a PASSWORD_RECOVERY session.
export async function updatePassword(newPassword) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Your reset link has expired. Please request a new password reset email.');
  }
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}
