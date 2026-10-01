import { redirect } from "next/navigation";

export default function LegacyPurchaseReturnDetailRedirect({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/procurement/purchase-orders/returns/${params.id}`);
}
