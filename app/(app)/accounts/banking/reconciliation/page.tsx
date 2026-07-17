import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const BankReconciliationListingPageClient = lazyAccountsPage(
  () => import("@/app/(app)/accounts/bank-reconciliation/BankReconciliationListingPageClient"),
  { label: "Bank Reconciliation", pathnameHint: "/accounts/banking/reconciliation" },
);

export default function BankReconciliationPage() {
  return <BankReconciliationListingPageClient />;
}
