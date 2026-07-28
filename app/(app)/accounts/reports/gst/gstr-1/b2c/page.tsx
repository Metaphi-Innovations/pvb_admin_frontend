import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const B2cInvoicesPageClient = lazyAccountsPage(
  () => import("./B2cInvoicesPageClient"),
);

export default function B2cInvoicesPage() {
  return <B2cInvoicesPageClient />;
}
