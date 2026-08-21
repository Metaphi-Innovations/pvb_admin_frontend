"use client";

import { useParams, useRouter } from "next/navigation";
import { ReceiptVoucherApiForm } from "../ReceiptVoucherApiForm";
import { receiptEditPath } from "../receipt-voucher-utils";

export default function ReceiptVoucherViewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  return (
    <ReceiptVoucherApiForm
      voucherId={id}
      readOnly
      onDone={() => router.push("/accounts/vouchers?tab=receipt")}
      onEdit={() => router.push(receiptEditPath(id))}
    />
  );
}
