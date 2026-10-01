"use client";

import { useMemo, useState } from "react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import { AccountsReportBody } from "@/components/accounts/AccountsReportLayout";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { useGstReportFilters } from "../useGstReportFilters";
import { GstReportFilterBar } from "../components/GstReportFilterBar";
import { GstReportNavTabs } from "../components/GstReportNavTabs";
import { buildGstr1ExportMeta, buildGstr1Report } from "./gstr1-report-data";
import { exportGstr1Report } from "./gstr1-report-export";
import { Gstr1ReportHeaderBlock } from "./components/Gstr1ReportHeaderBlock";
import { Gstr1VoucherSummaryTable } from "./components/Gstr1VoucherSummaryTable";
import { Gstr1SummaryTable } from "./components/Gstr1SummaryTable";

export default function Gstr1PageClient() {
  const filterState = useGstReportFilters();
  const { mounted, datesReady, filters } = filterState;
  const [exporting, setExporting] = useState(false);

  const report = useMemo(() => {
    if (!mounted || !datesReady) return null;
    return buildGstr1Report(filters);
  }, [mounted, datesReady, filters]);

  const handleExport = (format: "excel" | "pdf") => {
    if (!report) return;
    setExporting(true);
    try {
      exportGstr1Report(report, buildGstr1ExportMeta(filters), format);
    } finally {
      setExporting(false);
    }
  };

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "GST Summary", "GSTR-1")}
      title="GSTR-1"
      description="Outward supplies return — section-wise summary."
      hideDescription
      layout="split"
      className="h-full min-h-0"
      filters={
        <GstReportFilterBar
          filterState={filterState}
          mounted={mounted}
          end={
            <AccountsExportMenu
              onExcel={() => handleExport("excel")}
              onPdf={() => handleExport("pdf")}
              disabled={exporting || !report}
            />
          }
        />
      }
      subHeader={<GstReportNavTabs filters={filters} />}
    >
      <div className="flex-1 min-h-0 overflow-y-auto">
        <AccountsReportBody className="space-y-3 pb-4">
          {!mounted || !datesReady || !report ? (
            <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
              Loading GSTR-1…
            </div>
          ) : (
            <>
              <Gstr1ReportHeaderBlock header={report.header} />
              <Gstr1VoucherSummaryTable summary={report.voucherSummary} />
              <Gstr1SummaryTable sections={report.sections} filters={filters} />
            </>
          )}
        </AccountsReportBody>
      </div>
    </AccountsPageShell>
  );
}
