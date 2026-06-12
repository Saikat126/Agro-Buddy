// ─── useConfirm.js — Reusable Promise-based confirmation hook ─────────────────
// Instead of using window.confirm() (which blocks the browser thread and can't
// be styled), this hook renders our own ConfirmDialog component and returns a
// Promise that resolves to true (user clicked "Delete") or false (user cancelled).
//
// How it works:
//   1. The caller does:  const { confirm, dialog } = useConfirm();
//   2. It places {dialog} somewhere in JSX — this is where the modal renders.
//   3. When deletion is needed:  if (!await confirm('Delete this?')) return;
//   4. useConfirm opens the modal and suspends execution until the user responds.
//   5. On confirm → resolves true; on cancel → resolves false.

import { useState } from 'react';
import React from 'react';
import ConfirmDialog from './ConfirmDialog';

export function useConfirm() {
  // state — tracks whether the dialog is open, the message to show, and the
  // Promise resolve function so the dialog buttons can settle the pending promise.
  const [state, setState] = useState({ open: false, message: '', resolve: null });

  // confirm — called by the component that wants user confirmation.
  // Returns a Promise that will resolve to true or false depending on which
  // button the user clicks.
  function confirm(message) {
    return new Promise((resolve) => {
      // Store the resolve callback in state so handleConfirm/handleCancel can call it.
      // The dialog stays open until one of those functions is called.
      setState({ open: true, message, resolve });
    });
  }

  // handleConfirm — called when the user clicks "Delete".
  // Resolves the promise with true so the caller's await receives true and proceeds.
  function handleConfirm() {
    state.resolve(true);
    // Close the dialog and clear state so it's ready for the next use.
    setState({ open: false, message: '', resolve: null });
  }

  // handleCancel — called when the user clicks "Cancel" or the overlay.
  // Resolves the promise with false so the caller's await receives false and aborts.
  function handleCancel() {
    state.resolve(false);
    setState({ open: false, message: '', resolve: null });
  }

  // dialog — the actual JSX element to drop into the component's render.
  // It's null when the dialog is closed so nothing extra appears in the DOM.
  // React.createElement is used directly (instead of JSX) because this is a .js file.
  const dialog = state.open
    ? React.createElement(ConfirmDialog, {
        message:   state.message,
        onConfirm: handleConfirm,
        onCancel:  handleCancel,
      })
    : null;

  // Return both the trigger function and the renderable dialog element.
  return { confirm, dialog };
}
