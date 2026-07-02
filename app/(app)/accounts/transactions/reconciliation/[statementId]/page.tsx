import { redirect } from "next/navigation";
import { RECONCILIATION_LIST_PATH } from "@/app/(app)/accounts/bank-reconciliation/reconciliation-utils";

interface PageProps {
  params: { statementId: string };
}

export default function LegacyReconciliationDetailRedirect({ params }: PageProps) {
  const { statementId } = params;
  redirect(`${RECONCILIATION_LIST_PATH}/${statementId}`);
}
