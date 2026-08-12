"use client";

import InvoiceFormPageClient from "./InvoiceFormPageClient";

export default function InvoiceEditPageClient({
  invoiceId,
}: {
  invoiceId: number | string;
}) {
  const numericId =
    typeof invoiceId === "number" ? invoiceId : Number(invoiceId);
  // Edit form currently uses local numeric invoice ids; UUID API invoices are view-only.
  return (
    <InvoiceFormPageClient
      invoiceId={Number.isFinite(numericId) ? numericId : undefined}
    />
  );
}
