"use client";

import { useParams } from "next/navigation";
import { createLazyClientPage } from "@/lib/createLazyClientPage";

const LazyForm = createLazyClientPage(() => import("../../../../purchase/PurchaseFormPageClient"));

export default function PurchaseEditRoute() {
  const params = useParams();
  return <LazyForm purchaseId={Number(params.id)} />;
}
