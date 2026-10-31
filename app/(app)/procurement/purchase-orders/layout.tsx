"use client";

import { PoListingStateProvider } from "./po-listing-state-context";

/**
 * Keeps PO / Draft / Purchase Return listing filters in memory for the whole
 * purchase-orders route tree (list ↔ detail/edit/new). State clears when the
 * user navigates away from this module.
 */
export default function PurchaseOrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PoListingStateProvider>{children}</PoListingStateProvider>;
}
