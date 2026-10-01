import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const SalesInvoicesPageClient = lazyAccountsPage(() => import("./SalesInvoicesPageClient"));

export default function Page() {
  return <SalesInvoicesPageClient />;
}
