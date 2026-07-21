"use client";

import { cn } from "@/lib/utils";
import type { BankReconTallyStatus } from "@/lib/accounts/bank-recon-tally-types";

const CFG: Record<BankReconTallyStatus, { bg: string; text: string; label: string }> = {
  UNRECONCILED: { bg: "bg-slate-100", text: "text-slate-700", label: "Unreconciled" },
  SUGGESTED_MATCH: { bg: "bg-amber-50", text: "text-amber-700", label: "Suggested Match" },
  RECONCILED: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Reconciled" },
  AVAILABLE_ONLY_IN_BOOKS: { bg: "bg-navy-50", text: "text-navy-700", label: "Only in Books" },
  AVAILABLE_ONLY_IN_BANK: { bg: "bg-sky-50", text: "text-sky-700", label: "Only in Bank" },
  AMOUNT_MISMATCH: { bg: "bg-red-50", text: "text-red-700", label: "Amount Mismatch" },
  MULTIPLE_MATCHES: { bg: "bg-purple-50", text: "text-purple-700", label: "Multiple Matches" },
  MARKED_FOR_REVIEW: { bg: "bg-orange-50", text: "text-orange-700", label: "Marked for Review" },
  IGNORED: { bg: "bg-slate-100", text: "text-slate-600", label: "Ignored" },
};

export function BankReconTallyStatusBadge({ status }: { status: BankReconTallyStatus }) {
  const cfg = CFG[status] ?? CFG.UNRECONCILED;
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap",
        cfg.bg,
        cfg.text,
      )}
    >
      {cfg.label}
    </span>
  );
}
