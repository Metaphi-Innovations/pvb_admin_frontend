import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const SalesRegisterPageClient = lazyAccountsPage(() => import("./SalesRegisterPageClient"));

export default function SalesRegisterPage() {
  return <SalesRegisterPageClient />;
}
