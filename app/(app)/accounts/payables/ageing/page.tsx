import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const VendorAgeingClient = lazyAccountsPage(() => import("./VendorAgeingClient"));

export default function Page() {
  return <VendorAgeingClient />;
}
