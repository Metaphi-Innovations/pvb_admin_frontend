"use client";

import { Banknote, Building2, CalendarDays, Hash } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import type { ReceiptVoucherStatus } from "@/types/receipt-voucher.types";
import { RECEIPT_STATUS_LABELS } from "@/types/receipt-voucher.types";

function statusBadgeKey(
  status: ReceiptVoucherStatus | string | null | undefined,
): "active" | "pending" | "approved" | "rejected" | "draft" | "inactive" | "closed" {
  switch (status) {
    case "POSTED":
    case "APPROVED":
      return "approved";
    case "PENDING_APPROVAL":
      return "pending";
    case "REJECTED":
      return "rejected";
    case "CANCELLED":
    case "REVERSED":
      return "closed";
    case "DRAFT":
      return "draft";
    default:
      return "inactive";
  }
}

export function ReceiptViewHero({
  draftNo,
  accountingVoucherNo,
  voucherDate,
  branchName,
  modeLabel,
  partyLabel,
  netBank,
  status,
  className,
}: {
  draftNo: string;
  accountingVoucherNo?: string | null;
  voucherDate: string;
  branchName?: string;
  modeLabel?: string;
  partyLabel?: string;
  netBank: number;
  status?: ReceiptVoucherStatus | string | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-brand-200/80",
        "bg-gradient-to-br from-[#FFF7ED] via-white to-[#FFF1E0]",
        "shadow-sm px-4 py-3.5 sm:px-5 sm:py-4",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-brand-400/15 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-12 left-1/3 h-28 w-28 rounded-full bg-amber-300/20 blur-2xl"
        aria-hidden
      />

      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              status={statusBadgeKey(status)}
              label={
                status
                  ? RECEIPT_STATUS_LABELS[status as ReceiptVoucherStatus] || String(status)
                  : "—"
              }
              size="md"
              showDot
            />
            {modeLabel ? (
              <span className="inline-flex items-center rounded-md bg-white/80 border border-brand-100 px-2 py-0.5 text-[11px] font-medium text-brand-800">
                {modeLabel}
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-navy-800">
            <span className="inline-flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5 text-brand-600" />
              <span className="text-muted-foreground">Draft</span>
              <span className="font-mono font-semibold text-brand-700">{draftNo}</span>
            </span>
            {accountingVoucherNo ? (
              <span className="inline-flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5 text-navy-500" />
                <span className="text-muted-foreground">AV</span>
                <span className="font-mono font-semibold text-navy-800">
                  {accountingVoucherNo}
                </span>
              </span>
            ) : null}
            {voucherDate ? (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-brand-600" />
                <span className="font-medium">{voucherDate}</span>
              </span>
            ) : null}
            {branchName ? (
              <span className="inline-flex items-center gap-1.5 min-w-0">
                <Building2 className="h-3.5 w-3.5 shrink-0 text-brand-600" />
                <span className="truncate font-medium">{branchName}</span>
              </span>
            ) : null}
          </div>

          {partyLabel ? (
            <p className="text-sm font-semibold text-navy-900 truncate">{partyLabel}</p>
          ) : null}
        </div>

        <div className="shrink-0 rounded-xl border border-brand-200 bg-white/90 px-3.5 py-2.5 shadow-sm min-w-[160px]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-brand-700/80 flex items-center gap-1">
            <Banknote className="h-3 w-3" />
            Net Cash / Bank
          </p>
          <p className="mt-0.5 text-xl font-bold tabular-nums text-brand-700 tracking-tight">
            {formatMoney(netBank)}
          </p>
        </div>
      </div>
    </div>
  );
}
