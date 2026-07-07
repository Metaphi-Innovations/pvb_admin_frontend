import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const CustomerLedgerPageClient = lazyAccountsPage(() => import("./CustomerLedgerPageClient"));

export default function CustomerLedgerReportPage() {
  return <CustomerLedgerPageClient />;
}
