import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";

const ReconciliationHistoryClient = lazyAccountsPage(() =>
  import("@/components/accounts/ReconciliationHistoryClient").then((m) => ({
    default: m.ReconciliationHistoryClient,
  })),
);

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
