"use client";

import { useParams, useRouter } from "next/navigation";
import { PaymentVoucherApiForm } from "../PaymentVoucherApiForm";
import { paymentEditPath } from "../payment-voucher-utils";

export default function PaymentVoucherViewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  return (
    <PaymentVoucherApiForm
      voucherId={id}
      readOnly
      onDone={() => router.push("/accounts/vouchers?tab=payment")}
      onEdit={() => router.push(paymentEditPath(id))}
    />
  );
}
