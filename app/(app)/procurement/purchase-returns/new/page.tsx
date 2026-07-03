import { redirect } from "next/navigation";

export default function LegacyPurchaseReturnNewRedirect({
  searchParams,
}: {
  searchParams: { poId?: string };
}) {
  const poId = searchParams.poId;
  redirect(
    poId
      ? `/procurement/purchase-orders/returns/new?poId=${poId}`
      : "/procurement/purchase-orders?tab=po_return",
  );
}
