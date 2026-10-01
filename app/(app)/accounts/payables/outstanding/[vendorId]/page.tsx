import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const VendorOutstandingDetailClient = lazyAccountsPage(() => import("./VendorOutstandingDetailClient"));

export default function Page() {
  return <VendorOutstandingDetailClient />;
}
