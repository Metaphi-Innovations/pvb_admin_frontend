import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const PaymentRunsPageClient = lazyAccountsPage(
  () => import("./PaymentRunsPageClient"),
  { label: "Payment Runs", pathnameHint: "/accounts/payables/payment-runs" },
);

export default function PaymentRunsPage() {
  return <PaymentRunsPageClient />;
}
