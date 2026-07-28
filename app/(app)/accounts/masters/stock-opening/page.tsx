import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const StockOpeningPageClient = lazyAccountsPage(() => import("./StockOpeningPageClient"));

export default function StockOpeningPage() {
  return <StockOpeningPageClient />;
}
