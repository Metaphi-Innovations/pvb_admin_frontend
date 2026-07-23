"use client";

import { Label } from "@/components/ui/label";
import { SelectContent } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/accounts/money-format";

export const VOUCHER_FORM_OUTER = "w-full";

export const VOUCHER_FORM_CARD =
  "rounded-lg border border-border bg-white shadow-sm p-3 space-y-2.5 w-full";

/**
 * Receipt tokens — aligned to Accounts UI standard (no cream dialect).
 * Kept as aliases so existing Receipt imports keep working.
 */
export const RECEIPT_VOUCHER_PAGE_WRAP = "w-full space-y-2";

export const RECEIPT_VOUCHER_FORM_CARD =
  "rounded-xl border border-border bg-white shadow-sm overflow-hidden w-full";

export const RECEIPT_SECTION_HEADER =
  "bg-muted/40 border-b border-border px-4 py-2";

export const RECEIPT_SECTION_TITLE = "accounts-card-title text-navy-700";

export const RECEIPT_SECTION_BODY = "px-4 py-3";

export const RECEIPT_TOTAL_SECTION =
  "flex justify-end items-baseline gap-3 px-3 py-2 border-t border-border bg-white";

export const RECEIPT_TOTAL_LABEL = "text-xs font-medium text-muted-foreground";

export const RECEIPT_TOTAL_AMOUNT = "text-sm font-semibold tabular-nums text-foreground";

export const RECEIPT_LABEL_CLASS = "accounts-form-label";

export const RECEIPT_INPUT_CLASS =
  "h-8 min-h-8 max-h-8 w-full min-w-0 text-[13px] accounts-form-input rounded-md border border-border bg-white px-2 focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:border-brand-400";

export const RECEIPT_MONEY_INPUT_CLASS = "text-[13px] text-right tabular-nums";

export const RECEIPT_PREVIEW_TEXT_CLASS = "text-[13px] text-foreground leading-snug";

export const RECEIPT_BUTTON_CLASS = "h-8 min-h-8 text-xs accounts-action-button";

export const RECEIPT_FIELD_DATE = "w-[136px]";
export const RECEIPT_FIELD_NUMBER = "w-[136px]";
export const RECEIPT_FIELD_REFERENCE = "w-[190px]";
export const RECEIPT_FIELD_MODE = "w-[170px]";

export const RECEIPT_ROW_GAP = "gap-2.5";

export const RECEIPT_LEDGER_SELECT = {
  compact: true,
  listMaxHeight: 220,
  className: "h-8 text-[13px]",
} as const;

export const RECEIPT_NARRATION_INPUT =
  "min-h-[64px] max-h-28 h-auto py-2 resize-y text-[13px]";

/** Prefer shared Accounts tokens; kept for voucher form imports */
export const VOUCHER_PAGE_TITLE_CLASS = "accounts-page-title";

export const VOUCHER_PAGE_SUBTITLE_CLASS = "accounts-page-subtitle";

export const VOUCHER_SECTION_TITLE =
  "accounts-section-heading pb-1 border-b border-border/60";

export const VOUCHER_LABEL_CLASS = "accounts-form-label";

/** 32px — Accounts UI standard (docs/accounts-ui-standard.md) */
export const VOUCHER_INPUT_CLASS =
  "h-8 min-h-8 max-h-8 w-full min-w-0 accounts-form-input rounded-md border border-border bg-white px-2 focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:border-brand-400";

export const VOUCHER_MONEY_INPUT_CLASS = "text-[13px] text-right tabular-nums";

export const VOUCHER_BUTTON_CLASS = "h-8 min-h-8 accounts-action-button";

export const VOUCHER_BODY_TEXT = "text-[13px] text-foreground leading-snug";

export const VOUCHER_MUTED_TEXT = "text-xs text-muted-foreground leading-snug";

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
  labelClassName,
  spacingClassName = "space-y-1",
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  labelClassName?: string;
  spacingClassName?: string;
}) {
  return (
    <div className={cn(spacingClassName, "min-w-0", className)}>
      {label ? (
        <Label className={cn(VOUCHER_LABEL_CLASS, labelClassName)}>
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </Label>
      ) : null}
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

/** Receipt voucher section — light cream header band with bottom border */
export function ReceiptFormSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-b border-border/60 last:border-b-0 w-full", className)}>
      <div className={RECEIPT_SECTION_HEADER}>
        <h2 className={RECEIPT_SECTION_TITLE}>{title}</h2>
      </div>
      <div className={RECEIPT_SECTION_BODY}>{children}</div>
    </section>
  );
}

export function ReceiptFormTotal({
  totalAmount,
  className,
}: {
  totalAmount: number;
  className?: string;
}) {
  return (
    <div className={cn(RECEIPT_TOTAL_SECTION, className)}>
      <span className={RECEIPT_TOTAL_LABEL}>Total Amount</span>
      <span className={RECEIPT_TOTAL_AMOUNT}>
        {totalAmount > 0 ? formatMoney(totalAmount) : "—"}
      </span>
    </div>
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
