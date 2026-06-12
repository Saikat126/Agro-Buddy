// ─── DosageCalculatorLogic.js — Pure calculation functions ───────────────────
// All dosage math lives here, completely separated from the React component.
// Pure functions (no side effects, no state) are easy to unit test and reuse.

// ── calculateDosage ───────────────────────────────────────────────────────────
// Calculates the total medication dose to administer to an animal.
//
// Formula:  total dose (ml) = (weightKg × dosePerKg) / concentration
//
// @param weightKg      — animal's body weight in kilograms (number)
// @param dosePerKg     — prescribed dose per kg of body weight (mg/kg) (number)
// @param concentration — medication concentration in mg per ml (number)
// Example: weight=450, dosePerKg=5, concentration=50 → 45 ml
export function calculateDosage(weightKg, dosePerKg, concentration) {
  // Guard: all inputs must be positive numbers
  if (weightKg <= 0 || dosePerKg <= 0 || concentration <= 0) {
    return { totalMg: 0, totalMl: 0, warning: 'All values must be greater than zero.' };
  }

  // Step 1: total milligrams = weight × dose rate
  const totalMg = weightKg * dosePerKg;

  // Step 2: convert mg to ml using the concentration (mg/ml)
  const totalMl = totalMg / concentration;

  // Step 3: generate a safety warning for unusually large volumes
  // A single injection site should not typically exceed 10 ml in livestock
  let warning = null;
  if (totalMl > 50) {
    warning = `Large volume (${totalMl.toFixed(2)} ml). Consider splitting into multiple sites.`;
  }

  return {
    totalMg: parseFloat(totalMg.toFixed(4)),  
    totalMl: parseFloat(totalMl.toFixed(4)),
    warning,
  };
}

// ── doseSchedule ──────────────────────────────────────────────────────────────
// Generates a list of administration dates based on frequency and duration.
//
// @param startDate     — JavaScript Date object for the first dose
// @param frequencyDays — how many days between doses (e.g., 1 = daily, 7 = weekly)
// @param durationDays  — total number of days the treatment lasts
//
// Returns: an array of Date objects representing each dosing day.
//
// Example: start=today, frequency=2, duration=10 → [day0, day2, day4, day6, day8, day10]
export function doseSchedule(startDate, frequencyDays, durationDays) {
  const schedule = [];
  let currentDate = new Date(startDate);   // Clone so we don't mutate the input

  // Loop from day 0 to durationDays, stepping by frequencyDays each iteration
  for (let day = 0; day <= durationDays; day += frequencyDays) {
    // Create a new Date for this dose day
    const doseDate = new Date(currentDate);
    doseDate.setDate(doseDate.getDate() + day);   // Advance by `day` days from the start
    schedule.push(doseDate);
  }

  return schedule;
}

// ── formatDoseDate ────────────────────────────────────────────────────────────
// Converts a Date object to a readable string like "Mon, 14 May 2026".
// @param date — a JavaScript Date object
export function formatDoseDate(date) {
  // toLocaleDateString uses the browser's locale for day/month names
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',  // "Mon"
    day:     'numeric',
    month:   'long',
    year:    'numeric',
  });
}
