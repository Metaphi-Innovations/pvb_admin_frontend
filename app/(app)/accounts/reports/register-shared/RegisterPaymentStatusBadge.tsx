"use client";

import { StatusBadge } from "@/components/ui/StatusBadge";
import type { StatusKey } from "@/lib/tokens";
import type { RegisterPaymentStatus } from "./register-types";

const MAP: Record<RegisterPaymentStatus, { status: StatusKey; label: string }> = {
  paid: { status: "approved", label: "Paid" },
  partially_paid: { status: "partial", label: "Partially Paid" },
  pending: { status: "pending", label: "Pending" },
  overdue: { status: "overdue", label: "Overdue" },
};

export function RegisterPaymentStatusBadge({ status }: { status: RegisterPaymentStatus }) {
  const m = MAP[status];
  return <StatusBadge status={m.status} label={m.label} size="sm" />;
}
