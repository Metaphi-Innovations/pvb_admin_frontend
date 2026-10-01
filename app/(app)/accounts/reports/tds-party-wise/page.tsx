import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const TdsPartyWiseReportClient = lazyAccountsPage(() => import("./TdsPartyWiseReportClient"));

export default function TdsPartyWiseReportPage() {
  return <TdsPartyWiseReportClient />;
}
