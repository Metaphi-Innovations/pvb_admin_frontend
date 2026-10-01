import { redirect } from "next/navigation";

interface PageProps {
  params: { voucherId: string };
}

/** Per-voucher allocation lives on the Receipt Voucher view (Adjust Allocation). */
export default function AllocateReceiptRedirectPage({ params }: PageProps) {
  const id = Number(params.voucherId);
  if (Number.isFinite(id) && id > 0) {
    redirect(`/accounts/vouchers/view/${id}`);
  }
  redirect("/accounts/vouchers?tab=receipt");
}
