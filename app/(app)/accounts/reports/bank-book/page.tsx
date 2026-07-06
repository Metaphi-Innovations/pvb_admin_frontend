import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const BankBookPageClient = lazyAccountsPage(() => import("./BankBookPageClient"));

export default function BankBookPage() {
  return <BankBookPageClient />;
}
