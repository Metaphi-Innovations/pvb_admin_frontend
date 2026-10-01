import { redirect } from "next/navigation";

export default function LegacyPurchaseReturnEditRedirect({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/procurement/purchase-orders/returns/${params.id}/edit`);
}
