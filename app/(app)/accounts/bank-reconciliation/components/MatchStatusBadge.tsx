"use client";

import { StatusBadge } from "@/components/ui/StatusBadge";
import type { StatusKey } from "@/lib/tokens";
import type { BankEntryMatchStatus } from "../bank-reconciliation-data";

const MAP: Record<BankEntryMatchStatus, { status: StatusKey; label: string }> = {
  unmatched: { status: "pending", label: "Unmatched" },
  matched: { status: "partial", label: "Matched" },
  reconciled: { status: "approved", label: "Reconciled" },
  ignored: { status: "closed", label: "Ignored" },
};

export function MatchStatusBadge({ status }: { status: BankEntryMatchStatus }) {
  const m = MAP[status] ?? MAP.unmatched;
  return <StatusBadge status={m.status} label={m.label} size="sm" />;
}
