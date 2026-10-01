import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const Gstr1PageClient = lazyAccountsPage(() => import("./Gstr1PageClient"));

export default function Gstr1Page() {
  return <Gstr1PageClient />;
}
