// ─── Home.jsx — Landing Page & Personal Dashboard ────────────────────────────
// For signed-out visitors:  Hero banner + Features grid + CTA banner.
// For signed-in users:      All of the above PLUS a live dashboard that pulls
//                           tasks, animals, and upcoming calendar events.
//
// Data is fetched from three separate API modules (TaskListAPI, AnimalProfilesAPI,
// CalendarAPI) in a single Promise.all() call so all three requests run at the
// same time instead of one after the other.

import React, { useState, useEffect } from 'react';
import './Home.css';
import { fetchTasks }   from '../TaskList/TaskListAPI';
import { fetchAnimals } from '../AnimalProfiles/AnimalProfilesAPI';
import { fetchEvents }  from '../Calendar/CalendarAPI';

// FEATURES — static array that drives the "Features at Your Fingertips" grid.
// Each entry maps to one clickable feature card. id matches the tab id in App.jsx,
// so clicking a card calls onTabChange(id) to navigate to that feature.
const FEATURES = [
  { id: 'animals',  emoji: '🐄', photo: 'animals.jpeg', color: '#16a34a', grad: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', label: 'Animal Profiles',   desc: 'Track health, weight, and history for every animal on your farm.' },
  { id: 'tasks',    emoji: '✅', photo: 'tasks.jpeg',    color: '#2563eb', grad: 'linear-gradient(135deg,#eff6ff,#dbeafe)', label: 'Task List',          desc: 'Organise daily farm work with priorities, due dates, and repeating tasks.' },
  { id: 'market',   emoji: '🛒', photo: 'market.jpeg',   color: '#d97706', grad: 'linear-gradient(135deg,#fffbeb,#fef3c7)', label: 'Marketplace',        desc: 'Buy and sell livestock, crops, and equipment within your farming community.' },
  { id: 'dosage',   emoji: '💊', photo: 'dosage.jpeg',   color: '#7c3aed', grad: 'linear-gradient(135deg,#faf5ff,#ede9fe)', label: 'Dosage Calculator',  desc: 'Calculate precise medication doses and generate treatment schedules.' },
  { id: 'calendar', emoji: '📅', photo: 'calendar.jpeg', color: '#0891b2', grad: 'linear-gradient(135deg,#f0f9ff,#e0f2fe)', label: 'Farm Calendar',      desc: 'Schedule vet visits, harvests, and every important farm event.' },
  { id: 'vets',     emoji: '🩺', photo: 'vets.jpeg',     color: '#be185d', grad: 'linear-gradient(135deg,#fdf2f8,#fce7f3)', label: 'Vet Finder',         desc: 'Find and connect with nearby veterinarians for your animals.' },
];

// PRIORITY_COLORS — maps priority strings to hex colors for the colored task dots.
const PRIORITY_COLORS = { high: '#be123c', medium: '#b45309', low: '#15803d' };

// user       — the signed-in user object (null when logged out)
// onTabChange — function from App.jsx to navigate to another tab
export default function Home({ user, onTabChange }) {

  // tasks, animals, events — dashboard data loaded from the server.
  // They start as empty arrays so the page renders immediately without errors.
  const [tasks,        setTasks]        = useState([]);
  const [animals,      setAnimals]      = useState([]);
  const [events,       setEvents]       = useState([]);

  // dashLoading — true while the three API calls are in-flight.
  // Shows a "Loading…" message instead of empty panels.
  const [dashLoading,  setDashLoading]  = useState(false);

  // ── Load dashboard data when a user is present ───────────────────────────────
  // The dependency array [user] means this effect runs once on mount AND again
  // whenever the user value changes (e.g., after sign-in or sign-out).
  // If there is no user, we skip the API calls — the dashboard isn't shown anyway.
  useEffect(() => {
    if (!user) return;

    setDashLoading(true);

    // today in 'YYYY-MM-DD' format — used to filter out past calendar events
    const today = new Date().toISOString().split('T')[0];

    // Promise.all sends all three requests at the same time (parallel, not sequential).
    // We destructure the three results in the same order they were passed in.
    Promise.all([fetchTasks(), fetchAnimals(), fetchEvents()])
      .then(([t, a, ev]) => {
        // Only show incomplete tasks on the dashboard
        setTasks(t.filter((task) => !task.completed));
        // All registered animals (no filter needed)
        setAnimals(a);
        // Only future events that haven't been marked complete
        setEvents(ev.filter((e) => !e.completed && e.event_date >= today));
      })
      .catch(console.error)
      .finally(() => setDashLoading(false));
  }, [user]);

  // ── Preview slices — cap each panel at a few items to keep the dashboard tidy ──
  const activeTasks    = tasks.slice(0, 4);    // Show at most 4 upcoming tasks
  const animalPreview  = animals.slice(0, 6);  // Show at most 6 animal avatars
  const upcomingEvents = events.slice(0, 4);   // Show at most 4 calendar events

  return (
    <div className="home">

      {/* ── Hero Section ───────────────────────────────────────────────────────
          Full-width photo background with a gradient overlay to keep text readable.
          process.env.PUBLIC_URL resolves to the /public folder at build time.     */}
      <section
        className="home-hero"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.52) 100%), url(${process.env.PUBLIC_URL}/hero.jpeg)`,
          backgroundSize: '100% 100%, cover',
          backgroundPosition: 'center, center',
          backgroundRepeat: 'no-repeat, no-repeat',
        }}
      >
        <div className="home-hero-pattern" />

        <div className="home-hero-content">
          <span className="home-hero-eyebrow">Welcome to Agro Buddy</span>
          <h1 className="home-hero-title">Your Smart Farm,<br />Simplified.</h1>
          <p className="home-hero-sub">
            Manage animals, tasks, health records, marketplace and more —
            all in one place built for modern farmers.
          </p>

          {/* CTA buttons: signed-in users see feature shortcuts;
              guests see a note telling them to sign in */}
          {user ? (
            <div className="home-hero-cta">
              <button className="home-btn-primary" onClick={() => onTabChange('animals')}>
                View Animals
              </button>
              <button className="home-btn-primary" onClick={() => onTabChange('tasks')}>
                View Tasks
              </button>
            </div>
          ) : (
            <div className="home-hero-cta">
              <p className="home-hero-signin-note">
                Sign in using the button in the top-right to access your farm dashboard.
              </p>
            </div>
          )}
        </div>

        {/* ── Hero stat cards (signed-in users only) ──
            These live totals update every time the dashboard data loads.
            tasks.filter(t => !t.isRepeating) gives one-off tasks;
            tasks.filter(t => t.isRepeating) gives the recurring ones. */}
        {user && (
          <div className="home-hero-stats">
            <div className="home-stat-card">
              <span className="home-stat-num">{animals.length}</span>
              <span className="home-stat-label">Animals</span>
            </div>
            <div className="home-stat-card">
              <span className="home-stat-num">{tasks.filter(t => !t.isRepeating).length}</span>
              <span className="home-stat-label">Active Tasks</span>
            </div>
            <div className="home-stat-card">
              <span className="home-stat-num">{tasks.filter(t => t.isRepeating).length}</span>
              <span className="home-stat-label">Repeating</span>
            </div>
            <div className="home-stat-card">
              <span className="home-stat-num">{events.length}</span>
              <span className="home-stat-label">Events</span>
            </div>
          </div>
        )}

        {/* SVG wave — purely decorative, creates a smooth transition to the next section */}
        <div className="home-hero-wave">
          <svg viewBox="0 0 1440 60" preserveAspectRatio="none">
            <path d="M0,30 C360,60 1080,0 1440,30 L1440,60 L0,60 Z" fill="var(--color-bg)" />
          </svg>
        </div>
      </section>

      {/* ── Dashboard (logged-in users only) ───────────────────────────────────
          Three panels side-by-side: Tasks | Animals | Events.
          Each panel shows a preview and a "+" shortcut and "All →" link.
          The "+" button passes openAdd=true to onTabChange so the target
          component auto-opens its "Add" form when it mounts.               */}
      {user && (
        <section className="home-dashboard">
          <span className="home-section-eyebrow">Live Overview</span>
          <h2 className="home-section-title">Your Farm Dashboard</h2>

          {dashLoading ? (
            <p className="ap-loading">Loading your dashboard…</p>
          ) : (
            <div className="home-dash-grid">

              {/* ── Active Tasks Panel ── */}
              <div className="home-panel card home-panel--tasks">
                <div className="home-panel-header">
                  <span className="home-panel-icon">✅</span>
                  <div className="home-panel-info">
                    <h3 className="home-panel-title">Active Tasks</h3>
                    {/* tasks.length is the full count; activeTasks is capped at 4 for preview */}
                    <p className="home-panel-meta">{tasks.length} remaining</p>
                  </div>
                  <div className="home-panel-actions">
                    {/* "+" opens the Task List with its Add form already visible */}
                    <button className="home-panel-add-btn" onClick={() => onTabChange('tasks', true)} title="Add task">+</button>
                    <button className="home-panel-link" onClick={() => onTabChange('tasks')}>All →</button>
                  </div>
                </div>

                {activeTasks.length === 0
                  ? <p className="home-panel-empty">All clear! 🎉</p>
                  : (
                    <ul className="home-task-list">
                      {activeTasks.map((task) => (
                        <li key={task.id} className="home-task-row">
                          {/* Colored dot: color is driven by the task's priority level */}
                          <span className="home-task-dot" style={{ background: PRIORITY_COLORS[task.priority] || '#16a34a' }} />
                          <span className="home-task-title">{task.title}</span>
                          {/* ↻ badge for repeating tasks — they never get a "completed" state */}
                          {task.isRepeating && <span className="home-task-repeat">↻</span>}
                        </li>
                      ))}
                    </ul>
                  )
                }
              </div>

              {/* ── Animals Panel ── */}
              <div className="home-panel card home-panel--animals">
                <div className="home-panel-header">
                  <span className="home-panel-icon">🐄</span>
                  <div className="home-panel-info">
                    <h3 className="home-panel-title">Animals</h3>
                    <p className="home-panel-meta">{animals.length} registered</p>
                  </div>
                  <div className="home-panel-actions">
                    <button className="home-panel-add-btn" onClick={() => onTabChange('animals', true)} title="Add animal">+</button>
                    <button className="home-panel-link" onClick={() => onTabChange('animals')}>All →</button>
                  </div>
                </div>

                {animalPreview.length === 0
                  ? <p className="home-panel-empty">No animals yet!</p>
                  : (
                    <div className="home-animal-grid">
                      {animalPreview.map((animal) => (
                        <div key={animal.id} className="home-animal-card">
                          {/* Avatar circle: background color is generated from the animal's name
                              using stringToColor() so each animal always has the same color */}
                          <div className="home-animal-avatar" style={{ background: stringToColor(animal.name) }}>
                            {animal.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="home-animal-name">{animal.name}</span>
                        </div>
                      ))}
                    </div>
                  )
                }
              </div>

              {/* ── Upcoming Events Panel ── */}
              <div className="home-panel card home-panel--events">
                <div className="home-panel-header">
                  <span className="home-panel-icon">📅</span>
                  <div className="home-panel-info">
                    <h3 className="home-panel-title">Upcoming Events</h3>
                    <p className="home-panel-meta">{events.length} upcoming</p>
                  </div>
                  <div className="home-panel-actions">
                    <button className="home-panel-add-btn" onClick={() => onTabChange('calendar', true)} title="Add event">+</button>
                    <button className="home-panel-link" onClick={() => onTabChange('calendar')}>All →</button>
                  </div>
                </div>

                {upcomingEvents.length === 0
                  ? <p className="home-panel-empty">No events scheduled!</p>
                  : (
                    <ul className="home-event-list">
                      {upcomingEvents.map((event) => (
                        <li key={event.id} className="home-event-row">
                          <span className="home-task-title">{event.title}</span>
                          {/* Badge color comes from the event_type — driven by CSS class */}
                          <span className={`home-badge home-badge-event-${event.event_type}`}>
                            {event.event_type}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )
                }
              </div>

            </div>
          )}
        </section>
      )}

      {/* ── Features Grid ───────────────────────────────────────────────────────
          Static cards, one per feature. Clicking any card navigates to that tab.
          CSS custom properties (--card-color, --card-grad) let each card have
          its own brand color without separate CSS classes per card.          */}
      <section className="home-features">
        <div className="home-features-inner">
          <span className="home-section-eyebrow">Everything You Need</span>
          <h2 className="home-section-title home-features-title">Features at Your Fingertips</h2>
          <p className="home-section-sub">
            AgroBuddy brings together the tools every farmer needs to run a healthy,
            productive farm — from animal care to business.
          </p>
          <div className="home-feature-grid">
            {FEATURES.map((f) => (
              <div
                key={f.id}
                className="home-feature-card"
                // CSS variables injected inline so each card reads its own color/gradient
                style={{ '--card-color': f.color, '--card-grad': f.grad }}
                onClick={() => onTabChange(f.id)}
              >
                <div className={`home-feature-top${f.photo ? ' home-feature-top--img' : ''}`}>
                  {/* If a photo filename is defined, show the photo; otherwise the emoji */}
                  {f.photo
                    ? <img
                        src={`${process.env.PUBLIC_URL}/${f.photo}`}
                        alt={f.label}
                        className="home-feature-img"
                      />
                    : <span className="home-feature-emoji">{f.emoji}</span>
                  }
                </div>
                <div className="home-feature-body">
                  <h3 className="home-feature-label">{f.label}</h3>
                  <p className="home-feature-desc">{f.desc}</p>
                  <span className="home-feature-cta">Explore →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Team Credits ─────────────────────────────────────────────────────────
          Shows each team member's photo (or initials fallback if photo fails).
          onError hides the broken <img> and reveals the fallback <div> instead. */}
      <section className="home-credits">
        <span className="home-section-eyebrow">Created By</span>
        <h2 className="home-section-title">Meet the Team</h2>
        <div className="home-credits-grid">
          {[
            { name: 'Soykot Sikder',        initials: 'SS', color: '#16a34a', photo: 'soykot.jpeg'  },
            { name: 'Zubayer Ahmed',         initials: 'ZA', color: '#2563eb', photo: 'zubayer.jpeg' },
            { name: 'Md. Faiad Ahmed Sajid', initials: 'FS', color: '#d97706', photo: 'faiad.jpeg'   },
          ].map((member) => (
            <div key={member.name} className="home-credit-card card">
              <div className="home-credit-avatar-wrap" style={{ borderColor: member.color }}>
                <img
                  src={`${process.env.PUBLIC_URL}/${member.photo}`}
                  alt={member.name}
                  className="home-credit-photo"
                  onError={(e) => {
                    // If the photo fails to load, hide the <img> and show the initials div
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                {/* Fallback initials circle — hidden by default, shown only on photo error */}
                <div
                  className="home-credit-fallback"
                  style={{ background: member.color, display: 'none' }}
                >
                  {member.initials}
                </div>
              </div>
              <span className="home-credit-name">{member.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner — only shown to guests (not logged in) ───────────────────
          Encourages visitors to sign up. Hidden once the user is authenticated. */}
      {!user && (
        <section
          className="home-cta-banner"
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.48), rgba(0,0,0,0.48)), url(${process.env.PUBLIC_URL}/cta-bg.jpeg)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <h2 className="home-cta-title">Ready to manage your farm smarter?</h2>
          <p className="home-cta-sub">Sign in or create a free account to get started.</p>
          <p className="home-cta-hint">Use the Sign In button in the top-right corner.</p>
        </section>
      )}

    </div>
  );
}

// ── stringToColor ─────────────────────────────────────────────────────────────
// Converts a string (animal name) to a consistent hex color from a fixed palette.
// The same name always produces the same color — "Bessie" is always green, etc.
//
// How it works:
//   1. Hash the string: iterate each character and XOR its char-code into `hash`.
//      The `(hash << 5) - hash` is a fast multiplication by 31 — a common hash technique.
//   2. Pick a color: use Math.abs(hash) % colors.length as an index into the palette.
//
// @param str — the string to hash (defaults to '' if undefined)
function stringToColor(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ['#16a34a', '#2563eb', '#d97706', '#7c3aed', '#0891b2', '#be185d', '#b45309'];
  return colors[Math.abs(hash) % colors.length];
}
