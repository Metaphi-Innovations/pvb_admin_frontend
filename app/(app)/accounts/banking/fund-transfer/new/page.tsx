import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const FundTransferFormClient = lazyAccountsPage(() => import("../FundTransferFormClient"));

export default function NewFundTransferPage() {
  return <FundTransferFormClient />;
}
