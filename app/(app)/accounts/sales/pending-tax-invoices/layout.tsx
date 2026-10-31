"use client";

import { PendingInvoiceListingStateProvider } from "./pending-invoice-listing-state-context";

/**
 * Keeps Pending Invoice listing filters (per Sales Order / Stock Transfer tab)
 * in memory for this route tree. State clears when the user leaves the module.
 */
export default function PendingTaxInvoicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PendingInvoiceListingStateProvider>
      {children}
    </PendingInvoiceListingStateProvider>
  );
}
