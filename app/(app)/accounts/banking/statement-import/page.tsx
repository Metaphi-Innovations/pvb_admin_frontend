import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const StatementImportClient = lazyAccountsPage(() =>
  import("@/components/accounts/StatementImportClient").then((m) => ({
    default: m.StatementImportClient,
  })),
);

export default function StatementImportPage() {
  return <StatementImportClient />;
}
