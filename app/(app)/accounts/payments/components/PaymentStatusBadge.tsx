"use client";

import { StatusBadge } from "@/components/ui/StatusBadge";
import type { StatusKey } from "@/lib/tokens";
import type { PaymentExecutionStatus } from "../payments-data";

const MAP: Record<PaymentExecutionStatus, { status: StatusKey; label: string }> = {
  payment_pending: { status: "pending", label: "Pending" },
  partially_paid: { status: "partial", label: "Partially Paid" },
  payment_done: { status: "approved", label: "Paid" },
  cancelled: { status: "closed", label: "Cancelled" },
};

export function PaymentStatusBadge({ status }: { status: PaymentExecutionStatus }) {
  const m = MAP[status];
  return <StatusBadge status={m.status} label={m.label} size="sm" />;
}
