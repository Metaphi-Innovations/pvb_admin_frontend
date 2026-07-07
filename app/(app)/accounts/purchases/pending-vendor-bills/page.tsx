import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const PendingVendorBillsClient = lazyAccountsPage(() => import("./PendingVendorBillsClient"));

export default function PendingVendorBillsPage() {
  return <PendingVendorBillsClient />;
}
