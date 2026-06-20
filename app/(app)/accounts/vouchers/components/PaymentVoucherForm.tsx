"use client";

import { ZohoVoucherEntryForm } from "@/components/accounts/ZohoVoucherEntryForm";

interface PaymentVoucherFormProps {
  onDone?: () => void;
}

export function PaymentVoucherForm({ onDone }: PaymentVoucherFormProps) {
  return (
    <ZohoVoucherEntryForm
      voucherType="payment"
      cancelHref="/accounts/vouchers?tab=payment"
      onDone={() => onDone?.()}
      breadcrumbSection="Transactions"
    />
  );
}
