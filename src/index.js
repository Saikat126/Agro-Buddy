// ─── Entry Point ─────────────────────────────────────────────────────────────
import React from 'react';                      // Core React library (needed for JSX)
import ReactDOM from 'react-dom/client';        // ReactDOM lets React talk to the browser DOM
import './App.css';                             // Global stylesheet applied to the whole app
import App from './App';                        // Our top-level App component

// ReactDOM.createRoot() creates a React root on the <div id="root"> in index.html.
// This is the React 18 way of rendering (replaces ReactDOM.render from React 17).
const root = ReactDOM.createRoot(document.getElementById('root'));

// root.render() kicks off React's rendering process.
// <React.StrictMode> wraps the app to surface potential problems during development
// (it intentionally double-invokes functions to detect side-effects).
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
