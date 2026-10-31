"use client";

import { ReorderListingStateProvider } from "./reorder-listing-state-context";

/**
 * Keeps Warehouse Wise / Product Overview listing filters (and the warehouse
 * selector) in memory for the whole warehouse/reorder-level route tree
 * (list ↔ create/view/edit). State clears when the user leaves this module.
 */
export default function ReorderLevelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ReorderListingStateProvider>{children}</ReorderListingStateProvider>
  );
}
