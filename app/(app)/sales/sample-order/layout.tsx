"use client";

import { SampleListingStateProvider } from "./sample-listing-state-context";

/**
 * Keeps Sample Order listing filters in memory for the whole sample-order route
 * tree (list ↔ detail/edit/add/split/packing-list / return). State clears when
 * the user navigates away from this module.
 */
export default function SampleOrderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SampleListingStateProvider>{children}</SampleListingStateProvider>;
}
