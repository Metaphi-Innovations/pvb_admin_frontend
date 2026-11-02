"use client";

import { StListingStateProvider } from "./st-listing-state-context";

/**
 * Keeps Stock Transfer listing filters in memory for the whole stock-transfer
 * route tree (list ↔ detail/edit/new/packing-list). State clears when the user
 * navigates away from this module.
 */
export default function StockTransferLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StListingStateProvider>{children}</StListingStateProvider>;
}
