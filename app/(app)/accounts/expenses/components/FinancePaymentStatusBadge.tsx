"use client";

import { StatusBadge } from "@/components/ui/StatusBadge";
import type { StatusKey } from "@/lib/tokens";
import type { FinancePaymentStatus } from "../accounts-payment-data";

const MAP: Record<FinancePaymentStatus, { status: StatusKey; label: string }> = {
  payment_pending: { status: "pending", label: "Payment Pending" },
  partially_paid: { status: "partial", label: "Partially Paid" },
  payment_done: { status: "approved", label: "Payment Done" },
  cancelled: { status: "closed", label: "Cancelled" },
};

export function FinancePaymentStatusBadge({ status }: { status: FinancePaymentStatus }) {
  const m = MAP[status];
  return <StatusBadge status={m.status} label={m.label} size="sm" />;
}
