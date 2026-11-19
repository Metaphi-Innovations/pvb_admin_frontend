"use client";

import { useEffect } from "react";
import { HR_MODULE_ENTRY_HREF } from "@/lib/hr/hr-nav";

/**
 * `/hr` is not a landing page — force-enter the real HR workspace.
 * Uses a hard navigation so we never stick on the catch-all Coming Soon page.
 */
export default function HrIndexPage() {
  useEffect(() => {
    window.location.replace(HR_MODULE_ENTRY_HREF);
  }, []);

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p className="text-sm text-muted-foreground">Opening Employees…</p>
    </div>
  );
}
