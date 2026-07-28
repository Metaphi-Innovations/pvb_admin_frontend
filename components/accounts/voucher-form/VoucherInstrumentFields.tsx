"use client";

/**
 * Payment-mode-dependent instrument fields for Payment / Receipt / Contra vouchers.
 * Bank clearing date stays on Bank Reconciliation — not on voucher entry.
 */

import { Input } from "@/components/ui/input";
import {
  VOUCHER_INPUT_CLASS,
  VOUCHER_PREVIEW_TEXT_CLASS,
  VoucherFormField,
} from "@/components/accounts/voucher-simple-form-ui";
import { cn } from "@/lib/utils";

export type InstrumentFieldKind = "none" | "cheque" | "transfer" | "other";

/** Resolve which instrument fields apply for a transaction mode. */
export function getInstrumentFieldKind(mode: string): InstrumentFieldKind {
  const m = mode.trim().toLowerCase();
  if (!m || m === "cash") return "none";
  if (m === "cheque") return "cheque";
  if (
    m === "bank transfer" ||
    m === "neft" ||
    m === "rtgs" ||
    m === "imps" ||
    m === "upi" ||
    m === "neft/rtgs" ||
    m.includes("neft") ||
    m.includes("rtgs") ||
    m.includes("transfer") ||
    m.includes("deposit") ||
    m.includes("withdrawal")
  ) {
    return "transfer";
  }
  if (m === "other") return "other";
  return "other";
}

export interface VoucherInstrumentValues {
  chequeNumber: string;
  chequeDate: string;
  transactionReference: string;
  transactionDate: string;
}

export interface VoucherInstrumentFieldsProps {
  mode: string;
  values: VoucherInstrumentValues;
  onChange: (patch: Partial<VoucherInstrumentValues>) => void;
  readOnly?: boolean;
  /** Compact field width classes */
  className?: string;
}

export function VoucherInstrumentFields({
  mode,
  values,
  onChange,
  readOnly,
  className,
}: VoucherInstrumentFieldsProps) {
  const kind = getInstrumentFieldKind(mode);
  if (kind === "none") return null;

  const preview = (text: string) => (
    <p className={cn("h-9 flex items-center", VOUCHER_PREVIEW_TEXT_CLASS)}>{text || "—"}</p>
  );

  if (kind === "cheque") {
    return (
      <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-xl", className)}>
        <VoucherFormField label="Cheque Number" required>
          {readOnly ? (
            preview(values.chequeNumber)
          ) : (
            <Input
              className={VOUCHER_INPUT_CLASS}
              value={values.chequeNumber}
              onChange={(e) => onChange({ chequeNumber: e.target.value })}
              placeholder="Cheque number"
            />
          )}
        </VoucherFormField>
        <VoucherFormField label="Cheque Date" required>
          {readOnly ? (
            preview(values.chequeDate)
          ) : (
            <Input
              type="date"
              className={VOUCHER_INPUT_CLASS}
              value={values.chequeDate}
              onChange={(e) => onChange({ chequeDate: e.target.value })}
            />
          )}
        </VoucherFormField>
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-xl", className)}>
      <VoucherFormField
        label={kind === "other" ? "Reference Number" : "Transaction Reference / UTR"}
        required={kind === "transfer"}
      >
        {readOnly ? (
          preview(values.transactionReference)
        ) : (
          <Input
            className={VOUCHER_INPUT_CLASS}
            value={values.transactionReference}
            onChange={(e) => onChange({ transactionReference: e.target.value })}
            placeholder={kind === "other" ? "Reference…" : "UTR / transaction ref…"}
          />
        )}
      </VoucherFormField>
      <VoucherFormField label="Transaction Date">
        {readOnly ? (
          preview(values.transactionDate)
        ) : (
          <Input
            type="date"
            className={VOUCHER_INPUT_CLASS}
            value={values.transactionDate}
            onChange={(e) => onChange({ transactionDate: e.target.value })}
          />
        )}
      </VoucherFormField>
    </div>
  );
}
