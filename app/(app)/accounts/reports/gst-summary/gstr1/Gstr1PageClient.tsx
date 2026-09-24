"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsReportBody } from "@/components/accounts/AccountsReportLayout";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  GstSummaryApiError,
  GstSummaryApiService,
} from "@/services/gst-summary.service";
import type { Gstr1HubResult } from "@/types/gst-summary.types";
import { useGstSummaryApiFilters } from "../useGstSummaryApiFilters";
import { GstReportFilterBar } from "../components/GstReportFilterBar";
import { GstReportNavTabs } from "../components/GstReportNavTabs";
import { GstSummaryExportMenu } from "../components/GstSummaryExportMenu";
import { Gstr1ReportHeaderBlock } from "./components/Gstr1ReportHeaderBlock";
import { Gstr1VoucherSummaryTable } from "./components/Gstr1VoucherSummaryTable";
import { Gstr1SummaryTable } from "./components/Gstr1SummaryTable";
import type { Gstr1ReportHeader, Gstr1SummaryRow, Gstr1VoucherSummary } from "./gstr1-report-types";
import type { GstSummaryTableRow } from "../gst-summary-column-filters";

function mapHubToUi(report: Gstr1HubResult): {
  header: Gstr1ReportHeader;
  voucherSummary: Gstr1VoucherSummary;
  sections: Array<GstSummaryTableRow & { supported?: boolean; notes?: string | null }>;
} {
  const header: Gstr1ReportHeader = {
    companyName: report.header.company_name,
    reportName: report.header.report_name,
    gstin: report.header.gstin ?? "—",
    financialYear: report.header.financial_year ?? "—",
    returnPeriod: report.header.return_period ?? "All months",
    filingStatus: report.header.filing_status,
  };

  const voucherSummary: Gstr1VoucherSummary = {
    totalVouchers: report.voucher_summary.total_outward_documents,
    includedInReturn: report.voucher_summary.included_in_return,
    notRelevant: report.voucher_summary.quarantined,
    needsReview: report.voucher_summary.needs_review,
  };

  const sections = report.sections.map((s) => {
    const rowType =
      s.row_type === "unsupported"
        ? ("section" as const)
        : s.row_type === "total"
          ? ("total" as const)
          : s.row_type;

    return {
      sectionId: s.section_id,
      particulars:
        s.supported === false
          ? `${s.particulars} (Not available yet)`
          : s.section_id === "b2c" || s.section_id === "b2c-small"
            ? `${s.particulars} (generic B2C)`
            : s.particulars,
      voucherCount: s.document_count,
      taxableAmount: Number(s.taxable_amount) || 0,
      igst: Number(s.igst_amount) || 0,
      cgst: Number(s.cgst_amount) || 0,
      sgst: Number(s.sgst_amount) || 0,
      taxAmount: Number(s.gst_amount) || 0,
      invoiceAmount: Number(s.invoice_amount) || 0,
      rowType,
      supported: s.supported,
      notes: s.notes,
    };
  });

  return { header, voucherSummary, sections };
}

export default function Gstr1PageClient() {
  const filterState = useGstSummaryApiFilters();
  const {
    mounted,
    datesReady,
    filters,
    queryParams,
    filtersLoading,
    filtersError,
  } = filterState;

  const [hub, setHub] = useState<Gstr1HubResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!queryParams) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void GstSummaryApiService.getGstr1Hub(queryParams, controller.signal)
      .then((result) => {
        setHub(result);
        setLoading(false);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        const message =
          err instanceof GstSummaryApiError
            ? err.message
            : "Failed to load GSTR-1 summary.";
        setError(message);
        setHub(null);
        setLoading(false);
      });
    return () => controller.abort();
  }, [queryParams]);

  const mapped = useMemo(() => (hub ? mapHubToUi(hub) : null), [hub]);
  const showLoading =
    !mounted || filtersLoading || !datesReady || (loading && !hub);

  const handleExport = useCallback(
    async (format: "EXCEL" | "PDF") => {
      if (!queryParams) return;
      await GstSummaryApiService.exportGstr1({ ...queryParams, format });
    },
    [queryParams],
  );

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
            <GstSummaryExportMenu
              disabled={!queryParams || loading || !hub}
              onExport={handleExport}
            />
          }
        />
      }
      subHeader={<GstReportNavTabs filters={filters} />}
    >
      <div className="flex-1 min-h-0 overflow-y-auto">
        <AccountsReportBody className="space-y-3 pb-4">
          {filtersError || error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-4 text-xs text-red-700">
              {filtersError || error}
            </div>
          ) : showLoading ? (
            <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
              Loading GSTR-1…
            </div>
          ) : mapped && hub ? (
            <>
              {(hub.health.warnings.length > 0 || hub.notes.b2c_threshold) && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 space-y-1">
                  {hub.health.warnings.map((w) => (
                    <p key={w} className="text-[11px] text-amber-800">
                      {w}
                    </p>
                  ))}
                  <p className="text-[11px] text-amber-800">
                    {hub.notes.b2c_threshold}
                  </p>
                  <p className="text-[11px] text-amber-800">
                    {hub.notes.unsupported}
                  </p>
                </div>
              )}
              <Gstr1ReportHeaderBlock header={mapped.header} />
              <Gstr1VoucherSummaryTable summary={mapped.voucherSummary} />
              <Gstr1SummaryTable
                sections={mapped.sections as Gstr1SummaryRow[]}
                filters={filters}
                backendTotalRow={
                  mapped.sections.find((s) => s.rowType === "total") ?? null
                }
              />
            </>
          ) : (
            <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
              No GSTR-1 transactions found for the selected filters.
            </div>
          )}
        </AccountsReportBody>
      </div>
    </AccountsPageShell>
  );
}
