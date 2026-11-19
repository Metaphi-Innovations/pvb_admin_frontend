"use client";

import { useEffect, useRef } from "react";
import { ensureHrDemoDataOnce } from "@/app/(app)/hr/demo/demo-workspace-auto";

/**
 * Silently seeds HR demo data once on first HR visit (no Demo Workspace click).
 */
export function HrDemoAutoSeed() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    // Defer so first paint / navigation isn't blocked
    const t = window.setTimeout(() => {
      try {
        ensureHrDemoDataOnce();
      } catch {
        /* non-blocking */
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  return null;
}
