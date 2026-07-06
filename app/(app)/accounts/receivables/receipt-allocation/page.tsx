import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const ReceiptAllocationClient = lazyAccountsPage(() => import("./ReceiptAllocationClient"));

export default function Page() {
  return <ReceiptAllocationClient />;
}
