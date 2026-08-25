"use client";

import { useParams, useRouter } from "next/navigation";
import { PaymentVoucherApiForm } from "../../PaymentVoucherApiForm";
import { paymentViewPath } from "../../payment-voucher-utils";

export default function PaymentVoucherEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  return (
    <PaymentVoucherApiForm
      voucherId={id}
      onDone={() => router.push(paymentViewPath(id))}
    />
  );
}
