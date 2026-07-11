"use client";

import { cn } from "@/lib/utils";
import type {
  BankReconAccountStatus,
  BankReconMatchStatus,
  BankReconTransactionSource,
  BankReconVerificationStatus,
} from "../bank-reconciliation-v2-data";
import type { ManualReconciliationStatus } from "@/lib/accounts/bank-recon-manual-recon-types";

type BadgeCfg = { bg: string; text: string; dot?: string };

const ACCOUNT_STATUS_CFG: Record<BankReconAccountStatus, BadgeCfg> = {
  Reconciled: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  "Partially Reconciled": { bg: "bg-sky-50", text: "text-sky-700", dot: "bg-sky-500" },
  Pending: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  "Statement Not Uploaded": { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
};

const SOURCE_CFG: Record<BankReconTransactionSource, BadgeCfg> = {
  Manual: { bg: "bg-purple-50", text: "text-purple-700" },
  "Statement Upload": { bg: "bg-navy-50", text: "text-navy-700" },
  "Manual + Statement": { bg: "bg-brand-50", text: "text-brand-700" },
  "Bank Feed": { bg: "bg-teal-50", text: "text-teal-700" },
};

const MATCH_STATUS_CFG: Record<BankReconMatchStatus, BadgeCfg> = {
  Matched: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  "Suggested Match": { bg: "bg-sky-50", text: "text-sky-700", dot: "bg-sky-500" },
  Pending: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  Uncategorized: { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-400" },
  "Possible Duplicate": { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-400" },
  Excluded: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
};

const VERIFICATION_STATUS_CFG: Record<BankReconVerificationStatus, BadgeCfg> = {
  "Awaiting Statement": { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  Verified: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  "Review Required": { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-400" },
  "Reference Pending": { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-400" },
  "Duplicate Skipped": { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-400" },
  "Verified Statement Entry": { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  "Not Applicable": { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
};

const RECONCILIATION_STATUS_CFG: Record<ManualReconciliationStatus, BadgeCfg> = {
  Unreconciled: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
  Suggested: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  "Partially Reconciled": { bg: "bg-navy-50", text: "text-navy-700", dot: "bg-navy-500" },
  Reconciled: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  "Manually Cleared": { bg: "bg-teal-50", text: "text-teal-700", dot: "bg-teal-500" },
  Excluded: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
  "Pending Review": { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-400" },
};

function StatusPill({ label, cfg }: { label: string; cfg: BadgeCfg }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap",
        cfg.bg,
        cfg.text,
      )}
    >
      {cfg.dot ? <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} /> : null}
      {label}
    </span>
  );
}

export function BankReconAccountStatusBadge({ status }: { status: BankReconAccountStatus }) {
  return <StatusPill label={status} cfg={ACCOUNT_STATUS_CFG[status]} />;
}

export function BankReconSourceBadge({ source }: { source: BankReconTransactionSource }) {
  return <StatusPill label={source} cfg={SOURCE_CFG[source]} />;
}

export function BankReconMatchStatusBadge({ status }: { status: BankReconMatchStatus }) {
  return <StatusPill label={status} cfg={MATCH_STATUS_CFG[status]} />;
}

export function BankReconVerificationStatusBadge({ status }: { status: BankReconVerificationStatus }) {
  return <StatusPill label={status} cfg={VERIFICATION_STATUS_CFG[status]} />;
}

export function BankReconReconciliationStatusBadge({ status }: { status: ManualReconciliationStatus | string }) {
  const cfg = RECONCILIATION_STATUS_CFG[status as ManualReconciliationStatus] ?? RECONCILIATION_STATUS_CFG.Unreconciled;
  return <StatusPill label={status} cfg={cfg} />;
}
