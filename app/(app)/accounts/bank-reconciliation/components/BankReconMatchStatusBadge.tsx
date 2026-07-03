"use client";

import { cn } from "@/lib/utils";
import { ACCOUNTS_STATUS_BADGE_CLASS } from "@/lib/accounts/accounts-typography";
import {
  matchStatusLabel,
  type BankReconMatchStatus,
} from "@/lib/accounts/bank-reconciliation-match-grid";

const STATUS_CFG: Record<
  BankReconMatchStatus,
  { bg: string; text: string; dot: string }
> = {
  matched: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  suggested: {
    bg: "bg-navy-50",
    text: "text-navy-700",
    dot: "bg-navy-500",
  },
  unmatched_bank: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-400",
  },
  unmatched_books: {
    bg: "bg-orange-100",
    text: "text-orange-700",
    dot: "bg-orange-400",
  },
  difference: {
    bg: "bg-red-50",
    text: "text-red-700",
    dot: "bg-red-400",
  },
  ignored: {
    bg: "bg-slate-100",
    text: "text-slate-600",
    dot: "bg-slate-400",
  },
};

export function BankReconMatchStatusBadge({ status }: { status: BankReconMatchStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <span
      className={cn(
        ACCOUNTS_STATUS_BADGE_CLASS,
        cfg.bg,
        cfg.text,
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />
      {matchStatusLabel(status)}
    </span>
  );
}
