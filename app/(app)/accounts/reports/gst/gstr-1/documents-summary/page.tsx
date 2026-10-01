import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const DocumentsSummaryPageClient = lazyAccountsPage(
  () => import("./DocumentsSummaryPageClient"),
);

export default function DocumentsSummaryPage() {
  return <DocumentsSummaryPageClient />;
}
