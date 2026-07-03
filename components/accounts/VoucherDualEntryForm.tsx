"use client";

import { useMemo } from "react";
import { SimpleCashVoucherForm } from "@/components/accounts/SimpleCashVoucherForm";
import { SimpleContraVoucherForm } from "@/components/accounts/SimpleContraVoucherForm";
import { ZohoVoucherEntryForm } from "@/components/accounts/ZohoVoucherEntryForm";
import {
  getVoucherById,
  inferVoucherEntryMode,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import { useClientMounted } from "@/lib/use-client-mounted";

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
 * Receipt, payment and contra use a single simple form that posts double-entry lines in the background.
 * Legacy multi-line vouchers (created in old double-entry UI) still open in the line editor for view/edit.
 */
export function VoucherDualEntryForm({
  voucherType,
  cancelHref,
  onDone,
  voucherId,
  readOnly = false,
  onEdit,
  breadcrumbSection = "Transactions",
}: VoucherDualEntryFormProps) {
  const mounted = useClientMounted();
  const existing = useMemo(
    () => (mounted && voucherId != null ? getVoucherById(voucherId) : undefined),
    [mounted, voucherId],
  );

  const useLegacyDoubleForm = useMemo(() => {
    if (!existing) return false;
    return inferVoucherEntryMode(existing) === "double";
  }, [existing]);

  if (!mounted) {
    return (
      <div className="border border-border rounded-xl bg-muted/10 h-56 animate-pulse mx-5 my-4" />
    );
  }

  if (useLegacyDoubleForm) {
    return (
      <ZohoVoucherEntryForm
        key={`legacy-${voucherType}-${voucherId ?? "new"}`}
        voucherType={voucherType}
        cancelHref={cancelHref}
        voucherId={voucherId}
        onDone={onDone}
        readOnly={readOnly}
        onEdit={onEdit}
        breadcrumbSection={breadcrumbSection}
        showFinancialYear={voucherType !== "receipt" && voucherType !== "payment"}
        strictPostValidation
        entryMode="double"
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
      fullWidth
      flexibleEntry
    />
  );
}
