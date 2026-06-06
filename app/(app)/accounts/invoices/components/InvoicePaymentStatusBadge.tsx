"use client";

import { StatusBadge } from "@/components/ui/StatusBadge";
import type { StatusKey } from "@/lib/tokens";
import type { InvoicePaymentStatus } from "../invoices-data";

const MAP: Record<InvoicePaymentStatus, { status: StatusKey; label: string }> = {
  unpaid: { status: "pending", label: "Unpaid" },
  partially_paid: { status: "partial", label: "Partially Paid" },
  paid: { status: "approved", label: "Paid" },
};

export function InvoicePaymentStatusBadge({ status }: { status: InvoicePaymentStatus }) {
  const m = MAP[status];
  return <StatusBadge status={m.status} label={m.label} size="sm" />;
}
