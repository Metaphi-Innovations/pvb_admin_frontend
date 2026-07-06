import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const HrClaimsAccountsClient = lazyAccountsPage(() => import("./HrClaimsAccountsClient"));

export default function HrClaimsAccountsPage() {
  return <HrClaimsAccountsClient />;
}
