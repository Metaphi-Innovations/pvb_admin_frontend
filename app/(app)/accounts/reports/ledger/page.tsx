import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const GeneralLedgerPageClient = lazyAccountsPage(() => import("./GeneralLedgerPageClient"));

export default function GeneralLedgerPage() {
  return <GeneralLedgerPageClient />;
}
