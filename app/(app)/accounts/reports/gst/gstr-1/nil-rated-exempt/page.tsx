import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const NilRatedExemptPageClient = lazyAccountsPage(
  () => import("./NilRatedExemptPageClient"),
);

export default function NilRatedExemptPage() {
  return <NilRatedExemptPageClient />;
}
