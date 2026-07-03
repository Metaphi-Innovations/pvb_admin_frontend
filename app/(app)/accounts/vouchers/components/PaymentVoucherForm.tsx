"use client";

import { VoucherEntryClient } from "./VoucherEntryClient";

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
  return (
    <VoucherEntryClient
      voucherType="payment"
      voucherId={voucherId}
      readOnly={readOnly}
      onEdit={onEdit}
      onDone={() => onDone?.()}
    />
  );
}
