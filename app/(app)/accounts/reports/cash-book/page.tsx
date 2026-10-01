import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const CashBookPageClient = lazyAccountsPage(() => import("./CashBookPageClient"));

export default function CashBookPage() {
  return <CashBookPageClient />;
}
