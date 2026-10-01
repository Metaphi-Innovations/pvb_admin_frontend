import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const GstSummaryOverviewPageClient = lazyAccountsPage(
  () => import("./GstSummaryOverviewPageClient"),
);

export default function GstSummaryPage() {
  return <GstSummaryOverviewPageClient />;
}
