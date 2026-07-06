import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const PaymentViewPageClient = lazyAccountsPage(() => import("../../../payments/PaymentViewPageClient"));

type PageProps = { params: { id: string } };

export default function PaymentViewPage({ params }: PageProps) {
  return <PaymentViewPageClient paymentId={Number(params.id)} />;
}
