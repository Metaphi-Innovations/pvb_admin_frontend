import { redirect } from "next/navigation";

/** Statement upload is hidden in the manual Bank Reconciliation client phase. */
export default function BankStatementUploadPage() {
  redirect("/accounts/banking/reconciliation");
}
