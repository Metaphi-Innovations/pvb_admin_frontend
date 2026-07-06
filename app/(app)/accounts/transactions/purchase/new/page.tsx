import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const PurchaseInvoiceFormClient = lazyAccountsPage(() => import("../PurchaseInvoiceFormClient"));

export default function NewPurchaseInvoicePage() {
  return <PurchaseInvoiceFormClient />;
}
