"use client";

import { useParams } from "next/navigation";
import { createLazyClientPage } from "@/lib/createLazyClientPage";

const LazyView = createLazyClientPage(() => import("../../../invoices/InvoiceViewPageClient"));

export default function InvoiceViewRoute() {
  const params = useParams();
  const id = Number(params.id);
  return <LazyView invoiceId={id} />;
}
