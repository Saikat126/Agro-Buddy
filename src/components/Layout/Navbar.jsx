import React, { useState, useEffect, useRef } from 'react';
import './Navbar.css';
import { signIn, signUp, requestPasswordReset } from '../Auth/AuthAPI';

const logo = process.env.PUBLIC_URL + '/logo.png';

export default function Navbar({ tabs, activeTab, onTabChange, user, onLogin, onLogout, cartCount = 0, onCartClick }) {

  const [showPanel, setShowPanel] = useState(false);
  const [mode,      setMode]      = useState('signin'); // 'signin' | 'signup' | 'forgot'
  const [fields,    setFields]    = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');
  const [loading,   setLoading]   = useState(false);

  // We attach this ref to the dropdown container so we can detect clicks outside it
  const panelRef = useRef(null);

  // Add a mousedown listener when the panel opens, clean it up when it closes.
  // This is the standard "click outside to close" pattern for dropdowns.
  useEffect(() => {
    function handleOutsideClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setFields({ name: '', email: '', password: '', confirmPassword: '' });
        setError('');
        setSuccess('');
        setMode('signin');
        setShowPanel(false);
      }
    }
    if (showPanel) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showPanel]);

  function switchMode(newMode) {
    setMode(newMode);
    setFields({ name: '', email: '', password: '', confirmPassword: '' });
    setError('');
    setSuccess('');
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setError('');
    setFields((prev) => ({ ...prev, [name]: value }));
  }

  function validate() {
    if (mode === 'signup' && !fields.name.trim())
      return 'Please enter your full name.';
    if (!fields.email.trim())
      return 'Please enter your email address.';
    if (!/\S+@\S+\.\S+/.test(fields.email))
      return 'Please enter a valid email.';
    if (fields.password.length < 6)
      return 'Password must be at least 6 characters.';
    if (mode === 'signup' && fields.password !== fields.confirmPassword)
      return 'Passwords do not match.';
    return '';
  }

  async function handleForgot(e) {
    e.preventDefault();
    if (!fields.email.trim() || !/\S+@\S+\.\S+/.test(fields.email)) {
      setError('Please enter a valid email address.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await requestPasswordReset(fields.email);
      setSuccess('Reset link sent! Check your inbox.');
    } catch (err) {
      setError('Could not send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    try {
      setLoading(true);
      setError('');

      // Supabase stores the session in localStorage automatically — no need to do it ourselves
      const { user: authUser } = mode === 'signin'
        ? await signIn(fields.email, fields.password)
        : await signUp(fields.email, fields.password, fields.name);

      // Strip down to just the fields the UI actually needs
      const displayUser = {
        id:    authUser.id,
        email: authUser.email,
        name:  authUser.user_metadata?.full_name || authUser.email,
      };

      onLogin(displayUser); // notify App.jsx so user state updates everywhere

      setShowPanel(false);
      setFields({ name: '', email: '', password: '', confirmPassword: '' });

    } catch (err) {
      setError(
        err.message ||
        (mode === 'signin' ? 'Invalid email or password.' : 'Could not create account.')
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <nav className="navbar">

      <div className="navbar-brand">
        <img src={logo} alt="Agro Buddy" className="navbar-logo-img" />
        <span className="navbar-title">Agro Buddy</span>
      </div>

      <ul className="navbar-tabs">
        {tabs.map((tab) => (
          <li key={tab.id}>
            <button
              className={`navbar-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
            </button>
          </li>
        ))}
      </ul>

      {/* Cart button — always visible so guests can see it, though they can't buy anything */}
      <button
        className="navbar-cart-btn"
        onClick={() => onTabChange('checkout')}
        title="View cart"
      >
        🛒
        {/* Badge only appears when there's actually something in the cart */}
        {cartCount > 0 && (
          <span className="navbar-cart-badge">{cartCount}</span>
        )}
      </button>

      {/* Auth section — panelRef wraps both the button and the dropdown so outside
          clicks are detected relative to the whole thing, not just the button */}
      <div className="navbar-auth-wrap" ref={panelRef}>

        {user ? (
          <div className="navbar-user">
            {/* First letter of the user's name as a simple avatar */}
            <div className="navbar-avatar">
              {user.name ? user.name.charAt(0).toUpperCase() : '?'}
            </div>
            <span className="navbar-user-name">{user.name}</span>
            <button className="navbar-signout" onClick={onLogout}>
              Sign Out
            </button>
          </div>
        ) : (
          <button
            className="navbar-signin-btn"
            onClick={() => {
              // Always reset the form on open/close so previous state doesn't linger
              setFields({ name: '', email: '', password: '', confirmPassword: '' });
              setError('');
              setMode('signin');
              setShowPanel((p) => !p);
            }}
          >
            Sign In
          </button>
        )}

        {showPanel && !user && (
          <div className="nav-auth-panel">

            <p className="nap-heading">
              {mode === 'forgot' ? 'Reset Password' : 'Welcome to Agro Buddy'}
            </p>

            {/* Tabs — hidden in forgot mode */}
            {mode !== 'forgot' && (
              <div className="nap-tabs">
                <button type="button" className={`nap-tab ${mode === 'signin' ? 'active' : ''}`} onClick={() => switchMode('signin')}>Sign In</button>
                <button type="button" className={`nap-tab ${mode === 'signup' ? 'active' : ''}`} onClick={() => switchMode('signup')}>Sign Up</button>
              </div>
            )}

            {/* ── Sign in / Sign up form ── */}
            {mode !== 'forgot' && (
              <form className="nap-form" onSubmit={handleSubmit}>
                {mode === 'signup' && (
                  <input className="input-field nap-input" type="text" name="name" value={fields.name} onChange={handleChange} placeholder="Full Name" autoComplete="name" />
                )}
                <input className="input-field nap-input" type="email" name="email" value={fields.email} onChange={handleChange} placeholder="Email Address" autoComplete="email" />
                <input className="input-field nap-input" type="password" name="password" value={fields.password} onChange={handleChange} placeholder="Password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} />
                {mode === 'signup' && (
                  <input className="input-field nap-input" type="password" name="confirmPassword" value={fields.confirmPassword} onChange={handleChange} placeholder="Confirm Password" autoComplete="new-password" />
                )}

                {/* Forgot password link — sign-in only */}
                {mode === 'signin' && (
                  <button type="button" className="nap-forgot-link" onClick={() => switchMode('forgot')}>
                    Forgot password?
                  </button>
                )}

                {error && <p className="nap-error">{error}</p>}

                <button type="submit" className="btn-primary nap-submit" disabled={loading}>
                  {loading ? '…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
                </button>
              </form>
            )}

            {/* ── Forgot password form ── */}
            {mode === 'forgot' && (
              <form className="nap-form" onSubmit={handleForgot}>
                <p className="nap-forgot-sub">Enter your email and we'll send you a reset link.</p>
                <input className="input-field nap-input" type="email" name="email" value={fields.email} onChange={handleChange} placeholder="Email Address" autoComplete="email" />
                {error   && <p className="nap-error">{error}</p>}
                {success && <p className="nap-success">{success}</p>}
                {!success && (
                  <button type="submit" className="btn-primary nap-submit" disabled={loading}>
                    {loading ? '…' : 'Send Reset Link'}
                  </button>
                )}
              </form>
            )}

            <p className="nap-switch">
              {mode === 'forgot' ? (
                <button type="button" className="nap-switch-btn" onClick={() => switchMode('signin')}>← Back to Sign In</button>
              ) : (
                <>
                  {mode === 'signin' ? 'No account? ' : 'Have an account? '}
                  <button type="button" className="nap-switch-btn" onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}>
                    {mode === 'signin' ? 'Sign Up' : 'Sign In'}
                  </button>
                </>
              )}
            </p>
          </div>
        )}
      </div>
    </nav>
  );
}
