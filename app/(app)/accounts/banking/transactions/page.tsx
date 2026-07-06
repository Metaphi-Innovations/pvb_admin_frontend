import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";

const BankTransactionsClient = lazyAccountsPage(() =>
  import("@/components/accounts/BankTransactionsClient").then((m) => ({
    default: m.BankTransactionsClient,
  })),
);

export default function BankTransactionsPage() {
  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Banking", "Transactions")}
      title="Bank Transactions"
      description="Categorize and reconcile bank transactions"
      hideDescription
      layout="split"
      className="h-full min-h-0"
    >
      <BankTransactionsClient />
    </AccountsPageShell>
  );
}
