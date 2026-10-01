import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const InvoiceViewPageClient = lazyAccountsPage(() => import("../../../invoices/InvoiceViewPageClient"));

type PageProps = { params: { id: string } };

export default function InvoiceViewPage({ params }: PageProps) {
  return <InvoiceViewPageClient invoiceId={Number(params.id)} />;
}
