"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Receipt, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsListingTableCard } from "@/components/accounts/AccountsListingHeader";
import {
  AccountsReportBody,
  AccountsReportKpiCard,
  AccountsReportKpiGrid,
} from "@/components/accounts/AccountsReportLayout";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableHead,
  AccountsTableHeadRow,
  AccountsTableRow,
  AccountsTableScroll,
} from "@/components/accounts/AccountsTable";
import { FinancialReportHeadCell } from "@/components/accounts/FinancialReportTableHead";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { buildGstReportHref } from "@/lib/accounts/gst-report-filters";
import {
  GstSummaryApiError,
  GstSummaryApiService,
} from "@/services/gst-summary.service";
import type {
  Gstr1DocumentIssuedRow,
  Gstr1SectionResult,
} from "@/types/gst-summary.types";
import { useGstSummaryApiFilters } from "../../useGstSummaryApiFilters";
import { GstReportFilterBar } from "../../components/GstReportFilterBar";
import { GstReportNavTabs } from "../../components/GstReportNavTabs";
import { Gstr1ReportHeaderBlock } from "./Gstr1ReportHeaderBlock";

const GST_SUMMARY_GSTR1 = "/accounts/reports/gst-summary/gstr1";

export function Gstr1DocumentsSummaryPageClient() {
  const filterState = useGstSummaryApiFilters();
  const {
    mounted,
    datesReady,
    filters,
    queryParams,
    filtersLoading,
    filtersError,
  } = filterState;

  const [result, setResult] = useState<Gstr1SectionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!queryParams) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void GstSummaryApiService.getGstr1Section(
      "documents-summary",
      {
        ...queryParams,
        page: 1,
        page_size: 25,
      },
      controller.signal,
    )
      .then((data) => {
        setResult(data);
        setLoading(false);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        const message =
          err instanceof GstSummaryApiError
            ? err.message
            : "Failed to load documents summary.";
        setError(message);
        setResult(null);
        setLoading(false);
      });
    return () => controller.abort();
  }, [queryParams]);

  const rows = (result?.rows ?? []) as Gstr1DocumentIssuedRow[];
  const backHref = buildGstReportHref(GST_SUMMARY_GSTR1, filters);
  const showLoading =
    !mounted || filtersLoading || !datesReady || (loading && !result);

  const header = useMemo(() => {
    if (!result) return null;
    return {
      companyName: result.scope.company_name,
      reportName: "GSTR-1",
      gstin: result.scope.gstin ?? "—",
      financialYear:
        result.scope.financial_year_code ??
        result.scope.financial_year_name ??
        "—",
      returnPeriod: result.applied_filters.gst_period ?? "All months",
      filingStatus: "Not Filed",
    };
  }, [result]);

  const totalIssued = rows.reduce((n, r) => n + r.total_issued, 0);
  const totalCancelled = rows.reduce((n, r) => n + r.cancelled, 0);
  const totalNet = rows.reduce((n, r) => n + r.net_issued, 0);
  const serialReliable = rows.every((r) => r.serial_range_reliable);

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "Document Summary", backHref)}
      title="Document Summary"
      description="GSTR-1 document series summary."
      hideDescription
      layout="split"
      className="h-full min-h-0"
      actions={
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" asChild>
          <Link href={backHref}>
            <ArrowLeft className="w-3.5 h-3.5" /> GSTR-1 Summary
          </Link>
        </Button>
      }
      filters={
        <GstReportFilterBar
          filterState={filterState}
          mounted={mounted}
          end={
            <span className="text-[11px] text-muted-foreground">
              Export unavailable
            </span>
          }
        />
      }
      subHeader={<GstReportNavTabs filters={filters} />}
    >
      <AccountsReportBody className="space-y-3">
        {filtersError || error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-4 text-xs text-red-700">
            {filtersError || error}
          </div>
        ) : showLoading ? (
          <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
            Loading document summary…
          </div>
        ) : result ? (
          <>
            {header && <Gstr1ReportHeaderBlock header={header} />}

            <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 space-y-1">
              <p className="text-[11px] text-amber-800">
                {result.notes.serial_range ||
                  "Document number From/To values are informational only and are not treated as statutory-certified serial ranges."}
              </p>
              {result.health.warnings.map((w) => (
                <p key={w} className="text-[11px] text-amber-800">
                  {w}
                </p>
              ))}
            </div>

            <AccountsReportKpiGrid>
              <AccountsReportKpiCard
                label="Total Issued"
                value={String(totalIssued)}
                icon={FileText}
                isCount
              />
              <AccountsReportKpiCard
                label="Cancelled"
                value={String(totalCancelled)}
                icon={XCircle}
                isCount
              />
              <AccountsReportKpiCard
                label="Net Issued"
                value={String(totalNet)}
                icon={Receipt}
                isCount
              />
            </AccountsReportKpiGrid>

            <AccountsListingTableCard className="flex-1 min-h-0 flex flex-col">
              <AccountsTableScroll className="flex-1 min-h-0">
                <AccountsTable minWidth={800}>
                  <AccountsTableHead>
                    <AccountsTableHeadRow>
                      <FinancialReportHeadCell>
                        Document Type
                      </FinancialReportHeadCell>
                      <FinancialReportHeadCell>
                        From Number
                        {!serialReliable && (
                          <span className="block text-[10px] font-normal text-muted-foreground">
                            informational
                          </span>
                        )}
                      </FinancialReportHeadCell>
                      <FinancialReportHeadCell>
                        To Number
                        {!serialReliable && (
                          <span className="block text-[10px] font-normal text-muted-foreground">
                            informational
                          </span>
                        )}
                      </FinancialReportHeadCell>
                      <FinancialReportHeadCell align="right">
                        Total Issued
                      </FinancialReportHeadCell>
                      <FinancialReportHeadCell align="right">
                        Cancelled
                      </FinancialReportHeadCell>
                      <FinancialReportHeadCell align="right">
                        Net Issued
                      </FinancialReportHeadCell>
                    </AccountsTableHeadRow>
                  </AccountsTableHead>
                  <AccountsTableBody>
                    {rows.length === 0 ? (
                      <AccountsTableRow>
                        <AccountsTableCell
                          colSpan={6}
                          className="text-xs text-muted-foreground text-center py-6"
                        >
                          No documents issued for the selected filters.
                        </AccountsTableCell>
                      </AccountsTableRow>
                    ) : (
                      rows.map((row) => (
                        <AccountsTableRow key={row.id}>
                          <AccountsTableCell className="text-xs font-medium">
                            {row.document_type_label}
                          </AccountsTableCell>
                          <AccountsTableCell className="text-xs font-mono text-muted-foreground">
                            {row.from_number ?? "—"}
                          </AccountsTableCell>
                          <AccountsTableCell className="text-xs font-mono text-muted-foreground">
                            {row.to_number ?? "—"}
                          </AccountsTableCell>
                          <AccountsTableCell
                            align="right"
                            className="text-xs tabular-nums"
                          >
                            {row.total_issued}
                          </AccountsTableCell>
                          <AccountsTableCell
                            align="right"
                            className="text-xs tabular-nums"
                          >
                            {row.cancelled}
                          </AccountsTableCell>
                          <AccountsTableCell
                            align="right"
                            className="text-xs tabular-nums font-medium"
                          >
                            {row.net_issued}
                          </AccountsTableCell>
                        </AccountsTableRow>
                      ))
                    )}
                  </AccountsTableBody>
                </AccountsTable>
              </AccountsTableScroll>
            </AccountsListingTableCard>
          </>
        ) : null}
      </AccountsReportBody>
    </AccountsPageShell>
  );
}
