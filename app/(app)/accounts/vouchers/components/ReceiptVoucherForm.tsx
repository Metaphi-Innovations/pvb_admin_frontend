"use client";

import { ZohoVoucherEntryForm } from "@/components/accounts/ZohoVoucherEntryForm";

interface ReceiptVoucherFormProps {
  onDone?: () => void;
}

export function ReceiptVoucherForm({ onDone }: ReceiptVoucherFormProps) {
  return (
    <ZohoVoucherEntryForm
      voucherType="receipt"
      cancelHref="/accounts/vouchers?tab=receipt"
      onDone={() => onDone?.()}
      breadcrumbSection="Transactions"
    />
  );
}
