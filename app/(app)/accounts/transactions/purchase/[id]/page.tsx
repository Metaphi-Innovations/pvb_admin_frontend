import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const PurchaseViewPageClient = lazyAccountsPage(() => import("../../../purchase/PurchaseViewPageClient"));

type PageProps = { params: { id: string } };

export default function PurchaseViewPage({ params }: PageProps) {
  return <PurchaseViewPageClient purchaseId={Number(params.id)} />;
}
