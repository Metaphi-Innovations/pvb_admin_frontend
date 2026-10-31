"use client";

import { SalesInvoiceListingStateProvider } from "./sales-invoice-listing-state-context";

/**
 * Keeps Sales Invoice listing filters in memory for the whole
 * accounts/transactions/invoices route tree (list ↔ view/new/edit).
 * State clears when the user leaves this module.
 */
export default function SalesInvoicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SalesInvoiceListingStateProvider>{children}</SalesInvoiceListingStateProvider>
  );
}
