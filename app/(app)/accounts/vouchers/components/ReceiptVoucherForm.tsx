"use client";

import { VoucherDualEntryForm } from "@/components/accounts/VoucherDualEntryForm";

interface ReceiptVoucherFormProps {
  onDone?: () => void;
  voucherId?: number;
  readOnly?: boolean;
  onEdit?: () => void;
}

export function ReceiptVoucherForm({
  onDone,
  voucherId,
  readOnly = false,
  onEdit,
}: ReceiptVoucherFormProps) {
  const cancelHref = voucherId
    ? `/accounts/vouchers/view/${voucherId}`
    : "/accounts/vouchers?tab=receipt";

  return (
    <VoucherDualEntryForm
      voucherType="receipt"
      cancelHref={cancelHref}
      voucherId={voucherId}
      readOnly={readOnly}
      onEdit={onEdit}
      onDone={() => onDone?.()}
    />
  );
}
