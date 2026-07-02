"use client";

import { AccountsReportPlaceholderClient } from "@/components/accounts/AccountsReportPlaceholderClient";
import { AUDIT_TRAIL_REPORT } from "@/lib/accounts/report-placeholder-config";

export default function AuditTrailReportPage() {
  return <AccountsReportPlaceholderClient {...AUDIT_TRAIL_REPORT} />;
}
