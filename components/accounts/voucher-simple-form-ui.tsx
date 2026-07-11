"use client";

import { Label } from "@/components/ui/label";
import { SelectContent } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatMoney, balanceSideLabel } from "@/lib/accounts/money-format";
import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { computeLedgerBalanceAsOfDate } from "@/app/(app)/accounts/masters/ledgers/ledgers-utils";

export const VOUCHER_FORM_OUTER = "w-full";

export const VOUCHER_FORM_CARD =
  "rounded-lg border border-border bg-white shadow-sm p-3 space-y-2.5 w-full";

/** Prefer shared Accounts tokens; kept for voucher form imports */
export const VOUCHER_PAGE_TITLE_CLASS = "accounts-page-title";

export const VOUCHER_PAGE_SUBTITLE_CLASS = "accounts-page-subtitle";

export const VOUCHER_SECTION_TITLE =
  "accounts-section-heading pb-1 border-b border-border/60";

export const VOUCHER_LABEL_CLASS = "accounts-form-label";

export const VOUCHER_INPUT_CLASS =
  "h-9 w-full min-w-0 accounts-form-input rounded-md border border-border bg-white focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:border-brand-400";

export const VOUCHER_MONEY_INPUT_CLASS = "text-[13px] text-right tabular-nums";

export const VOUCHER_BUTTON_CLASS = "h-8 accounts-action-button";

export const VOUCHER_BODY_TEXT = "text-[13px] text-foreground leading-snug";

export const VOUCHER_MUTED_TEXT = "text-xs text-muted-foreground leading-snug";

export const VOUCHER_BALANCE_TEXT =
  "text-[11px] text-muted-foreground tabular-nums leading-snug mt-0.5";

export const VOUCHER_TOTAL_LABEL_CLASS = "text-xs text-muted-foreground";

export const VOUCHER_TOTAL_AMOUNT_CLASS = "text-base font-semibold tabular-nums text-foreground";

export const VOUCHER_PREVIEW_TEXT_CLASS = VOUCHER_BODY_TEXT;

export const VOUCHER_ERROR_CLASS =
  "mb-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-2.5 py-1.5";

export const VOUCHER_HEADER_GRID = "flex flex-wrap items-start gap-x-2 gap-y-2";

export const VOUCHER_FIELD_DATE = "w-[136px]";
export const VOUCHER_FIELD_NUMBER = "w-[136px]";
export const VOUCHER_FIELD_REFERENCE = "w-[190px]";
export const VOUCHER_FIELD_MODE = "w-[170px]";
export const VOUCHER_FIELD_LEDGER = "w-full min-w-0";
export const VOUCHER_LEDGER_FIELD_MAX = "max-w-sm w-full";
export const VOUCHER_LEDGER_SELECT_COMPACT = {
  compact: true,
  listMaxHeight: 200,
} as const;
export const VOUCHER_FIELD_NARRATION = "w-full";
export const VOUCHER_AMOUNT_WIDTH = "w-full min-w-0";
export const VOUCHER_REMARK_WIDTH = "w-full min-w-0";

export const VOUCHER_ROW_EQUAL_4 =
  "grid grid-cols-1 sm:grid-cols-4 gap-3 items-start";

/** Equal 3-column grid for receipt/payment detail rows */
export const VOUCHER_ROW_EQUAL_3 =
  "grid grid-cols-1 sm:grid-cols-3 gap-3 items-start";

/** Equal 2-column grid for contra / bank+remark rows that need only two fields */
export const VOUCHER_ROW_EQUAL_2 =
  "grid grid-cols-1 sm:grid-cols-2 gap-3 items-start";

export const VOUCHER_ROW_BANK = VOUCHER_ROW_EQUAL_3;
export const VOUCHER_ROW_PARTY = VOUCHER_ROW_EQUAL_3;
export const VOUCHER_ROW_PARTY_SHORT = VOUCHER_ROW_EQUAL_3;

export const VOUCHER_ROW_CONTRA_FROM = VOUCHER_ROW_EQUAL_2;
export const VOUCHER_ROW_CONTRA_TO = VOUCHER_ROW_EQUAL_2;

export const VOUCHER_FIELD_GAP = "gap-2";

/** Bordered equal-column details table */
export function VoucherDetailsTable({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border overflow-hidden w-full bg-white divide-y divide-border/60",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function VoucherDetailsTableRow({
  children,
  className,
  columns = 3,
}: {
  children: React.ReactNode;
  className?: string;
  columns?: 1 | 2 | 3 | 4;
}) {
  return (
    <div
      className={cn(
        columns === 1
          ? "grid grid-cols-1 gap-3 items-start"
          : columns === 2
            ? VOUCHER_ROW_EQUAL_2
            : columns === 4
              ? VOUCHER_ROW_EQUAL_4
              : VOUCHER_ROW_EQUAL_3,
        "px-3 py-2.5",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Full-width band inside VoucherDetailsTable (party ledger, bank row, etc.) */
export function VoucherDetailsTableBand({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("px-3 py-2.5", className)}>{children}</div>;
}

export function resolveVoucherFormId(voucherId?: number): number | null {
  if (voucherId == null) return null;
  if (!Number.isFinite(voucherId) || voucherId <= 0) return null;
  return voucherId;
}

export function VoucherFormField({
  label,
  required,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1 min-w-0", className)}>
      <Label className={VOUCHER_LABEL_CLASS}>
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

export function VoucherFormSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-2 w-full", className)}>
      <h2 className={VOUCHER_SECTION_TITLE}>{title}</h2>
      {children}
    </section>
  );
}

export function VoucherTransactionPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("space-y-2 w-full", className)}>{children}</div>;
}

export function VoucherEntryTable({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("space-y-2 w-full", className)}>{children}</div>;
}

export function VoucherEntryTableRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("w-full", className)}>{children}</div>;
}

export function VoucherEntryRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "bank" | "ledger";
}) {
  return <div className={cn(className)}>{children}</div>;
}

/** Ledger balance from actual postings as of voucher date — Dr/Cr only when amount > 0 */
export function VoucherLedgerCurBalance({
  ledger,
  asOfDate,
  className,
}: {
  ledger: ChartOfAccount | null;
  /** Voucher date (YYYY-MM-DD) — balance includes movements on or before this date */
  asOfDate?: string | null;
  variant?: "header" | "inline";
  className?: string;
}) {
  if (!ledger) return null;

  const bal = computeLedgerBalanceAsOfDate(ledger, asOfDate || null);

  if (bal.amount < 0.005) {
    return (
      <p className={cn(VOUCHER_BALANCE_TEXT, className)}>
        Current Balance: {formatMoney(0)}
      </p>
    );
  }

  return (
    <p className={cn(VOUCHER_BALANCE_TEXT, className)}>
      Current Balance: {formatMoney(bal.amount)} {balanceSideLabel(bal.balanceType)}
    </p>
  );
}

export function VoucherSelectContent({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof SelectContent>) {
  return (
    <SelectContent
      className={cn("max-h-[260px] overflow-y-auto text-[13px]", className)}
      {...props}
    >
      {children}
    </SelectContent>
  );
}

export function VoucherFormSummary({
  totalAmount,
  className,
}: {
  totalAmount: number;
  className?: string;
}) {
  return (
    <div className={cn("flex justify-end pt-1 border-t border-border/50 w-full", className)}>
      <div className="flex items-baseline gap-2">
        <span className={VOUCHER_TOTAL_LABEL_CLASS}>Total Amount</span>
        <span className={VOUCHER_TOTAL_AMOUNT_CLASS}>
          {totalAmount > 0 ? formatMoney(totalAmount) : "—"}
        </span>
      </div>
    </div>
  );
}

export function VoucherNotFoundMessage({ message }: { message: string }) {
  return (
    <div className={cn(VOUCHER_FORM_OUTER)}>
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 max-w-[400px]">
        {message}
      </div>
    </div>
  );
}

export const VOUCHER_DATE_WIDTH = VOUCHER_FIELD_DATE;
export const VOUCHER_BODY_STACK = VOUCHER_FIELD_LEDGER;
export const VOUCHER_SIMPLE_FORM_WIDTH = VOUCHER_FORM_OUTER;
export const VOUCHER_SIMPLE_LABEL_CLASS = VOUCHER_LABEL_CLASS;
export const VOUCHER_SIMPLE_INPUT_CLASS = VOUCHER_INPUT_CLASS;
export const VOUCHER_SIMPLE_FIELD_MAX = "min-w-0";
export const VOUCHER_SIMPLE_AMOUNT_MAX = VOUCHER_AMOUNT_WIDTH;
export const VOUCHER_SIMPLE_SECTION_CLASS = VOUCHER_SECTION_TITLE;

export function VoucherSimpleFormCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(VOUCHER_FORM_OUTER, className)}>
      <div className={VOUCHER_FORM_CARD}>{children}</div>
    </div>
  );
}
