"use client";

import { useEffect, useState } from "react";

/** True only after the component has mounted in the browser (avoids SSR/localStorage hydration mismatches). */
export function useClientMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
