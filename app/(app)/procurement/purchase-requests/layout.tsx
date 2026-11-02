"use client";

import { PrListingStateProvider } from "./pr-listing-state-context";

/**
 * Keeps All / Draft / Approval / Rejected listing filters in memory for the
 * whole purchase-requests route tree (list ↔ detail/edit/new). State clears
 * when the user navigates away from this module.
 */
export default function PurchaseRequestsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PrListingStateProvider>{children}</PrListingStateProvider>;
}
