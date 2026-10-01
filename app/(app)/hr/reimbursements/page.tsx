"use client";

import ReimbursementsClient from "./ReimbursementsClient";

/** Direct mount — avoids Soft Nav stall during demo (Payroll → Reimbursements). */
export default function ReimbursementsPage() {
  return <ReimbursementsClient />;
}
