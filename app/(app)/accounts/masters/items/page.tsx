import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const AccountItemsPageClient = lazyAccountsPage(() => import("./AccountItemsPageClient"));

export default function AccountItemsPage() {
  return <AccountItemsPageClient />;
}
