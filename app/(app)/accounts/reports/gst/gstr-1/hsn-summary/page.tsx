import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const HsnSummaryPageClient = lazyAccountsPage(() => import("./HsnSummaryPageClient"));

export default function HsnSummaryPage() {
  return <HsnSummaryPageClient />;
}
