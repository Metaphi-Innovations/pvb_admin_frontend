"use client";

import PaymentFormPageClient from "./PaymentFormPageClient";

export default function PaymentEditPageClient({ paymentId }: { paymentId: number }) {
  return <PaymentFormPageClient paymentId={paymentId} />;
}
