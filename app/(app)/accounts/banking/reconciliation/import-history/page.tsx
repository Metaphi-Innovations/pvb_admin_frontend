import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const BankReconImportHistoryPageClient = lazyAccountsPage(() =>
  import("@/app/(app)/accounts/bank-reconciliation/import-history/BankReconImportHistoryPageClient"),
);

export default function BankReconImportHistoryPage() {
  return <BankReconImportHistoryPageClient />;
}
