"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy route — redirects to Purchase Orders module. */
export default function LegacyOrdersRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/procurement/purchase-orders");
  }, [router]);
  return null;
}
