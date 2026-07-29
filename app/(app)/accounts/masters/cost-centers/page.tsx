import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const CostCentersPageClient = lazyAccountsPage(() => import("./CostCentersPageClient"));

export default function Page() {
  return <CostCentersPageClient />;
}
