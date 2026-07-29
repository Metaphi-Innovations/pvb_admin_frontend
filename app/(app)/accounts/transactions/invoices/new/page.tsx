import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const InvoiceCreatePageClient = lazyAccountsPage(() => import("../../../invoices/InvoiceCreatePageClient"));

export default function NewSalesInvoicePage() {
  return <InvoiceCreatePageClient />;
}
