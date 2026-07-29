import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const InvoiceEditPageClient = lazyAccountsPage(() => import("../../../../invoices/InvoiceEditPageClient"));

type PageProps = { params: { id: string } };

export default function EditSalesInvoicePage({ params }: PageProps) {
  return <InvoiceEditPageClient invoiceId={Number(params.id)} />;
}
