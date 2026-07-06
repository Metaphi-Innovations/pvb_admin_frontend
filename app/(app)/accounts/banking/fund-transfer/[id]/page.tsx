import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const FundTransferDetailClient = lazyAccountsPage(() => import("../FundTransferDetailClient"));

export default function FundTransferViewPage({
  params,
}: {
  params: { id: string };
}) {
  return <FundTransferDetailClient transferId={Number(params.id)} />;
}
