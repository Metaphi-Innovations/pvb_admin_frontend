"use client";

import { useMemo, useState } from "react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import { AccountsReportBody } from "@/components/accounts/AccountsReportLayout";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { ACCOUNTS_COMPANY_NAME } from "@/lib/accounts/report-export-presentation";
import { useGstReportFilters } from "../useGstReportFilters";
import { GstReportFilterBar } from "../components/GstReportFilterBar";
import { GstReportNavTabs } from "../components/GstReportNavTabs";
import { exportGstTabularReport } from "../gst-report-export";
import { Gstr1ReportHeaderBlock } from "../gstr1/components/Gstr1ReportHeaderBlock";
import { Gstr1SummaryTable } from "../gstr1/components/Gstr1SummaryTable";
import { buildGstr3bReport } from "./gstr3b-report-data";
import { GSTR3B_DRILL_ROUTES } from "./gstr3b-report-types";

const GSTR3B_BASE = "/accounts/reports/gst-summary/gstr3b";

export default function Gstr3bPageClient() {
  const filterState = useGstReportFilters();
  const { mounted, datesReady, filters } = filterState;
  const [exporting, setExporting] = useState(false);

  const report = useMemo(() => {
    if (!mounted || !datesReady) return null;
    return buildGstr3bReport(filters);
  }, [mounted, datesReady, filters]);

  const handleExport = (format: "excel" | "pdf") => {
    if (!report) return;
    setExporting(true);
    try {
      exportGstTabularReport(
        { reportTitle: "GSTR-3B", filters },
        [
          { label: "Particulars" },
          { label: "Voucher Count", align: "right", className: "num" },
          { label: "Taxable Amount (₹)", align: "right", className: "num" },
          { label: "IGST (₹)", align: "right", className: "num" },
          { label: "CGST (₹)", align: "right", className: "num" },
          { label: "SGST (₹)", align: "right", className: "num" },
          { label: "Tax Amount (₹)", align: "right", className: "num" },
        ],
        report.sections.map((row) => ({
          particulars: row.particulars,
          voucherCount: row.voucherCount,
          taxableAmount: row.taxableAmount,
          igst: row.igst,
          cgst: row.cgst,
          sgst: row.sgst,
          taxAmount: row.taxAmount,
        })),
        format,
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "GST Summary", "GSTR-3B")}
      title="GSTR-3B"
      description="Monthly GST return — liability and input GST as per books."
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
              Loading GSTR-3B…
            </div>
          ) : (
            <>
              <Gstr1ReportHeaderBlock
                header={report.header}
                items={[
                  {
                    label: "Company Name",
                    value: report.header.companyName || ACCOUNTS_COMPANY_NAME,
                  },
                  { label: "GSTIN", value: report.header.gstin, mono: true },
                  { label: "Report Name", value: report.header.reportName },
                  { label: "Financial Year", value: report.header.financialYear },
                  { label: "Return Period", value: report.header.returnPeriod },
                  { label: "Branch", value: report.branchLabel },
                ]}
              />
              <Gstr1SummaryTable
                sections={report.sections}
                filters={filters}
                basePath={GSTR3B_BASE}
                drillRoutes={GSTR3B_DRILL_ROUTES}
              />
            </>
          )}
        </AccountsReportBody>
      </div>
    </AccountsPageShell>
  );
}
