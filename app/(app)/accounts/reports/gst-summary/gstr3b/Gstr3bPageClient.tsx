"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsReportBody } from "@/components/accounts/AccountsReportLayout";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { ACCOUNTS_COMPANY_NAME } from "@/lib/accounts/report-export-presentation";
import { resolveBranchFilterLabel } from "@/lib/accounts/gst-report-filters";
import {
  GstSummaryApiError,
  GstSummaryApiService,
} from "@/services/gst-summary.service";
import type {
  Gstr3bQueryParams,
  Gstr3bWorkingResult,
} from "@/types/gst-summary.types";
import { useGstSummaryApiFilters } from "../useGstSummaryApiFilters";
import { GstReportFilterBar } from "../components/GstReportFilterBar";
import { GstReportNavTabs } from "../components/GstReportNavTabs";
import { GstSummaryExportMenu } from "../components/GstSummaryExportMenu";
import { Gstr1ReportHeaderBlock } from "../gstr1/components/Gstr1ReportHeaderBlock";
import { Gstr3bWorkingReport } from "./components/Gstr3bWorkingReport";

export default function Gstr3bPageClient() {
  const filterState = useGstSummaryApiFilters();
  const {
    mounted,
    datesReady,
    filters,
    queryParams,
    filtersLoading,
    filtersError,
    gstPeriod,
    gstRegistration,
  } = filterState;

  const [report, setReport] = useState<Gstr3bWorkingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scopeReady =
    !!queryParams &&
    gstRegistration !== "all" &&
    !!gstRegistration &&
    gstPeriod !== "all" &&
    !!gstPeriod;

  const gstr3bParams = useMemo((): Gstr3bQueryParams | null => {
    if (!scopeReady || !queryParams) return null;
    return {
      ...queryParams,
      gstin: gstRegistration,
      gst_period: gstPeriod,
      return_period: gstPeriod,
    };
  }, [scopeReady, queryParams, gstRegistration, gstPeriod]);

  useEffect(() => {
    if (!gstr3bParams) {
      setReport(null);
      setLoading(false);
      setError(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void GstSummaryApiService.getGstr3b(gstr3bParams, controller.signal)
      .then((result) => {
        setReport(result);
        setLoading(false);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        const message =
          err instanceof GstSummaryApiError
            ? err.message
            : "Failed to load GSTR-3B working report.";
        setError(message);
        setReport(null);
        setLoading(false);
      });
    return () => controller.abort();
  }, [gstr3bParams]);

  const showLoading =
    !mounted || filtersLoading || !datesReady || (loading && !report);

  const branchLabel = resolveBranchFilterLabel(filters.branch);

  const handleExport = useCallback(
    async (format: "EXCEL" | "PDF") => {
      if (!gstr3bParams) return;
      await GstSummaryApiService.exportGstr3b({ ...gstr3bParams, format });
    },
    [gstr3bParams],
  );

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "GST Summary", "GSTR-3B")}
      title="GSTR-3B"
      description="Limited GSTR-3B V1 compliance / books working report."
      hideDescription
      layout="split"
      className="h-full min-h-0"
      filters={
        <GstReportFilterBar
          filterState={filterState}
          mounted={mounted}
          end={
            <GstSummaryExportMenu
              disabled={!gstr3bParams || loading || !report}
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
          ) : !scopeReady && mounted && datesReady && !filtersLoading ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-4 text-xs text-amber-900 space-y-1">
              <p className="font-medium">Select GSTIN and GST Period</p>
              <p className="text-[11px] leading-snug">
                GSTR-3B statutory scope requires a specific GST registration and
                return period (YYYY-MM). Warehouse/branch filters remain optional
                narrowing only.
              </p>
            </div>
          ) : showLoading ? (
            <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
              Loading GSTR-3B…
            </div>
          ) : report ? (
            <>
              <Gstr1ReportHeaderBlock
                header={{
                  companyName: report.scope.company_name || ACCOUNTS_COMPANY_NAME,
                  reportName: "GSTR-3B Working Report (V1)",
                  gstin: report.scope.gstin,
                  financialYear:
                    report.scope.financial_year_code ||
                    report.scope.financial_year_name ||
                    "—",
                  returnPeriod: report.scope.return_period,
                  filingStatus: "Working only — not filing-ready",
                }}
                items={[
                  {
                    label: "Company Name",
                    value: report.scope.company_name || ACCOUNTS_COMPANY_NAME,
                  },
                  { label: "GSTIN", value: report.scope.gstin, mono: true },
                  {
                    label: "Report Name",
                    value: "GSTR-3B Working Report (V1)",
                  },
                  {
                    label: "Financial Year",
                    value:
                      report.scope.financial_year_code ||
                      report.scope.financial_year_name ||
                      "—",
                  },
                  {
                    label: "Return Period",
                    value: report.scope.return_period,
                  },
                  { label: "Branch", value: branchLabel },
                ]}
              />
              <Gstr3bWorkingReport report={report} />
            </>
          ) : null}
        </AccountsReportBody>
      </div>
    </AccountsPageShell>
  );
}
