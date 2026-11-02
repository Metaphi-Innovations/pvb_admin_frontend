"use client";

import { CreditNoteListingStateProvider } from "./credit-note-listing-state-context";

/**
 * Keeps Credit Note listing filters (Pending / All) in memory for this route tree
 * (list ↔ view/new/edit). State clears when the user leaves the module.
 */
export default function CreditNotesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CreditNoteListingStateProvider>{children}</CreditNoteListingStateProvider>
  );
}
