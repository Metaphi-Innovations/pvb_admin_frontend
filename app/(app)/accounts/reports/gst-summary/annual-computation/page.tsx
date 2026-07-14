import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const AnnualComputationPageClient = lazyAccountsPage(
  () => import("./AnnualComputationPageClient"),
);

export default function AnnualComputationPage() {
  return <AnnualComputationPageClient />;
}
