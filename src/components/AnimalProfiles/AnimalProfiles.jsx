// ─── AnimalProfiles.jsx — Feature: Animal Profiles ───────────────────────────
// Displays a list of farm animals. Users can add a new animal via a form,
// view existing profiles in cards, and delete animals they no longer need.
//
// State lives here. API calls are delegated to AnimalProfilesAPI.js.
// Styling lives in AnimalProfiles.css.

import React, { useState, useEffect } from 'react';   // useState for local state; useEffect for side effects
import './AnimalProfiles.css';                         // Component-scoped styles
import { fetchAnimals, createAnimal, deleteAnimal } from './AnimalProfilesAPI'; // API layer
import { useConfirm } from '../shared/useConfirm';

// ── Component ─────────────────────────────────────────────────────────────────
export default function AnimalProfiles({ autoAdd, onClearAutoAdd }) {

  // animals — the array of animal objects loaded from the server.
  // Starts as an empty array so the page renders immediately (no null checks needed).
  const { confirm, dialog } = useConfirm();
  const [animals, setAnimals] = useState([]);

  // loading — true while we are waiting for the API to respond.
  // Used to show a spinner or "Loading…" message instead of an empty list.
  const [loading, setLoading] = useState(true);

  // error — stores an error message string if the API call fails, otherwise null.
  const [error, setError] = useState(null);

  // showForm — controls whether the "Add Animal" form is visible.
  // Defaults to false so the form is hidden until the user clicks the button.
  const [showForm, setShowForm] = useState(false);

  // Auto-open the add form when navigated here via the dashboard "+" button.
  useEffect(() => {
    if (autoAdd) {
      setShowForm(true);
      onClearAutoAdd?.();
    }
  }, [autoAdd]);

  // formData — a single state object that mirrors every input field in the form.
  // Grouping all fields into one object (instead of individual useState calls)
  // keeps the code compact and easy to reset.
  const [formData, setFormData] = useState({
    name: '',        // Animal's name (e.g., "Bessie")
    species: '',     // Species (e.g., "Cow", "Sheep")
    age_years: '',   // Must match the database column name
    weight_kg: '',   // Must match the database column name
    notes: '',       // Free-text notes about the animal
  });

  // ── useEffect: load animals on mount ───────────────────────────────────────
  // useEffect with an empty dependency array [] runs exactly once:
  // after the component first appears on screen (similar to componentDidMount).
  // This is where we fetch the initial list of animals from the server.
  useEffect(() => {
    loadAnimals();   // Defined below — calls the API and updates state
  }, []);            // [] means "run this effect only on the first render"

  // ── loadAnimals ─────────────────────────────────────────────────────────────
  // Async function that fetches the animals list and stores it in state.
  // Also handles the loading flag and any errors.
  async function loadAnimals() {
    try {
      setLoading(true);              // Show spinner while request is in flight
      setError(null);                // Clear any previous error message

      const data = await fetchAnimals();  // Await the API call from AnimalProfilesAPI.js
      setAnimals(data);              // Store the returned array in state → triggers re-render
    } catch (err) {
      // If the API call throws (network error, server error, etc.), catch it here.
      // Store a human-readable message in state so we can display it to the user.
      setError('Failed to load animals. Please check your connection.');
      console.error('fetchAnimals error:', err);  // Also log full error for debugging
    } finally {
      // finally runs whether the try succeeded or the catch ran.
      // Always turn off the loading spinner when the request is done.
      setLoading(false);
    }
  }

  // ── handleInputChange ───────────────────────────────────────────────────────
  // Called every time the user types in any form input.
  // e.target.name is the input's name attribute; e.target.value is what the user typed.
  // The spread { ...formData } copies all existing fields, then [name]: value
  // overwrites just the field that changed — a common React controlled-input pattern.
  function handleInputChange(e) {
    const { name, value } = e.target;           // Destructure name and value from the event
    setFormData((prev) => ({                    // Use functional update to avoid stale closures
      ...prev,                                  // Keep all existing field values
      [name]: value,                            // Override only the field that changed
    }));
  }

  // ── handleAddAnimal ─────────────────────────────────────────────────────────
  // Called when the user submits the "Add Animal" form.
  // Validates inputs, sends data to the API, and refreshes the list on success.
  async function handleAddAnimal(e) {
    e.preventDefault();   // Prevent the browser from reloading the page on form submit

    // Basic validation: name and species are required fields.
    if (!formData.name.trim() || !formData.species.trim()) {
      alert('Please enter at least a name and species.');
      return;             // Stop here — don't call the API with incomplete data
    }

    try {
      // Send formData to the server. createAnimal() returns the saved animal with its new id.
      await createAnimal(formData);

      // After a successful save, reload the full list so our UI matches the database.
      await loadAnimals();

      // Reset the form fields back to empty strings for the next entry.
      setFormData({ name: '', species: '', age_years: '', weight_kg: '', notes: '' });

      // Hide the form after a successful submission.
      setShowForm(false);
    } catch (err) {
      setError('Failed to add animal. Please try again.');
      console.error('createAnimal error:', err);
    }
  }

  // ── handleDelete ────────────────────────────────────────────────────────────
  // Called when the user clicks "Delete" on an animal card.
  // @param id — the unique id of the animal to remove.
  async function handleDelete(id) {
    // Confirm before deleting — deletion is irreversible.
    if (!await confirm('Delete this animal profile?')) return;

    try {
      await deleteAnimal(id);   // Tell the API to remove the record
      // Remove the deleted animal from local state without re-fetching.
      // filter() returns a new array that excludes the deleted animal.
      setAnimals((prev) => prev.filter((animal) => animal.id !== id));
    } catch (err) {
      setError('Failed to delete animal.');
      console.error('deleteAnimal error:', err);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="animal-profiles">
      {dialog}

      {/* Page header row: title on left, "Add Animal" button on right */}
      <div className="ap-header">
        <h2 className="section-title">Animal Profiles</h2>
        {/* Toggle the form visibility when the button is clicked */}
        <button
          className="btn-primary"
          onClick={() => {
            if (showForm) {
              // Cancelling — reset form fields before hiding
              setFormData({ name: '', species: '', age_years: '', weight_kg: '', notes: '' });
            }
            setShowForm((prev) => !prev);
          }}
        >
          {showForm ? 'Cancel' : '+ Add Animal'}
        </button>
      </div>

      {/* ── Add Animal Form ── (only visible when showForm === true) */}
      {showForm && (
        // onSubmit triggers handleAddAnimal; the form element groups all inputs logically
        <form className="ap-form card" onSubmit={handleAddAnimal}>
          <h3 className="ap-form-title">New Animal Profile</h3>

          {/* Each label/input pair: label describes the field; input collects the value */}
          <label className="ap-label">
            Name *
            <input
              className="input-field"
              type="text"
              name="name"           // Must match the key in formData
              value={formData.name} // Controlled: React sets the displayed value
              onChange={handleInputChange}  // Update state on every keystroke
              placeholder="e.g. Bessie"
            />
          </label>

          <label className="ap-label">
            Species *
            <input
              className="input-field"
              type="text"
              name="species"
              value={formData.species}
              onChange={handleInputChange}
              placeholder="e.g. Cow, Sheep, Goat"
            />
          </label>

          {/* Two fields side by side using CSS grid (see AnimalProfiles.css) */}
          <div className="ap-row">
            <label className="ap-label">
              Age (years)
              <input
                className="input-field"
                type="number"
                name="age_years"
                value={formData.age_years}
                onChange={handleInputChange}
                min="0"       // Prevent negative numbers in browsers that enforce min
                placeholder="e.g. 3"
              />
            </label>

            <label className="ap-label">
              Weight (kg)
              <input
                className="input-field"
                type="number"
                name="weight_kg"
                value={formData.weight_kg}
                onChange={handleInputChange}
                min="0"
                placeholder="e.g. 450"
              />
            </label>
          </div>

          <label className="ap-label">
            Notes
            {/* <textarea> for multi-line free-text notes */}
            <textarea
              className="input-field"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              placeholder="Health notes, vaccinations, etc."
            />
          </label>

          {/* Submit button — triggers the form's onSubmit handler */}
          <button type="submit" className="btn-primary">Save Animal</button>
        </form>
      )}

      {/* ── Status Messages ── */}
      {/* Show a spinner/message while the API request is pending */}
      {loading && <p className="ap-loading">Loading animals...</p>}

      {/* Show the error message if the API call failed */}
      {error && <p className="ap-error">{error}</p>}

      {/* Show this message only when loading is done and the list is empty */}
      {!loading && !error && animals.length === 0 && (
        <p className="ap-empty">No animals yet. Add your first one above!</p>
      )}

      {/* ── Animal Cards Grid ── */}
      {/* Render one card per animal; only shown when we have data */}
      <div className="ap-grid">
        {animals.map((animal) => (
          // key={animal.id} lets React efficiently update only changed cards
          <div key={animal.id} className="ap-card card">
            {/* Animal name as the card heading */}
            <h3 className="ap-card-name">{animal.name}</h3>

            {/* Species displayed as a small colored badge */}
            <span className="ap-badge">{animal.species}</span>

            {/* Animal details list */}
            <ul className="ap-details">
              {/* Only render age/weight rows if the value exists (not empty string) */}
              {animal.age_years  && <li>Age: <strong>{animal.age_years} yr</strong></li>}
              {animal.weight_kg  && <li>Weight: <strong>{animal.weight_kg} kg</strong></li>}
              {animal.notes  && <li>Notes: <em>{animal.notes}</em></li>}
            </ul>

            {/* Delete button passes this animal's id to handleDelete */}
            <button
              className="btn-danger"
              onClick={() => handleDelete(animal.id)}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
