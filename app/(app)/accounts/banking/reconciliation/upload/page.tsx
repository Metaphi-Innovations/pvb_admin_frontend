import { Suspense } from "react";
import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const BankStatementUploadPageClient = lazyAccountsPage(() =>
  import("@/app/(app)/accounts/bank-reconciliation/upload/BankStatementUploadPageClient"),
);

export default function BankStatementUploadPage() {
  return (
    <Suspense fallback={null}>
      <BankStatementUploadPageClient />
    </Suspense>
  );
}
