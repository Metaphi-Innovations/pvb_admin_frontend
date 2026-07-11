import { redirect } from "next/navigation";
import {
  RECONCILIATION_LIST_PATH,
  bankReconUploadPath,
} from "@/app/(app)/accounts/bank-reconciliation/reconciliation-utils";

interface PageProps {
  searchParams: { accountId?: string };
}

/** Legacy upload route — redirects to workspace with upload dialog open */
export default function BankStatementUploadPage({ searchParams }: PageProps) {
  const accountId = searchParams.accountId?.trim();
  if (accountId) {
    redirect(bankReconUploadPath(accountId));
  }
  redirect(RECONCILIATION_LIST_PATH);
}
