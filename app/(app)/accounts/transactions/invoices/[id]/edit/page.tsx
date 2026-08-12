import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const InvoiceEditPageClient = lazyAccountsPage(() => import("../../../../invoices/InvoiceEditPageClient"));

type PageProps = { params: { id: string } };

export default function EditSalesInvoicePage({ params }: PageProps) {
  // Prefer string id so UUID-backed invoices can load from the API.
  return <InvoiceEditPageClient invoiceId={params.id} />;
}
