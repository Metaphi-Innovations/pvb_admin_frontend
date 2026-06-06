import ReconciliationEntriesPageClient from "../../../bank-reconciliation/ReconciliationEntriesPageClient";

export default function BankReconciliationEntriesPage({
  params,
}: {
  params: { statementId: string };
}) {
  const id = parseInt(params.statementId, 10);
  return <ReconciliationEntriesPageClient statementId={Number.isFinite(id) ? id : 0} />;
}
