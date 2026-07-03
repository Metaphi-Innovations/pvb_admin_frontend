"use client";

import { VoucherEntryClient } from "./VoucherEntryClient";

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
  return (
    <VoucherEntryClient
      voucherType="contra"
      voucherId={voucherId}
      readOnly={readOnly}
      onEdit={onEdit}
      onDone={() => onDone?.()}
      quickAddScope="bank_cash"
    />
  );
}
