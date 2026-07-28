import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const B2bInvoicesPageClient = lazyAccountsPage(
  () => import("./B2bInvoicesPageClient"),
);

export default function B2bInvoicesPage() {
  return <B2bInvoicesPageClient />;
}
