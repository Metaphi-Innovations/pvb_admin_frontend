"use client";

import { useParams } from "next/navigation";
import { createLazyClientPage } from "@/lib/createLazyClientPage";

const LazyForm = createLazyClientPage(() => import("../../../../invoices/InvoiceEditPageClient"));

export default function InvoiceEditRoute() {
  const params = useParams();
  const id = Number(params.id);
  return <LazyForm invoiceId={id} />;
}
