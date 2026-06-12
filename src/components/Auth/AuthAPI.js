// ─── AuthAPI.js — Sign Up, Sign In, Sign Out via Supabase Auth ────────────────

import { supabase } from '../../supabase/supabaseClient';


// ── validateAuthInputs ────────────────────────────────────────────────────────
// Validates email and password on the client BEFORE sending them to Supabase.
// Client-side validation gives instant feedback without a network round-trip.
//
// @param email    — string entered in the email field
// @param password — string entered in the password field
// @returns        — an errors object ({ email?: string, password?: string })
//                   Returns null if everything is valid.
export function validateAuthInputs(email, password) {
  const errors = {};

  // ── Email check ───────────────────────────────────────────────────────────
  if (!email || !email.trim()) {
    // Empty string or whitespace only — reject immediately.
    errors.email = 'Email is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    // Regex breakdown:
    //   ^[^\s@]+   — one or more chars that are NOT space or @  (the local part)
    //   @          — the @ symbol
    //   [^\s@]+    — one or more chars that are NOT space or @  (domain name)
    //   \.         — a literal dot
    //   [^\s@]+$   — one or more chars that are NOT space or @  (TLD)
    // This catches the most obvious invalid emails without being overly strict.
    errors.email = 'Please enter a valid email address.';
  }

  // ── Password check ────────────────────────────────────────────────────────
  if (!password) {
    errors.password = 'Password is required.';
  } else if (password.length < 6) {
    // Supabase enforces a minimum of 6 characters by default.
    // We mirror that rule here so the user sees the error before the API call.
    errors.password = 'Password must be at least 6 characters.';
  }

  // Return null when there are no errors (cleaner than returning an empty object).
  return Object.keys(errors).length > 0 ? errors : null;
}


// ── signUp ────────────────────────────────────────────────────────────────────
// Registers a new user account.
//
// @param email    — unique email address (used to log in)
// @param password — chosen password (Supabase hashes it; we never store it)
// @param fullName — display name stored in user metadata
//
// Returns: { user, session }
//   user    — the new auth.users row (id, email, created_at, user_metadata)
//   session — null until the user confirms their email (if confirmation is on)
//
// Throws: if the email is already registered or inputs are invalid.
export async function signUp(email, password, fullName) {
  // Run client-side validation first to catch obvious errors cheaply.
  const errors = validateAuthInputs(email, password);
  if (errors) {
    // Convert the errors object to a single readable string and throw.
    const message = Object.values(errors).join(' ');
    throw new Error(message);
  }

  const { data, error } = await supabase.auth.signUp({
    email:    email.trim(),
    password: password,
    options: {
      // user_metadata is stored alongside the user in Supabase's auth.users table.
      // You can read it with supabase.auth.getUser() → user.user_metadata.full_name
      data: { full_name: fullName?.trim() || '' },
    },
  });

  // Supabase returns errors in the `error` field rather than throwing.
  // We re-throw them so callers can use a single try/catch pattern.
  if (error) throw error;

  return data; // { user, session }
}


// ── signIn ────────────────────────────────────────────────────────────────────
// Authenticates an existing user with email + password.
//
// @param email    — registered email address
// @param password — the user's password
//
// Returns: { user, session }
//   session.access_token  — the JWT for this session
//   session.refresh_token — used to silently refresh the access token
// Throws: if the email/password combination is wrong or the account doesn't exist.
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


// ── signOut ───────────────────────────────────────────────────────────────────
// Ends the current session.
// Returns: nothing (void).
// Throws:  only on network failure (very rare).
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}


// ── getCurrentUser ────────────────────────────────────────────────────────────
// Returns the currently authenticated user object, or null if not logged in.
//
// Use this on app startup to restore the session (e.g., in App.jsx useEffect).
//
// Returns: user object ({ id, email, user_metadata }) or null.
export async function getCurrentUser() {
  // getUser() verifies the token with the Supabase server (more secure than
  // getSession() which only reads localStorage).
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user; // null when no one is logged in
}


// ── onAuthStateChange ─────────────────────────────────────────────────────────
// Subscribes to auth state changes (sign in, sign out, token refresh).
//
// @param callback — function(event, session) called whenever auth state changes
//   event   — 'SIGNED_IN', 'SIGNED_OUT', 'TOKEN_REFRESHED', etc.
//   session — the new session object, or null after sign-out
//
// Returns: an object with an `unsubscribe()` method — call it in useEffect
//          cleanup to prevent memory leaks.
export function onAuthStateChange(callback) {
  // supabase.auth.onAuthStateChange returns { data: { subscription } }
  return supabase.auth.onAuthStateChange(callback);
}
