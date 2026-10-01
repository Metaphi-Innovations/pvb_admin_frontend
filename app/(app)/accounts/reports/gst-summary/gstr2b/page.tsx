import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const Gstr2bPageClient = lazyAccountsPage(() => import("./Gstr2bPageClient"));

export default function Gstr2bPage() {
  return <Gstr2bPageClient />;
}
