"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SchemeNearExpiryAddRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/masters/scheme/add");
  }, [router]);

  return null;
}
