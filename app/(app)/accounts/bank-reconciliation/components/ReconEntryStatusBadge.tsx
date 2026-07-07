"use client";

import { cn } from "@/lib/utils";
import { ACCOUNTS_STATUS_BADGE_CLASS } from "@/lib/accounts/accounts-typography";
import type { BookReconStatus } from "@/lib/accounts/manual-bank-reconciliation-data";

const STATUS_CFG: Record<BookReconStatus, { bg: string; text: string; dot: string; label: string }> = {
  pending: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-400",
    label: "Pending",
  },
  reconciled: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
    label: "Reconciled",
  },
  unmatched: {
    bg: "bg-slate-100",
    text: "text-slate-600",
    dot: "bg-slate-400",
    label: "Unmatched",
  },
  difference: {
    bg: "bg-red-50",
    text: "text-red-700",
    dot: "bg-red-400",
    label: "Difference",
  },
};

export function ReconEntryStatusBadge({ status }: { status: BookReconStatus }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.unmatched;
  return (
    <span
      className={cn(
        ACCOUNTS_STATUS_BADGE_CLASS,
        cfg.bg,
        cfg.text,
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />
      {cfg.label}
    </span>
  );
}
