"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy route — business geography is created from Geography Setup tab only. */
export default function AddGeographyPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/masters/geography?tab=setup");
  }, [router]);
  return null;
}
