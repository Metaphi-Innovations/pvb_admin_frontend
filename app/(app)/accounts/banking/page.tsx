import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const BankReconciliationDashboard = lazyAccountsPage(() =>
  import("@/components/accounts/BankReconciliationDashboard").then((m) => ({
    default: m.BankReconciliationDashboard,
  })),
);

export default function BankingPage() {
  return <BankReconciliationDashboard />;
}
