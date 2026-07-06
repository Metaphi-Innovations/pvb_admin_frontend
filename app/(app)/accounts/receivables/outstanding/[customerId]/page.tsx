import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const CustomerOutstandingDetailClient = lazyAccountsPage(() => import("./CustomerOutstandingDetailClient"));

export default function Page() {
  return <CustomerOutstandingDetailClient />;
}
