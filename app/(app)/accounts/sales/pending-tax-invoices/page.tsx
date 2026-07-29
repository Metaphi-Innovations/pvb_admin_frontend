import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const PendingTaxInvoicesClient = lazyAccountsPage(
  () => import("./PendingTaxInvoicesClient"),
  { pathnameHint: "/accounts/sales/pending-tax-invoices" },
);

export default function PendingTaxInvoicesPage() {
  return <PendingTaxInvoicesClient />;
}
