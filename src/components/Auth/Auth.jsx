// ─── Auth.jsx — Sign In / Sign Up Screen ─────────────────────────────────────
// A full-page authentication screen shown when no user is logged in.
// Toggles between "Sign In" and "Sign Up" forms on the same card.
// On success it calls onAuthSuccess(user) so App.jsx can store the user and
// reveal the main application.

import React, { useState } from 'react';
import './Auth.css';
import { login, signup } from './AuthAPI';

// Logo from public folder — same reference used in the Navbar
const logo = process.env.PUBLIC_URL + '/logo.png';

// ── Component ──────────────────────────────────────────────────────────────────
// @prop onAuthSuccess — function called by App.jsx; receives the user object
//                       so the parent can store it and hide this screen.
export default function Auth({ onAuthSuccess }) {

  // mode — controls which form is visible: 'signin' or 'signup'
  const [mode, setMode] = useState('signin');

  // fields — all form input values in one object
  const [fields, setFields] = useState({
    name:            '',   
    email:           '',
    password:        '',
    confirmPassword: '',   
  });

  // error — validation or API error message shown below the form
  const [error, setError] = useState('');

  // loading — true while the API request is in flight; disables the button
  const [loading, setLoading] = useState(false);

  // ── switchMode ────────────────────────────────────────────────────────────
  // Clears all fields and errors when toggling between Sign In and Sign Up.
  function switchMode(newMode) {
    setMode(newMode);
    setFields({ name: '', email: '', password: '', confirmPassword: '' });
    setError('');
  }

  // ── handleChange ──────────────────────────────────────────────────────────
  // Single handler for all inputs — updates only the field that changed.
  function handleChange(e) {
    const { name, value } = e.target;
    setError('');   // clear error as soon as the user starts correcting input
    setFields((prev) => ({ ...prev, [name]: value }));
  }

  // ── validate ──────────────────────────────────────────────────────────────
  // Runs client-side checks before touching the API.
  // Returns an error string, or '' if everything is valid.
  function validate() {
    if (mode === 'signup' && !fields.name.trim()) {
      return 'Please enter your full name.';
    }
    if (!fields.email.trim()) {
      return 'Please enter your email address.';
    }
    // Basic email format check using a simple regex
    if (!/\S+@\S+\.\S+/.test(fields.email)) {
      return 'Please enter a valid email address.';
    }
    if (fields.password.length < 6) {
      return 'Password must be at least 6 characters.';
    }
    if (mode === 'signup' && fields.password !== fields.confirmPassword) {
      return 'Passwords do not match.';
    }
    return '';   // no errors
  }

  // ── handleSubmit ──────────────────────────────────────────────────────────
  // Validates, calls the correct API function, and notifies the parent on success.
  async function handleSubmit(e) {
    e.preventDefault();   // prevent browser page reload

    // Run client-side validation first — don't hit the server with bad data
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      setError('');

      let result;
      if (mode === 'signin') {
        // login() returns { token, user }
        result = await login(fields.email, fields.password);
      } else {
        // signup() returns { token, user }
        result = await signup(fields.name, fields.email, fields.password);
      }

      // Store the JWT token in localStorage so it survives page refreshes.
      // Future API calls can read this and attach it as an Authorization header.
      localStorage.setItem('agro_token', result.token);

      // Store the user object as a JSON string so App.jsx can read it back.
      localStorage.setItem('agro_user', JSON.stringify(result.user));

      // Tell App.jsx who just logged in — it will hide this screen and show the app.
      onAuthSuccess(result.user);

    } catch (err) {
      // Show the server's error message if available, otherwise a generic fallback
      setError(
        err.response?.data?.message ||
        (mode === 'signin'
          ? 'Invalid email or password.'
          : 'Could not create account. Try a different email.')
      );
    } finally {
      setLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    // auth-page fills the full viewport with a soft background
    <div className="auth-page">

      {/* Centred auth card */}
      <div className="auth-card">

        {/* ── Logo + app name ── */}
        <div className="auth-brand">
          <img src={logo} alt="Agro Buddy" className="auth-logo" />
          <h1 className="auth-app-name">Agro Buddy</h1>
          <p className="auth-tagline">Your smart farm management companion</p>
        </div>

        {/* ── Mode toggle tabs (Sign In / Sign Up) ── */}
        <div className="auth-tabs">
          {/* Each tab button highlights when its mode is active */}
          <button
            className={`auth-tab ${mode === 'signin' ? 'active' : ''}`}
            onClick={() => switchMode('signin')}
            type="button"    // type="button" prevents accidental form submission
          >
            Sign In
          </button>
          <button
            className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => switchMode('signup')}
            type="button"
          >
            Sign Up
          </button>
        </div>

        {/* ── Form ── */}
        <form className="auth-form" onSubmit={handleSubmit}>

          {/* Name field — only shown in Sign Up mode */}
          {mode === 'signup' && (
            <label className="auth-label">
              Full Name
              <input
                className="input-field"
                type="text"
                name="name"
                value={fields.name}
                onChange={handleChange}
                placeholder="e.g. Ahmed Rahman"
                autoComplete="name"
              />
            </label>
          )}

          {/* Email — shown in both modes */}
          <label className="auth-label">
            Email Address
            <input
              className="input-field"
              type="email"
              name="email"
              value={fields.email}
              onChange={handleChange}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          {/* Password — shown in both modes */}
          <label className="auth-label">
            Password
            <input
              className="input-field"
              type="password"       // type="password" hides characters as the user types
              name="password"
              value={fields.password}
              onChange={handleChange}
              placeholder="Minimum 6 characters"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />
          </label>

          {/* Confirm Password — only shown in Sign Up mode */}
          {mode === 'signup' && (
            <label className="auth-label">
              Confirm Password
              <input
                className="input-field"
                type="password"
                name="confirmPassword"
                value={fields.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter your password"
                autoComplete="new-password"
              />
            </label>
          )}

          {/* Error message — only visible when error state is non-empty */}
          {error && <p className="auth-error">{error}</p>}

          {/* Submit button — disabled while the API call is pending */}
          <button
            type="submit"
            className="btn-primary auth-submit"
            disabled={loading}   // disabling prevents double-submissions
          >
            {/* Label changes while loading so the user knows something is happening */}
            {loading
              ? (mode === 'signin' ? 'Signing in...' : 'Creating account...')
              : (mode === 'signin' ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        {/* ── Switch mode link at the bottom ── */}
        <p className="auth-switch">
          {mode === 'signin'
            ? "Don't have an account? "
            : 'Already have an account? '}
          <button
            className="auth-switch-btn"
            onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
            type="button"
          >
            {mode === 'signin' ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  );
}
