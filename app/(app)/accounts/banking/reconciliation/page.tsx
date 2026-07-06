import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const ManualBankReconciliationPageClient = lazyAccountsPage(() =>
  import("@/app/(app)/accounts/bank-reconciliation/ManualBankReconciliationPageClient"),
);

export default function BankReconciliationPage() {
  return <ManualBankReconciliationPageClient />;
}
