import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const BankAccountFormClient = lazyAccountsPage(() => import("../BankAccountFormClient"));

export default function NewBankAccountPage() {
  return <BankAccountFormClient />;
}
