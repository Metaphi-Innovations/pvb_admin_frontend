import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const StockRegisterPageClient = lazyAccountsPage(() => import("./StockRegisterPageClient"));

export default function StockRegisterPage() {
  return <StockRegisterPageClient />;
}
