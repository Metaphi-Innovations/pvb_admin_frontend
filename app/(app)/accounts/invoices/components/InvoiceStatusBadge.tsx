"use client";

import { StatusBadge } from "@/components/ui/StatusBadge";
import type { StatusKey } from "@/lib/tokens";
import type { InvoiceStatus } from "../invoices-data";

const MAP: Record<InvoiceStatus, { status: StatusKey; label: string }> = {
  draft: { status: "draft", label: "Draft" },
  sent: { status: "pending", label: "Sent" },
  cancelled: { status: "closed", label: "Cancelled" },
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const m = MAP[status];
  return <StatusBadge status={m.status} label={m.label} size="sm" />;
}
