import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const FundTransferPageClient = lazyAccountsPage(() => import("./FundTransferPageClient"));

export default function FundTransferPage() {
  return <FundTransferPageClient />;
}
