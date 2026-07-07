"use client";

import { cn } from "@/lib/utils";
import { ACCOUNTS_STATUS_BADGE_CLASS } from "@/lib/accounts/accounts-typography";
import {
  WORKFLOW_STATUS_LABELS,
  type AccountsVoucherWorkflowStatus,
  resolveWorkflowStatus,
  type AccountsDocumentWorkflow,
} from "@/lib/accounts/accounts-maker-checker";

const STATUS_STYLES: Record<
  AccountsVoucherWorkflowStatus,
  { bg: string; text: string; dot: string }
> = {
  draft: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
  pending_approval: { bg: "bg-orange-100", text: "text-orange-700", dot: "bg-brand-500" },
  sent_back: { bg: "bg-navy-50", text: "text-navy-700", dot: "bg-navy-500" },
  posted: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  rejected: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  cancelled: { bg: "bg-slate-200", text: "text-slate-700", dot: "bg-slate-600" },
};

export function AccountsVoucherStatusBadge({
  workflow,
  legacyStatus,
  className,
}: {
  workflow?: AccountsDocumentWorkflow;
  legacyStatus?: string;
  className?: string;
}) {
  const status = resolveWorkflowStatus(workflow, legacyStatus);
  const cfg = STATUS_STYLES[status];
  const label = WORKFLOW_STATUS_LABELS[status];

  return (
    <span
      className={cn(
        ACCOUNTS_STATUS_BADGE_CLASS,
        cfg.bg,
        cfg.text,
        className,
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />
      {label}
    </span>
  );
}
