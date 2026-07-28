import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const VendorOutstandingClient = lazyAccountsPage(() => import("./VendorOutstandingClient"));

export default function Page() {
  return <VendorOutstandingClient />;
}
