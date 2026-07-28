import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const PurchaseInvoicesPageClient = lazyAccountsPage(() => import("./PurchaseInvoicesPageClient"));

export default function Page() {
  return <PurchaseInvoicesPageClient />;
}
