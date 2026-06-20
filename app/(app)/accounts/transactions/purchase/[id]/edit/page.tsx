"use client";

import { use } from "react";
import PurchaseInvoiceFormClient from "../../PurchaseInvoiceFormClient";

export default function EditPurchaseInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <PurchaseInvoiceFormClient invoiceId={Number(id)} />;
}
