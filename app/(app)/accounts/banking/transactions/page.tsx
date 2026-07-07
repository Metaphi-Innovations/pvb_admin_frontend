import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { BankTransactionsClient } from "@/components/accounts/BankTransactionsClient";

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
