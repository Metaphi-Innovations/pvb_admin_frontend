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

export function ReconEntryStatusBadge({
  status,
  suggested,
}: {
  status: BookReconStatus;
  suggested?: boolean;
}) {
  const cfg = STATUS_CFG[status];
  return (
    <span className="inline-flex items-center gap-1.5">
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
      {suggested && status === "pending" && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-navy-50 text-navy-700 text-[10px] font-semibold border border-navy-100">
          Suggested
        </span>
      )}
    </span>
  );
}
