import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const BankReconciliationListingPageClient = lazyAccountsPage(() =>
  import("@/app/(app)/accounts/bank-reconciliation/BankReconciliationListingPageClient"),
);

export default function BankReconciliationPage() {
  return <BankReconciliationListingPageClient />;
}
