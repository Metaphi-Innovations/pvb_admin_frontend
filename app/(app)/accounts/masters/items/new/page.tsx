import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const AccountItemFormClient = lazyAccountsPage(() => import("../AccountItemFormClient"));

export default function NewAccountItemPage() {
  return <AccountItemFormClient />;
}
