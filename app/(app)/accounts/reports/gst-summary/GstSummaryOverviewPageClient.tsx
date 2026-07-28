"use client";

import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Calculator,
  IndianRupee,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import {
  AccountsReportBody,
  AccountsReportKpiCard,
  AccountsReportKpiGrid,
} from "@/components/accounts/AccountsReportLayout";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { formatMoney } from "@/lib/accounts/money-format";
import { buildGstOverviewDashboard } from "@/lib/accounts/gst-report-service";
import { useGstReportFilters } from "./useGstReportFilters";
import { GstReportFilterBar } from "./components/GstReportFilterBar";
import { GstReportNavTabs } from "./components/GstReportNavTabs";
import { GstOverviewMonthlyTable } from "./components/GstOverviewMonthlyTable";
import { exportGstTabularReport } from "./gst-report-export";
import { useMemo, useState } from "react";

export default function GstSummaryOverviewPageClient() {
  const filterState = useGstReportFilters();
  const { mounted, datesReady, filters } = filterState;
  const [exporting, setExporting] = useState(false);

  const dashboard = useMemo(() => {
    if (!mounted || !datesReady) return null;
    return buildGstOverviewDashboard(filters);
  }, [mounted, datesReady, filters]);

  const overview = dashboard?.overview;

  const kpiCards = overview
    ? [
        { label: "Taxable Sales", value: formatMoney(overview.taxableSales), icon: ArrowUpRight, accent: true },
        { label: "Taxable Purchases", value: formatMoney(overview.taxablePurchases), icon: ArrowDownLeft },
        { label: "Output GST", value: formatMoney(overview.outputGst), icon: Scale },
        { label: "Input GST", value: formatMoney(overview.inputGst), icon: IndianRupee },
        { label: "Eligible ITC", value: formatMoney(overview.eligibleItc), icon: ShieldCheck },
        { label: "Net GST Payable", value: formatMoney(overview.netGstPayable), icon: Calculator, accent: true },
        {
          label: "Pending Reconciliation",
          value: overview.pendingReconciliation,
          icon: AlertTriangle,
          warning: overview.pendingReconciliation > 0,
          isCount: true,
        },
      ]
    : [];

  const handleExport = async (format: "excel" | "pdf") => {
    if (!dashboard) return;
    setExporting(true);
    try {
      exportGstTabularReport(
        { reportTitle: "GST Summary — Overview", filters },
        [
          { label: "Metric" },
          { label: "Value", align: "right", className: "num" },
        ],
        [
          ...kpiCards.map((c) => ({ metric: c.label, value: c.value })),
          { metric: "—", value: "—" },
          { metric: "Monthly GST Summary", value: "" },
          ...dashboard.monthlySummary.map((row) => ({
            metric: row.month,
            value: `${formatMoney(row.sales)} | ${formatMoney(row.purchase)} | ${formatMoney(row.netGst)}`,
          })),
        ],
        format,
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "GST Summary")}
      title="GST Summary"
      description="Consolidated GST overview across outward and inward supplies."
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
              disabled={exporting || !dashboard}
            />
          }
        />
      }
      subHeader={<GstReportNavTabs filters={filters} />}
    >
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <AccountsReportBody>
          {!mounted || !datesReady || !dashboard ? (
            <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
              Loading GST Summary…
            </div>
          ) : (
            <>
              <AccountsReportKpiGrid>
                {kpiCards.map((card) => (
                  <AccountsReportKpiCard key={card.label} {...card} />
                ))}
              </AccountsReportKpiGrid>

              <GstOverviewMonthlyTable rows={dashboard.monthlySummary} />
            </>
          )}
        </AccountsReportBody>
      </div>
    </AccountsPageShell>
  );
}
