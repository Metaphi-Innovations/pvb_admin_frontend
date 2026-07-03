"use client";

import { VoucherEntryClient } from "./VoucherEntryClient";

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
  return (
    <VoucherEntryClient
      voucherType="receipt"
      voucherId={voucherId}
      readOnly={readOnly}
      onEdit={onEdit}
      onDone={() => onDone?.()}
    />
  );
}
