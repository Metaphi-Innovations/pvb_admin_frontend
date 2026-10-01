import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const DebitNotesListClient = lazyAccountsPage(() => import("./DebitNotesListClient"));

export default function Page() {
  return <DebitNotesListClient />;
}
