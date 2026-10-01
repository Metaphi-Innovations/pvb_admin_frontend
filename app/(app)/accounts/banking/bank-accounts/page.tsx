import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const BankAccountsPageClient = lazyAccountsPage(() => import("./BankAccountsPageClient"));

export default function BankingBankAccountsPage() {
  return <BankAccountsPageClient />;
}
