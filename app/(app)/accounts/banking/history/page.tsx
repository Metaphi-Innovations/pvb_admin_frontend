import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { ReconciliationHistoryClient } from "@/components/accounts/ReconciliationHistoryClient";

export default function ReconciliationHistoryPage() {
  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Banking", "Reconciliation History")}
      title="Reconciliation History"
      description="Audit trail of categorized and reconciled bank transactions"
      hideDescription
      layout="split"
      className="h-full min-h-0"
    >
      <ReconciliationHistoryClient />
    </AccountsPageShell>
  );
}
