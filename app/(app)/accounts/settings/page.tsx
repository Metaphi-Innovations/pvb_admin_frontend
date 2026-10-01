import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const AccountingSettingsPageClient = lazyAccountsPage(() => import("./AccountingSettingsPageClient"));

export default function Page() {
  return <AccountingSettingsPageClient />;
}
