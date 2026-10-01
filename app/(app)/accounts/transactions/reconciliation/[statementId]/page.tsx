import { redirect } from "next/navigation";
import { RECONCILIATION_LIST_PATH } from "@/app/(app)/accounts/bank-reconciliation/reconciliation-utils";

interface PageProps {
  params: { statementId: string };
}

/** Legacy redirect — deprecated statement detail route returns to reconciliation listing */
export default function LegacyReconciliationDetailRedirect(_props: PageProps) {
  redirect(RECONCILIATION_LIST_PATH);
}
