import { redirect } from "next/navigation";

/** Import history is hidden in the manual Bank Reconciliation client phase. */
export default function BankReconImportHistoryPage() {
  redirect("/accounts/banking/reconciliation");
}
