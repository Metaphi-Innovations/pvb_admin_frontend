import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const CustomerAgeingClient = lazyAccountsPage(() => import("./CustomerAgeingClient"));

export default function Page() {
  return <CustomerAgeingClient />;
}
