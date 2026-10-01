"use client";

import InvoiceFormPageClient from "./InvoiceFormPageClient";

export default function InvoiceEditPageClient({ invoiceId }: { invoiceId: number }) {
  return <InvoiceFormPageClient invoiceId={invoiceId} />;
}
