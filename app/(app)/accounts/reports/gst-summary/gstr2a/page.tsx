import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const Gstr2aPageClient = lazyAccountsPage(() => import("./Gstr2aPageClient"));

export default function Gstr2aPage() {
  return <Gstr2aPageClient />;
}
