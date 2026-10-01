"use client";

import { useEffect, useState } from "react";

/** True after mount — use to defer localStorage-dependent UI and avoid hydration mismatches. */
export function useClientReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready;
}
