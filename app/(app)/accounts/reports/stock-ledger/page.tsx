import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const StockLedgerPageClient = lazyAccountsPage(() => import("./StockLedgerPageClient"));

export default function StockLedgerReportPage() {
  return <StockLedgerPageClient />;
}
