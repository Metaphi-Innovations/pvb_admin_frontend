import { redirect } from "next/navigation";
import { RECONCILIATION_LIST_PATH } from "@/app/(app)/accounts/bank-reconciliation/reconciliation-utils";

interface PageProps {
  params: Promise<{ statementId: string }>;
}

export default async function LegacyReconciliationDetailRedirect({ params }: PageProps) {
  const { statementId } = await params;
  redirect(`${RECONCILIATION_LIST_PATH}/${statementId}`);
}
