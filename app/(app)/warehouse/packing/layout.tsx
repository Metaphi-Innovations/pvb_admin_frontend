"use client";

import { PackingListingStateProvider } from "./packing-listing-state-context";

/**
 * Keeps Sales / Sample / Stock Transfer / Purchase Return packing listing
 * filters (including Ready / Packing Done) in memory for the whole
 * warehouse/packing route tree (list ↔ create/view/edit).
 * State clears when the user leaves this module.
 */
export default function PackingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PackingListingStateProvider>{children}</PackingListingStateProvider>
  );
}
