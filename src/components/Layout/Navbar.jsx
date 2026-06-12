import React, { useState, useEffect, useRef } from 'react';
import './Navbar.css';
import { signIn, signUp, requestPasswordReset, updatePassword, uploadAvatar } from '../Auth/AuthAPI';

const logo = process.env.PUBLIC_URL + '/logo.png';

export default function Navbar({ tabs, activeTab, onTabChange, user, onLogin, onLogout, cartCount = 0 }) {

  // ── Sign-in panel ──────────────────────────────────────────────────────────
  const [showPanel, setShowPanel] = useState(false);
  const [mode,      setMode]      = useState('signin');
  const [fields,    setFields]    = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');
  const [loading,   setLoading]   = useState(false);

  // ── Profile panel ──────────────────────────────────────────────────────────
  const [showProfile,     setShowProfile]     = useState(false);
  const [profileView,     setProfileView]     = useState('main'); // 'main' | 'password'
  const [pwFields,        setPwFields]        = useState({ newPassword: '', confirmPassword: '' });
  const [profileError,    setProfileError]    = useState('');
  const [profileSuccess,  setProfileSuccess]  = useState('');
  const [profileLoading,  setProfileLoading]  = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const panelRef      = useRef(null);
  const profileRef    = useRef(null);
  const avatarInputRef = useRef(null);

  // Reset profile panel when user signs out so it doesn't reappear on next login
  useEffect(() => {
    if (!user) {
      setShowProfile(false);
      setProfileView('main');
      setPwFields({ newPassword: '', confirmPassword: '' });
      setProfileError('');
      setProfileSuccess('');
    }
  }, [user]);

  // Close sign-in panel on outside click
  useEffect(() => {
    function onOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setFields({ name: '', email: '', password: '', confirmPassword: '' });
        setError('');
        setSuccess('');
        setMode('signin');
        setShowPanel(false);
      }
    }
    if (showPanel) document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [showPanel]);

  // Close profile panel on outside click
  useEffect(() => {
    function onOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfile(false);
        setProfileView('main');
        setPwFields({ newPassword: '', confirmPassword: '' });
        setProfileError('');
        setProfileSuccess('');
      }
    }
    if (showProfile) document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [showProfile]);

  // ── Sign-in panel helpers ──────────────────────────────────────────────────
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
    if (mode === 'signup' && !fields.name.trim()) return 'Please enter your full name.';
    if (!fields.email.trim()) return 'Please enter your email address.';
    if (!/\S+@\S+\.\S+/.test(fields.email)) return 'Please enter a valid email.';
    if (fields.password.length < 6) return 'Password must be at least 6 characters.';
    if (mode === 'signup' && fields.password !== fields.confirmPassword) return 'Passwords do not match.';
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
      setError(err.message || 'Could not send reset email. Please try again.');
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
      const { user: authUser } = mode === 'signin'
        ? await signIn(fields.email, fields.password)
        : await signUp(fields.email, fields.password, fields.name);
      onLogin({
        id:        authUser.id,
        email:     authUser.email,
        name:      authUser.user_metadata?.full_name || authUser.email,
        avatarUrl: authUser.user_metadata?.avatar_url || null,
      });
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

  // ── Profile panel helpers ──────────────────────────────────────────────────
  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setProfileError('Please select an image file.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setProfileError('Image must be smaller than 2 MB.');
      return;
    }
    try {
      setAvatarUploading(true);
      setProfileError('');
      await uploadAvatar(user.id, file);
      setProfileSuccess('Photo updated!');
      setTimeout(() => setProfileSuccess(''), 3000);
    } catch (err) {
      setProfileError(err.message || 'Failed to upload photo.');
    } finally {
      setAvatarUploading(false);
      e.target.value = '';
    }
  }

  async function handlePasswordChange(e) {
    e.preventDefault();
    if (pwFields.newPassword.length < 6) { setProfileError('Password must be at least 6 characters.'); return; }
    if (pwFields.newPassword !== pwFields.confirmPassword) { setProfileError('Passwords do not match.'); return; }
    try {
      setProfileLoading(true);
      setProfileError('');
      await updatePassword(pwFields.newPassword);
      setProfileSuccess('Password updated!');
      setPwFields({ newPassword: '', confirmPassword: '' });
      setTimeout(() => { setProfileView('main'); setProfileSuccess(''); }, 2000);
    } catch (err) {
      setProfileError(err.message || 'Failed to update password.');
    } finally {
      setProfileLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
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

      <button className="navbar-cart-btn" onClick={() => onTabChange('checkout')} title="View cart">
        🛒
        {cartCount > 0 && <span className="navbar-cart-badge">{cartCount}</span>}
      </button>

      {/* ── Logged in: avatar button + profile dropdown ── */}
      {user ? (
        <div className="navbar-auth-wrap" ref={profileRef}>
          <button
            className="navbar-avatar-btn"
            onClick={() => setShowProfile((p) => !p)}
            aria-label="Open profile"
          >
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="avatar" className="navbar-avatar-img" />
            ) : (
              <div className="navbar-avatar">
                {user.name ? user.name.charAt(0).toUpperCase() : '?'}
              </div>
            )}
          </button>

          {showProfile && (
            <div className="nav-profile-panel">

              {/* Avatar upload */}
              <div className="npp-avatar-section">
                <button
                  className="npp-avatar-wrap"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  title="Change photo"
                  type="button"
                >
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="avatar" className="npp-avatar-img" />
                  ) : (
                    <div className="npp-avatar-letter">
                      {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                    </div>
                  )}
                  <div className="npp-avatar-overlay">
                    {avatarUploading ? (
                      <span className="npp-spinner" />
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                        <circle cx="12" cy="13" r="4"/>
                      </svg>
                    )}
                  </div>
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleAvatarUpload}
                />
              </div>

              {/* Main view */}
              {profileView === 'main' && (
                <>
                  <p className="npp-name">{user.name}</p>
                  <p className="npp-email">{user.email}</p>

                  {profileError   && <p className="npp-error">{profileError}</p>}
                  {profileSuccess && <p className="npp-success">{profileSuccess}</p>}

                  <div className="npp-divider" />

                  <button
                    className="npp-action-btn"
                    onClick={() => { setProfileView('password'); setProfileError(''); setProfileSuccess(''); }}
                  >
                    Change Password
                  </button>
                  <button className="npp-action-btn npp-signout" onClick={onLogout}>
                    Sign Out
                  </button>
                </>
              )}

              {/* Change password view */}
              {profileView === 'password' && (
                <form className="npp-pw-form" onSubmit={handlePasswordChange}>
                  <div className="npp-pw-header">
                    <button
                      type="button"
                      className="npp-back-btn"
                      onClick={() => { setProfileView('main'); setProfileError(''); setProfileSuccess(''); setPwFields({ newPassword: '', confirmPassword: '' }); }}
                    >
                      ← Back
                    </button>
                    <span className="npp-pw-title">Change Password</span>
                  </div>
                  <input
                    className="input-field npp-input"
                    type="password"
                    placeholder="New password"
                    value={pwFields.newPassword}
                    onChange={(e) => { setProfileError(''); setPwFields((p) => ({ ...p, newPassword: e.target.value })); }}
                    autoComplete="new-password"
                  />
                  <input
                    className="input-field npp-input"
                    type="password"
                    placeholder="Confirm new password"
                    value={pwFields.confirmPassword}
                    onChange={(e) => { setProfileError(''); setPwFields((p) => ({ ...p, confirmPassword: e.target.value })); }}
                    autoComplete="new-password"
                  />
                  {profileError   && <p className="npp-error">{profileError}</p>}
                  {profileSuccess && <p className="npp-success">{profileSuccess}</p>}
                  {!profileSuccess && (
                    <button type="submit" className="btn-primary npp-submit" disabled={profileLoading}>
                      {profileLoading ? 'Updating…' : 'Update Password'}
                    </button>
                  )}
                </form>
              )}

            </div>
          )}
        </div>
      ) : (
        /* ── Logged out: Sign In button + sign-in/up/forgot panel ── */
        <div className="navbar-auth-wrap" ref={panelRef}>
          <button
            className="navbar-signin-btn"
            onClick={() => {
              setFields({ name: '', email: '', password: '', confirmPassword: '' });
              setError('');
              setMode('signin');
              setShowPanel((p) => !p);
            }}
          >
            Sign In
          </button>

          {showPanel && (
            <div className="nav-auth-panel">
              <p className="nap-heading">
                {mode === 'forgot' ? 'Reset Password' : 'Welcome to Agro Buddy'}
              </p>

              {mode !== 'forgot' && (
                <div className="nap-tabs">
                  <button type="button" className={`nap-tab ${mode === 'signin' ? 'active' : ''}`} onClick={() => switchMode('signin')}>Sign In</button>
                  <button type="button" className={`nap-tab ${mode === 'signup' ? 'active' : ''}`} onClick={() => switchMode('signup')}>Sign Up</button>
                </div>
              )}

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
                  {mode === 'signin' && (
                    <button type="button" className="nap-forgot-link" onClick={() => switchMode('forgot')}>Forgot password?</button>
                  )}
                  {error && <p className="nap-error">{error}</p>}
                  <button type="submit" className="btn-primary nap-submit" disabled={loading}>
                    {loading ? '…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
                  </button>
                </form>
              )}

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
      )}
    </nav>
  );
}
