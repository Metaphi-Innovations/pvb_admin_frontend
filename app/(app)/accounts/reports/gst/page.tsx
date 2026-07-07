import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const GstSummaryPageClient = lazyAccountsPage(() => import("./GstSummaryPageClient"));

export default function GstSummaryPage() {
  return <GstSummaryPageClient />;
}
