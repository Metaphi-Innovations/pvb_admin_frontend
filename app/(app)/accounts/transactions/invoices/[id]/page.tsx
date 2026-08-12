import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const InvoiceViewPageClient = lazyAccountsPage(() => import("../../../invoices/InvoiceViewPageClient"));

type PageProps = { params: { id: string } };

export default function InvoiceViewPage({ params }: PageProps) {
  // Sales invoice IDs are UUIDs from the API — do not coerce with Number().
  return <InvoiceViewPageClient invoiceId={params.id} />;
}
