"use client";



import { ZohoVoucherEntryForm } from "@/components/accounts/ZohoVoucherEntryForm";



interface ReceiptVoucherFormProps {

  onDone?: () => void;

  voucherId?: number;

}



export function ReceiptVoucherForm({ onDone, voucherId }: ReceiptVoucherFormProps) {

  const cancelHref = voucherId

    ? `/accounts/vouchers/view/${voucherId}`

    : "/accounts/vouchers?tab=receipt";



  return (

    <ZohoVoucherEntryForm

      voucherType="receipt"

      cancelHref={cancelHref}

      voucherId={voucherId}

      onDone={() => onDone?.()}

      breadcrumbSection="Transactions"

      showFinancialYear={false}

    />

  );

}

