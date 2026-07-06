import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const SupplierLedgerPageClient = lazyAccountsPage(() => import("./SupplierLedgerPageClient"));

export default function SupplierLedgerReportPage() {
  return <SupplierLedgerPageClient />;
}
