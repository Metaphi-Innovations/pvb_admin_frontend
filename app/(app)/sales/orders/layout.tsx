"use client";

import { SoListingStateProvider } from "./so-listing-state-context";

/**
 * Keeps Sales / Draft / Approval / Rejected / Sales Return listing filters in
 * memory for the whole sales/orders route tree (list ↔ detail/edit/add/split/
 * packing-list / return). State clears when the user leaves this module.
 */
export default function SalesOrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SoListingStateProvider>{children}</SoListingStateProvider>;
}
