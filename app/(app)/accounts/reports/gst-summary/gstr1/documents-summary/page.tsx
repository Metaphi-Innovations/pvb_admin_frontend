import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const DocumentsSummaryPageClient = lazyAccountsPage(() =>
  import("../components/Gstr1DocumentsSummaryPageClient").then((m) => ({
    default: m.Gstr1DocumentsSummaryPageClient,
  })),
);

export default function DocumentsSummaryPage() {
  return <DocumentsSummaryPageClient />;
}
