import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const PurchaseRegisterPageClient = lazyAccountsPage(() => import("./PurchaseRegisterPageClient"));

export default function PurchaseRegisterPage() {
  return <PurchaseRegisterPageClient />;
}
