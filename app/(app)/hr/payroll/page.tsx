"use client";

import PayrollPageClient from "./PayrollPageClient";

/** Direct mount — avoids Soft Nav stall during demo. */
export default function PayrollPage() {
  return <PayrollPageClient />;
}
