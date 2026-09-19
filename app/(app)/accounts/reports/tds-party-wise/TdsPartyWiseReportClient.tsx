"use client";

import TdsSummaryApiPageClient from "./TdsSummaryApiPageClient";

/**
 * Production TDS Summary — server-backed report.
 * Does not use localStorage / buildTdsSummaryReport demo rows.
 */
export default function TdsPartyWiseReportClient() {
  return <TdsSummaryApiPageClient />;
}
