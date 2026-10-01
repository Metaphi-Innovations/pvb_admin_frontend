import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const ServiceInvoiceFormPageClient = lazyAccountsPage(
  () => import("../../../invoices/ServiceInvoiceFormPageClient"),
);

export default function NewServiceInvoicePage() {
  return <ServiceInvoiceFormPageClient />;
}
