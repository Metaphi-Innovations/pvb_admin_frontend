"use client";

import { PurchaseInvoiceListingStateProvider } from "./purchase-invoice-listing-state-context";

/**
 * Keeps Purchase Invoice listing filters (All Invoices / GRN Pending) in memory
 * for the whole accounts/purchase-invoices route tree (list ↔ view/new/edit).
 * State clears when the user leaves this module.
 */
export default function PurchaseInvoicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PurchaseInvoiceListingStateProvider>
      {children}
    </PurchaseInvoiceListingStateProvider>
  );
}
