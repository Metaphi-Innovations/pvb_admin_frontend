import ReconciliationEntriesPageClient from "@/app/(app)/accounts/bank-reconciliation/ReconciliationEntriesPageClient";

interface PageProps {
  params: { statementId: string };
}

export default function BankReconciliationEntriesPage({ params }: PageProps) {
  const { statementId } = params;
  const id = Number(statementId);
  return <ReconciliationEntriesPageClient statementId={id} embedded />;
}
