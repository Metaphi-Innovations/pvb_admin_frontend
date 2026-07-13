import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const HsnSummaryPageClient = lazyAccountsPage(() =>
  import("../components/Gstr1HsnSummaryPageClient").then((m) => ({
    default: m.Gstr1HsnSummaryPageClient,
  })),
);

export default function HsnSummaryPage() {
  return <HsnSummaryPageClient />;
}
