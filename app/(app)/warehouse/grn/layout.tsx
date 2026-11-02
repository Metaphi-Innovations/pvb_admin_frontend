"use client";

import { GrnListingStateProvider } from "./grn-listing-state-context";

/**
 * Keeps Purchase / Stock Transfer / Sales Return / Sample Return listing filters
 * in memory for the whole warehouse/grn route tree (list ↔ detail/edit/create).
 * State clears when the user navigates away from this module.
 */
export default function GrnLayout({ children }: { children: React.ReactNode }) {
  return <GrnListingStateProvider>{children}</GrnListingStateProvider>;
}
