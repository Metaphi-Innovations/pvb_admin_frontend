"use client";

import { StatusBadge } from "@/components/ui/StatusBadge";
import type { StatusKey } from "@/lib/tokens";
import type { BankEntryMatchStatus } from "../bank-reconciliation-data";

const MAP: Record<BankEntryMatchStatus, { status: StatusKey; label: string }> = {
  unmatched: { status: "pending", label: "Uncategorized" },
  partial: { status: "partial", label: "Partially Allocated" },
  matched: { status: "partial", label: "Matched" },
  reconciled: { status: "approved", label: "Reconciled" },
  ignored: { status: "closed", label: "Ignored" },
};

export function MatchStatusBadge({
  status,
  computedLabel,
}: {
  status: BankEntryMatchStatus;
  computedLabel?: string;
}) {
  const m = MAP[status] ?? MAP.unmatched;
  return <StatusBadge status={m.status} label={computedLabel ?? m.label} size="sm" />;
}
