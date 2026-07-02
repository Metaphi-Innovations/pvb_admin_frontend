"use client";

import { cn } from "@/lib/utils";
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
};

export function ReconEntryStatusBadge({ status }: { status: BookReconStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium",
        cfg.bg,
        cfg.text,
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />
      {cfg.label}
    </span>
  );
}
