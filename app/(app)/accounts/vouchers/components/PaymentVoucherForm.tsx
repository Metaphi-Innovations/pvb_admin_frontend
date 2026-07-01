"use client";



import { ZohoVoucherEntryForm } from "@/components/accounts/ZohoVoucherEntryForm";



interface PaymentVoucherFormProps {

  onDone?: () => void;

  voucherId?: number;

}



export function PaymentVoucherForm({ onDone, voucherId }: PaymentVoucherFormProps) {

  const cancelHref = voucherId

    ? `/accounts/vouchers/view/${voucherId}`

    : "/accounts/vouchers?tab=payment";



  return (

    <ZohoVoucherEntryForm

      voucherType="payment"

      cancelHref={cancelHref}

      voucherId={voucherId}

      onDone={() => onDone?.()}

      breadcrumbSection="Transactions"

      showFinancialYear={false}

    />

  );

}

