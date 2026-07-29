import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const CustomerOutstandingClient = lazyAccountsPage(() => import("./CustomerOutstandingClient"));

export default function Page() {
  return <CustomerOutstandingClient />;
}
