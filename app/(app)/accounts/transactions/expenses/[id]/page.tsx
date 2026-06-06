"use client";

import { useParams } from "next/navigation";
import { createLazyClientPage } from "@/lib/createLazyClientPage";

const LazyView = createLazyClientPage(() => import("../../../expenses/ExpenseViewPageClient"));

export default function ExpenseViewRoute() {
  const params = useParams();
  const id = Number(params.id);
  return <LazyView paymentId={id} />;
}
