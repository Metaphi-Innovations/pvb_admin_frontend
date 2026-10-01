"use client";

import HrLettersPageClient from "./HrLettersPageClient";

/**
 * Direct client mount — avoids stuck Soft Nav overlays when dynamic() chunks
 * stall between HR sibling routes (e.g. Payroll → HR Letters).
 */
export default function HrLettersPage() {
  return <HrLettersPageClient />;
}
