"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ACCOUNTS_FORM_LABEL_CLASS } from "@/lib/accounts/accounts-typography";

export interface VoucherNoteFieldGridProps {
  children: React.ReactNode;
  /** 3 = default compact; 4 for denser party/reference rows. */
  columns?: 3 | 4;
  className?: string;
}

/** Compact multi-column field grid for Credit/Debit Note document sections. */
export function VoucherNoteFieldGrid({
  children,
  columns = 3,
  className,
}: VoucherNoteFieldGridProps) {
  return (
    <div
      className={cn(
        "cdn-field-grid grid gap-x-3 gap-y-2",
        columns === 4
          ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
          : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

export type VoucherNoteFieldWidth = "xs" | "sm" | "md" | "lg" | "ref" | "full";

export interface VoucherNoteFieldProps {
  label: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  span?: 1 | 2;
  /** Content-fit width token (Credit/Debit Note density). */
  width?: VoucherNoteFieldWidth;
}

const WIDTH_CLASS: Record<VoucherNoteFieldWidth, string> = {
  xs: "cdn-w-xs",
  sm: "cdn-w-sm",
  md: "cdn-w-md",
  lg: "cdn-w-lg",
  ref: "cdn-w-ref",
  full: "w-full max-w-none",
};

export function VoucherNoteField({
  label,
  htmlFor,
  required,
  children,
  className,
  span = 1,
  width = "full",
}: VoucherNoteFieldProps) {
  return (
    <div
      className={cn(
        "space-y-1 min-w-0",
        span === 2 && "sm:col-span-2",
        className,
      )}
    >
      <Label
        htmlFor={htmlFor}
        className={cn(
          ACCOUNTS_FORM_LABEL_CLASS,
          "inline-flex items-center gap-1 text-muted-foreground font-medium",
        )}
      >
        {label}
        {required ? <span className="text-red-500 font-normal">*</span> : null}
      </Label>
      <div className={cn(WIDTH_CLASS[width])}>{children}</div>
    </div>
  );
}

export function VoucherNoteReadOnly({
  children,
  mono,
  className,
}: {
  children: React.ReactNode;
  mono?: boolean;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "voucher-note-readonly cdn-readonly text-[12px] font-normal text-foreground leading-snug truncate",
        mono && "cdn-readonly--mono font-mono text-[11px] font-medium",
        className,
      )}
      title={typeof children === "string" ? children : undefined}
    >
      {children}
    </p>
  );
}
