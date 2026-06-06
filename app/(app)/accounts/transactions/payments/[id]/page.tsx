"use client";

import { useParams } from "next/navigation";
import { createLazyClientPage } from "@/lib/createLazyClientPage";

const LazyView = createLazyClientPage(() => import("../../../payments/PaymentViewPageClient"));

export default function PaymentViewRoute() {
  const params = useParams();
  const id = Number(params.id);
  return <LazyView paymentId={id} />;
}
