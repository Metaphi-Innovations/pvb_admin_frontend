import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const StockValuationPageClient = lazyAccountsPage(() => import("./StockValuationPageClient"));

export default function StockValuationReportPage() {
  return <StockValuationPageClient />;
}
