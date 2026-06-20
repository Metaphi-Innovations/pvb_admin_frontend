import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { ReconciliationHistoryClient } from "@/components/accounts/ReconciliationHistoryClient";

export default function ReconciliationHistoryPage() {
  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Banking", "Reconciliation History")}
      title=""
      description=""
      layout="standard"
      className="h-full"
    >
      <ReconciliationHistoryClient />
    </AccountsPageShell>
  );
}
