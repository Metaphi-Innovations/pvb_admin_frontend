"use client";

import type { LucideIcon } from "lucide-react";
import { Banknote, Building2, CalendarDays, Hash } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";

export type TransactionViewStatusKey =
  | "active"
  | "pending"
  | "approved"
  | "rejected"
  | "draft"
  | "inactive"
  | "closed";

export function voucherStatusToBadgeKey(
  status: string | null | undefined,
): TransactionViewStatusKey {
  switch (status) {
    case "POSTED":
    case "APPROVED":
    case "posted":
    case "approved":
    case "Paid":
    case "SENT":
    case "sent":
      return "approved";
    case "PENDING_APPROVAL":
    case "pending":
    case "PENDING":
    case "Submitted":
      return "pending";
    case "REJECTED":
    case "rejected":
      return "rejected";
    case "CANCELLED":
    case "REVERSED":
    case "cancelled":
    case "Cancelled":
    case "reversed":
      return "closed";
    case "DRAFT":
    case "draft":
    case "Draft":
      return "draft";
    default:
      return "inactive";
  }
}

export type TransactionViewMetaItem = {
  icon?: LucideIcon;
  label?: string;
  value: string;
  mono?: boolean;
};

export function TransactionViewHero({
  statusKey,
  statusLabel,
  chips,
  metaItems,
  partyLabel,
  amountLabel = "Net Amount",
  amount,
  className,
}: {
  statusKey?: TransactionViewStatusKey;
  statusLabel?: string | null;
  chips?: string[];
  metaItems?: TransactionViewMetaItem[];
  partyLabel?: string | null;
  amountLabel?: string;
  amount?: number | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-brand-200/80",
        "bg-gradient-to-br from-[#FFF7ED] via-white to-[#FFF1E0]",
        "shadow-sm px-3.5 py-2.5 sm:px-4 sm:py-3",
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

      <div className="relative flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {statusLabel ? (
              <StatusBadge
                status={statusKey ?? "inactive"}
                label={statusLabel}
                size="md"
                showDot
              />
            ) : null}
            {(chips ?? []).map((chip) => (
              <span
                key={chip}
                className="inline-flex items-center rounded-md bg-white/80 border border-brand-100 px-2 py-0.5 text-[11px] font-medium text-brand-800"
              >
                {chip}
              </span>
            ))}
          </div>

          {metaItems && metaItems.length > 0 ? (
            <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-navy-800">
              {metaItems.map((item, i) => {
                const Icon = item.icon ?? Hash;
                return (
                  <span key={`${item.value}-${i}`} className="inline-flex items-center gap-1.5 min-w-0">
                    <Icon className="h-3.5 w-3.5 shrink-0 text-brand-600" />
                    {item.label ? (
                      <span className="text-muted-foreground">{item.label}</span>
                    ) : null}
                    <span
                      className={cn(
                        "font-medium truncate",
                        item.mono && "font-mono font-semibold text-brand-700",
                      )}
                    >
                      {item.value}
                    </span>
                  </span>
                );
              })}
            </div>
          ) : null}

          {partyLabel ? (
            <p className="text-sm font-semibold text-navy-900 truncate">{partyLabel}</p>
          ) : null}
        </div>

        {amount != null && Number.isFinite(amount) ? (
          <div className="shrink-0 rounded-lg border border-brand-200 bg-white/90 px-3 py-1.5 shadow-sm min-w-[140px]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-brand-700/80 flex items-center gap-1">
              <Banknote className="h-3 w-3" />
              {amountLabel}
            </p>
            <p className="text-lg font-bold tabular-nums text-brand-700 tracking-tight leading-tight">
              {formatMoney(amount)}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Convenience meta builders matching receipt hero layout. */
export function buildVoucherViewMeta(opts: {
  draftNo?: string;
  accountingVoucherNo?: string | null;
  voucherDate?: string;
  branchName?: string;
}): TransactionViewMetaItem[] {
  const items: TransactionViewMetaItem[] = [];
  if (opts.draftNo) {
    items.push({ icon: Hash, label: "Draft", value: opts.draftNo, mono: true });
  }
  if (opts.accountingVoucherNo) {
    items.push({ icon: Hash, label: "AV", value: opts.accountingVoucherNo, mono: true });
  }
  if (opts.voucherDate) {
    items.push({ icon: CalendarDays, value: opts.voucherDate });
  }
  if (opts.branchName) {
    items.push({ icon: Building2, value: opts.branchName });
  }
  return items;
}
