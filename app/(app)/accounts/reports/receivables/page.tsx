import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const CustomerOutstandingReportClient = lazyAccountsPage(() =>
  import("./CustomerOutstandingReportClient"),
);

export default function CustomerOutstandingReportPage() {
  return <CustomerOutstandingReportClient />;
}
