"use client";

import { useParams } from "next/navigation";
import { createLazyClientPage } from "@/lib/createLazyClientPage";

const LazyForm = createLazyClientPage(() => import("../../../../payments/PaymentEditPageClient"));

export default function PaymentEditRoute() {
  const params = useParams();
  const id = Number(params.id);
  return <LazyForm paymentId={id} />;
}
