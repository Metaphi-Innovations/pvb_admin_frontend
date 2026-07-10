"use client";

import { useMemo } from "react";
import { SimpleCashVoucherForm } from "@/components/accounts/SimpleCashVoucherForm";
import { SimpleContraVoucherForm } from "@/components/accounts/SimpleContraVoucherForm";
import { useClientMounted } from "@/lib/use-client-mounted";
import { VOUCHER_FORM_OUTER } from "@/components/accounts/voucher-simple-form-ui";

export type DualEntryVoucherType = "receipt" | "payment" | "contra";

interface VoucherDualEntryFormProps {
  voucherType: DualEntryVoucherType;
  cancelHref: string;
  onDone: () => void;
  voucherId?: number;
  readOnly?: boolean;
  onEdit?: () => void;
  breadcrumbSection?: string;
}

/**
 * Receipt, payment and contra always use the compact single-transaction form.
 * Journal keeps the multi-row debit/credit grid (separate route).
 */
export function VoucherDualEntryForm({
  voucherType,
  cancelHref,
  onDone,
  voucherId,
  readOnly = false,
  onEdit,
}: VoucherDualEntryFormProps) {
  const mounted = useClientMounted();

  if (!mounted) {
    return (
      <div
        className={`${VOUCHER_FORM_OUTER} border border-border rounded-xl bg-muted/10 h-48 animate-pulse my-4`}
      />
    );
  }

  if (voucherType === "contra") {
    return (
      <SimpleContraVoucherForm
        key={`contra-${voucherId ?? "new"}`}
        cancelHref={cancelHref}
        onDone={onDone}
        voucherId={voucherId}
        readOnly={readOnly}
        onEdit={onEdit}
      />
    );
  }

  return (
    <SimpleCashVoucherForm
      key={`${voucherType}-${voucherId ?? "new"}`}
      mode={voucherType}
      cancelHref={cancelHref}
      onDone={onDone}
      voucherId={voucherId}
      readOnly={readOnly}
      onEdit={onEdit}
    />
  );
}
