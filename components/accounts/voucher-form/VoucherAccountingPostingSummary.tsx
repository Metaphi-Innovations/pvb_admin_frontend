"use client";

import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/accounts/money-format";
import { VoucherFormSectionCard } from "@/components/accounts/voucher-form/VoucherFormSectionCard";

export interface VoucherGstAdjustmentRows {
  cgstLabel: string;
  cgstAmount: number;
  sgstLabel: string;
  sgstAmount: number;
  igstLabel: string;
  igstAmount: number;
}

export interface VoucherAccountingPostingSummaryProps {
  /** Optional secondary title context */
  voucherTypeLabel?: string;
  debitLedgerLabel?: string;
  debitLedgerName?: string;
  creditLedgerLabel?: string;
  creditLedgerName?: string;
  voucherAmount?: number;
  voucherAmountLabel?: string;
  totalDebit?: number;
  totalCredit?: number;
  gstAdjustments?: VoucherGstAdjustmentRows;
  visibilityItems: string[];
  className?: string;
  /** Credit / Debit Note density. Default false for other vouchers. */
  compact?: boolean;
  /** When true, render body only (no outer card) — for embedding under narration. */
  embedded?: boolean;
}

function ImpactRow({
  label,
  value,
  muted,
  compact,
}: {
  label: string;
  value: string;
  muted?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "space-y-0" : "space-y-0.5"}>
      <p
        className={cn(
          "uppercase tracking-wider text-muted-foreground",
          compact
            ? "text-[10px] font-semibold"
            : "text-[10px] font-bold",
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "leading-snug",
          compact ? "text-[12px] font-normal" : "text-[12px]",
          muted ? "text-muted-foreground" : compact ? "text-foreground" : "font-medium text-foreground",
        )}
      >
        {value || "—"}
      </p>
    </div>
  );
}

function PostingBody({
  debitLedgerLabel,
  debitLedgerName,
  creditLedgerLabel,
  creditLedgerName,
  voucherAmount,
  voucherAmountLabel,
  totalDebit,
  totalCredit,
  gstAdjustments,
  visibilityItems,
  compact,
}: {
  debitLedgerLabel: string;
  debitLedgerName?: string;
  creditLedgerLabel: string;
  creditLedgerName?: string;
  voucherAmount?: number;
  voucherAmountLabel: string;
  totalDebit?: number;
  totalCredit?: number;
  gstAdjustments?: VoucherGstAdjustmentRows;
  visibilityItems: string[];
  compact?: boolean;
}) {
  const showJournalTotals = totalDebit != null || totalCredit != null;
  const showAmount = voucherAmount != null && !showJournalTotals;

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2", compact ? "gap-3" : "gap-4")}>
      <div className={cn("min-w-0", compact ? "space-y-2" : "space-y-3")}>
        <p
          className={cn(
            "uppercase tracking-widest text-muted-foreground",
            compact ? "text-[10px] font-semibold" : "text-[10px] font-bold",
          )}
        >
          Accounting Impact
        </p>

        {showJournalTotals ? (
          <div className={compact ? "space-y-1.5" : "space-y-2.5"}>
            <div className="flex items-center justify-between gap-3 text-[12px] font-normal">
              <span className="text-muted-foreground">Total Debit</span>
              <span className="tabular-nums">{formatMoney(totalDebit ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-[12px] font-normal">
              <span className="text-muted-foreground">Total Credit</span>
              <span className="tabular-nums">{formatMoney(totalCredit ?? 0)}</span>
            </div>
          </div>
        ) : (
          <div className={compact ? "space-y-1.5" : "space-y-2.5"}>
            <ImpactRow
              label={debitLedgerLabel}
              value={debitLedgerName || "—"}
              muted={!debitLedgerName}
              compact={compact}
            />
            <ImpactRow
              label={creditLedgerLabel}
              value={creditLedgerName || "—"}
              muted={!creditLedgerName}
              compact={compact}
            />
            {showAmount ? (
              <div className="flex items-center justify-between gap-3 pt-1 border-t border-border/50 text-[12px]">
                <span className="font-normal text-foreground">{voucherAmountLabel}</span>
                <span className="cdn-grand-total tabular-nums">{formatMoney(voucherAmount ?? 0)}</span>
              </div>
            ) : null}
          </div>
        )}

        {gstAdjustments ? (
          <div className={cn("border-t border-border/50", compact ? "space-y-1 pt-1.5" : "space-y-1.5 pt-2")}>
            <p
              className={cn(
                "uppercase tracking-wider text-muted-foreground",
                compact ? "text-[10px] font-semibold" : "text-[10px] font-bold",
              )}
            >
              GST Adjustments
            </p>
            <div className="flex justify-between text-[12px] font-normal gap-3">
              <span className="text-muted-foreground">{gstAdjustments.cgstLabel}</span>
              <span className="tabular-nums">{formatMoney(gstAdjustments.cgstAmount)}</span>
            </div>
            <div className="flex justify-between text-[12px] font-normal gap-3">
              <span className="text-muted-foreground">{gstAdjustments.sgstLabel}</span>
              <span className="tabular-nums">{formatMoney(gstAdjustments.sgstAmount)}</span>
            </div>
            <div className="flex justify-between text-[12px] font-normal gap-3">
              <span className="text-muted-foreground">{gstAdjustments.igstLabel}</span>
              <span className="tabular-nums">{formatMoney(gstAdjustments.igstAmount)}</span>
            </div>
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          "min-w-0 md:border-l md:border-border/50",
          compact ? "space-y-1.5 md:pl-3" : "space-y-2 md:pl-4",
        )}
      >
        <p
          className={cn(
            "uppercase tracking-widest text-muted-foreground",
            compact ? "text-[10px] font-semibold" : "text-[10px] font-bold",
          )}
        >
          Posting Visibility
        </p>
        <p className="text-[10px] text-muted-foreground font-normal">This posting will be visible in:</p>
        <ul className={compact ? "space-y-0.5" : "space-y-1"}>
          {visibilityItems.map((item) => (
            <li key={item} className="flex items-start gap-1.5 text-[12px] font-normal text-foreground">
              <span
                className={cn(
                  "mt-1.5 w-1 h-1 rounded-full flex-shrink-0",
                  compact ? "cdn-posting-dot bg-muted-foreground/50" : "bg-brand-500",
                )}
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * Read-only Accounting Posting Summary for the six voucher modules only.
 * Informational — no posting logic or validation.
 */
export function VoucherAccountingPostingSummary({
  voucherTypeLabel,
  debitLedgerLabel = "Debit",
  debitLedgerName,
  creditLedgerLabel = "Credit",
  creditLedgerName,
  voucherAmount,
  voucherAmountLabel = "Voucher Amount",
  totalDebit,
  totalCredit,
  gstAdjustments,
  visibilityItems,
  className,
  compact = false,
  embedded = false,
}: VoucherAccountingPostingSummaryProps) {
  const body = (
    <PostingBody
      debitLedgerLabel={debitLedgerLabel}
      debitLedgerName={debitLedgerName}
      creditLedgerLabel={creditLedgerLabel}
      creditLedgerName={creditLedgerName}
      voucherAmount={voucherAmount}
      voucherAmountLabel={voucherAmountLabel}
      totalDebit={totalDebit}
      totalCredit={totalCredit}
      gstAdjustments={gstAdjustments}
      visibilityItems={visibilityItems}
      compact={compact}
    />
  );

  if (embedded) {
    return (
      <div className={className}>
        <p className="cdn-subsection-title">Accounting Posting Summary</p>
        {voucherTypeLabel ? (
          <p className="text-[10px] text-muted-foreground font-normal -mt-1 mb-2">
            Preview for {voucherTypeLabel}. Draft saves do not post to ledgers.
          </p>
        ) : null}
        {body}
      </div>
    );
  }

  return (
    <VoucherFormSectionCard
      title="Accounting Posting Summary"
      helper={
        voucherTypeLabel
          ? `Preview for ${voucherTypeLabel}. Draft saves do not post to ledgers.`
          : "Informational preview of accounting impact when this voucher is posted."
      }
      className={className}
      compact={compact}
    >
      {body}
    </VoucherFormSectionCard>
  );
}
