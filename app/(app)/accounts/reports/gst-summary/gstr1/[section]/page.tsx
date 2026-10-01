import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const Gstr1SectionPageClient = lazyAccountsPage(
  () => import("./Gstr1SectionPageClient"),
);

export default function Gstr1SectionPage() {
  return <Gstr1SectionPageClient />;
}
