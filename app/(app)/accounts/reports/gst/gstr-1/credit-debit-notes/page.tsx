import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const CreditDebitNotesPageClient = lazyAccountsPage(
  () => import("./CreditDebitNotesPageClient"),
);

export default function CreditDebitNotesPage() {
  return <CreditDebitNotesPageClient />;
}
