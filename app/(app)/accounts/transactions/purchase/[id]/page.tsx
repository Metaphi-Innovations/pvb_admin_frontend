"use client";

import { useParams } from "next/navigation";
import { createLazyClientPage } from "@/lib/createLazyClientPage";

const LazyView = createLazyClientPage(() => import("../../../purchase/PurchaseViewPageClient"));

export default function PurchaseViewRoute() {
  const params = useParams();
  return <LazyView purchaseId={Number(params.id)} />;
}
