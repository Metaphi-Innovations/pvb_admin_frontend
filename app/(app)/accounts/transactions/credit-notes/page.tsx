import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const CreditNotesListClient = lazyAccountsPage(() => import("./CreditNotesListClient"));

export default function Page() {
  return <CreditNotesListClient />;
}
