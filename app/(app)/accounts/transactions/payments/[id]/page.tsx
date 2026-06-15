import PaymentViewPageClient from "../../../payments/PaymentViewPageClient";

type PageProps = { params: { id: string } };

export default function PaymentViewPage({ params }: PageProps) {
  return <PaymentViewPageClient paymentId={Number(params.id)} />;
}
