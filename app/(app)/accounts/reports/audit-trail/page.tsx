import { lazyAccountsPage } from "@/lib/accounts/lazy-accounts-page";

const AuditTrailPageClient = lazyAccountsPage(
  () => import("./AuditTrailPageClient"),
  { pathnameHint: "/accounts/reports/audit-trail" },
);

export default function AuditTrailReportPage() {
  return <AuditTrailPageClient />;
}
