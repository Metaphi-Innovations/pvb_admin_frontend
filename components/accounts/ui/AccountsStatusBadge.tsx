"use client";

import { AccountsVoucherStatusBadge } from "@/components/accounts/AccountsVoucherStatusBadge";
import type { AccountsDocumentWorkflow } from "@/lib/accounts/accounts-maker-checker";
import { cn } from "@/lib/utils";
import { ACCOUNTS_STATUS_BADGE_CLASS } from "@/lib/accounts/accounts-typography";

const GENERIC: Record<string, { bg: string; text: string; dot: string }> = {
  active: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  inactive: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
  draft: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
  pending: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  approved: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  posted: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  rejected: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  cancelled: { bg: "bg-slate-200", text: "text-slate-700", dot: "bg-slate-600" },
};

export function AccountsStatusBadge({
  workflow,
  legacyStatus,
  status,
  label,
  className,
}: {
  workflow?: AccountsDocumentWorkflow;
  legacyStatus?: string;
  /** Generic status key when not using voucher workflow */
  status?: string;
  label?: string;
  className?: string;
}) {
  if (workflow != null || legacyStatus != null) {
    return (
      <AccountsVoucherStatusBadge
        workflow={workflow}
        legacyStatus={legacyStatus}
        className={className}
      />
    );
  }

  const key = (status ?? "draft").toLowerCase();
  const cfg = GENERIC[key] ?? GENERIC.draft;
  const text = label ?? (status ? status.charAt(0).toUpperCase() + status.slice(1) : "Draft");

  return (
    <span className={cn(ACCOUNTS_STATUS_BADGE_CLASS, cfg.bg, cfg.text, className)}>
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />
      {text}
    </span>
  );
}
