import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const ChartOfAccountsPageClient = lazyAccountsPage(() => import("./ChartOfAccountsPageClient"));

export default function ChartOfAccountsPage() {
  return <ChartOfAccountsPageClient />;
}
