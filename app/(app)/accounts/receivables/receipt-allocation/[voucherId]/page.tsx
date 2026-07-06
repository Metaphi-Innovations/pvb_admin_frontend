import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const AllocateReceiptClient = lazyAccountsPage(() => import("./AllocateReceiptClient"));

export default function Page() {
  return <AllocateReceiptClient />;
}
