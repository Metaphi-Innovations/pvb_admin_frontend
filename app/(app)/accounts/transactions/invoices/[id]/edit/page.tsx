import InvoiceEditPageClient from "../../../../invoices/InvoiceEditPageClient";

type PageProps = { params: { id: string } };

export default function EditSalesInvoicePage({ params }: PageProps) {
  return <InvoiceEditPageClient invoiceId={Number(params.id)} />;
}
