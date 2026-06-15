import InvoiceViewPageClient from "../../../invoices/InvoiceViewPageClient";

type PageProps = { params: { id: string } };

export default function InvoiceViewPage({ params }: PageProps) {
  return <InvoiceViewPageClient invoiceId={Number(params.id)} />;
}
