"use client";

import { VoucherDualEntryForm } from "@/components/accounts/VoucherDualEntryForm";

interface PaymentVoucherFormProps {
  onDone?: () => void;
  voucherId?: number;
  readOnly?: boolean;
  onEdit?: () => void;
}

export function PaymentVoucherForm({
  onDone,
  voucherId,
  readOnly = false,
  onEdit,
}: PaymentVoucherFormProps) {
  const cancelHref = voucherId
    ? `/accounts/vouchers/view/${voucherId}`
    : "/accounts/vouchers?tab=payment";

  return (
    <VoucherDualEntryForm
      voucherType="payment"
      cancelHref={cancelHref}
      voucherId={voucherId}
      readOnly={readOnly}
      onEdit={onEdit}
      onDone={() => onDone?.()}
    />
  );
}
