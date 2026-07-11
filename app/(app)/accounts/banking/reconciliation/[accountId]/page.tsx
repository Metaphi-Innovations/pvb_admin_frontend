import BankReconciliationWorkspacePageClient from "@/app/(app)/accounts/bank-reconciliation/BankReconciliationWorkspacePageClient";

interface PageProps {
  params: { accountId: string };
}

export default function BankReconciliationWorkspacePage({ params }: PageProps) {
  return <BankReconciliationWorkspacePageClient accountId={params.accountId} />;
}
