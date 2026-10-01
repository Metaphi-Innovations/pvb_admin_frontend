import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const InvoiceOutstandingDetailClient = lazyAccountsPage(() => import("./InvoiceOutstandingDetailClient"));

export default function Page() {
  return <InvoiceOutstandingDetailClient />;
}
