"use client";

import { type ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  VOUCHER_INPUT_CLASS,
  VOUCHER_LABEL_CLASS,
} from "@/components/accounts/voucher-simple-form-ui";

export const INVOICE_DETAIL_INPUT_CLASS = cn(VOUCHER_INPUT_CLASS, "text-xs");
export const INVOICE_DETAIL_SELECT_CLASS = cn(
  VOUCHER_INPUT_CLASS,
  "so-invoice-select-trigger text-xs",
);

export function InvoiceTableReadonly({
  value,
  muted,
  strong,
}: {
  value: string;
  muted?: boolean;
  strong?: boolean;
}) {
  return (
    <div
      className={cn(
        "so-table-ro so-table-ro--right",
        muted && "so-table-ro--muted",
        strong && "so-table-ro--strong",
      )}
    >
      {value}
    </div>
  );
}

export function InvoiceDetailField({
  label,
  required,
  labelExtra,
  children,
}: {
  label: string;
  required?: boolean;
  labelExtra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="so-invoice-detail-field min-w-0">
      <div className="so-invoice-detail-label">
        <Label className={VOUCHER_LABEL_CLASS}>
          {label}
          {required ? <span className="text-red-500 ml-0.5">*</span> : null}
        </Label>
        {labelExtra}
      </div>
      {children}
    </div>
  );
}
