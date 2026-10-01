import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const Gstr3bPageClient = lazyAccountsPage(() => import("./Gstr3bPageClient"));

export default function Gstr3bPage() {
  return <Gstr3bPageClient />;
}
