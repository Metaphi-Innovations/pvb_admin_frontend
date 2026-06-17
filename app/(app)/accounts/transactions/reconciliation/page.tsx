import { redirect } from "next/navigation";
import { RECONCILIATION_LIST_PATH } from "@/app/(app)/accounts/bank-reconciliation/reconciliation-utils";

export default function LegacyReconciliationRedirect() {
  redirect(RECONCILIATION_LIST_PATH);
}
