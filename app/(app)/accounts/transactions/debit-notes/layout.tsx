"use client";

import { DebitNoteListingStateProvider } from "./debit-note-listing-state-context";

/**
 * Keeps Debit Note listing filters (Pending / All) in memory for this route tree
 * (list ↔ view/new/edit). State clears when the user leaves the module.
 */
export default function DebitNotesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DebitNoteListingStateProvider>{children}</DebitNoteListingStateProvider>
  );
}
