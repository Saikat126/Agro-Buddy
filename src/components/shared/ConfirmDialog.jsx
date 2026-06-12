// ─── ConfirmDialog.jsx — Reusable Modal Confirmation Dialog ───────────────────
// A small modal that asks the user to confirm a destructive action before it
// actually happens (e.g., deleting an animal, removing a listing).
//
// It is rendered by the useConfirm() hook — never placed directly in JSX by hand.
//
// Props:
//   message    — the specific thing being deleted, e.g. "Delete this animal profile?"
//   onConfirm  — called when the user clicks "Delete" → proceeds with the action
//   onCancel   — called when the user clicks "Cancel" or the dark overlay → aborts

import React from 'react';
import './ConfirmDialog.css';

export default function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    // confirm-overlay — full-screen dark backdrop.
    // Clicking it calls onCancel, so the user can dismiss by clicking outside the box.
    <div className="confirm-overlay" onClick={onCancel}>

      {/* confirm-dialog — the white card in the center.
          e.stopPropagation() prevents clicks INSIDE the card from bubbling up
          to the overlay and accidentally dismissing the dialog. */}
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>

        {/* Warning icon — visually signals "this is a destructive action" */}
        <div className="confirm-icon">⚠</div>

        {/* Fixed heading — always reads "Are you sure?" */}
        <p className="confirm-title">Are you sure?</p>

        {/* Dynamic message passed by the caller + a fixed reminder that it's permanent */}
        <p className="confirm-message">{message} This action cannot be undone.</p>

        {/* Two action buttons side by side */}
        <div className="confirm-actions">
          {/* Cancel — safe option, resolves the promise with false */}
          <button className="confirm-cancel" onClick={onCancel}>Cancel</button>

          {/* Delete — destructive option, resolves the promise with true */}
          <button className="confirm-delete" onClick={onConfirm}>Delete</button>
        </div>

      </div>
    </div>
  );
}
