import ReconciliationEntriesPageClient from "@/app/(app)/accounts/bank-reconciliation/ReconciliationEntriesPageClient";

interface PageProps {
  params: Promise<{ statementId: string }>;
}

export default async function BankReconciliationEntriesPage({ params }: PageProps) {
  const { statementId } = await params;
  const id = Number(statementId);
  return <ReconciliationEntriesPageClient statementId={id} embedded />;
}
