import PurchaseViewPageClient from "../../../purchase/PurchaseViewPageClient";

type PageProps = { params: { id: string } };

export default function PurchaseViewPage({ params }: PageProps) {
  return <PurchaseViewPageClient purchaseId={Number(params.id)} />;
}
