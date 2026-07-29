"use client";

import { createLazyClientPage } from "@/lib/createLazyClientPage";

const PurchaseInvoiceFormClient = createLazyClientPage(() => import("../../PurchaseInvoiceFormClient"));

import { use } from "react";

export default function EditPurchaseInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <PurchaseInvoiceFormClient invoiceId={Number(id)} />;
}
