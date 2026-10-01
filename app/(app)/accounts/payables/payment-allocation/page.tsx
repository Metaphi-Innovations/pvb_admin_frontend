import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const PaymentAllocationClient = lazyAccountsPage(() => import("./PaymentAllocationClient"));

export default function Page() {
  return <PaymentAllocationClient />;
}
