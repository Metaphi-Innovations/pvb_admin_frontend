import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const ReconciliationEntriesPageClient = lazyAccountsPage(() =>
  import("@/app/(app)/accounts/bank-reconciliation/ReconciliationEntriesPageClient"),
);

interface PageProps {
  params: { statementId: string };
}

export default function BankReconciliationEntriesPage({ params }: PageProps) {
  return (
    <ReconciliationEntriesPageClient
      statementId={Number(params.statementId)}
      embedded
    />
  );
}
