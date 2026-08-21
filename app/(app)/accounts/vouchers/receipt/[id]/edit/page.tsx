"use client";

import { useParams, useRouter } from "next/navigation";
import { ReceiptVoucherApiForm } from "../../ReceiptVoucherApiForm";
import { receiptViewPath } from "../../receipt-voucher-utils";

export default function ReceiptVoucherEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  return (
    <ReceiptVoucherApiForm
      voucherId={id}
      onDone={() => router.push(receiptViewPath(id))}
    />
  );
}
