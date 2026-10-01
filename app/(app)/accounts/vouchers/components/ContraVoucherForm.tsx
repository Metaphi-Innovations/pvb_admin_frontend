"use client";

import { VoucherDualEntryForm } from "@/components/accounts/VoucherDualEntryForm";

interface ContraVoucherFormProps {
  onDone?: () => void;
  voucherId?: number;
  readOnly?: boolean;
  onEdit?: () => void;
}

export function ContraVoucherForm({
  onDone,
  voucherId,
  readOnly = false,
  onEdit,
}: ContraVoucherFormProps) {
  const cancelHref = voucherId
    ? `/accounts/vouchers/view/${voucherId}`
    : "/accounts/vouchers?tab=contra";

  return (
    <VoucherDualEntryForm
      voucherType="contra"
      cancelHref={cancelHref}
      voucherId={voucherId}
      readOnly={readOnly}
      onEdit={onEdit}
      onDone={() => onDone?.()}
    />
  );
}
