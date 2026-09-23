"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Barcode, IndianRupee, Layers, Package } from "lucide-react";
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
import { AccountsTablePagination } from "@/components/accounts/AccountsTableListing";
import { FinancialReportHeadCell } from "@/components/accounts/FinancialReportTableHead";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { buildGstReportHref } from "@/lib/accounts/gst-report-filters";
import {
  formatMoneyString,
  MONEY_AMOUNT_CLASS,
} from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import {
  GstSummaryApiError,
  GstSummaryApiService,
} from "@/services/gst-summary.service";
import type {
  Gstr1HsnRow,
  Gstr1SectionResult,
} from "@/types/gst-summary.types";
import { useGstSummaryApiFilters } from "../../useGstSummaryApiFilters";
import { GstReportFilterBar } from "../../components/GstReportFilterBar";
import { GstReportNavTabs } from "../../components/GstReportNavTabs";
import { Gstr1ReportHeaderBlock } from "./Gstr1ReportHeaderBlock";

const GST_SUMMARY_GSTR1 = "/accounts/reports/gst-summary/gstr1";

export function Gstr1HsnSummaryPageClient() {
  const filterState = useGstSummaryApiFilters();
  const {
    mounted,
    datesReady,
    filters,
    queryParams,
    filtersLoading,
    filtersError,
  } = filterState;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [result, setResult] = useState<Gstr1SectionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [queryParams]);

  useEffect(() => {
    if (!queryParams) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void GstSummaryApiService.getGstr1Section(
      "hsn-summary",
      {
        ...queryParams,
        page,
        page_size: pageSize,
        sort_by: "document_date",
        sort_order: "asc",
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
            : "Failed to load HSN summary.";
        setError(message);
        setResult(null);
        setLoading(false);
      });
    return () => controller.abort();
  }, [queryParams, page, pageSize]);

  const rows = (result?.rows ?? []) as Gstr1HsnRow[];
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

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "HSN Summary", backHref)}
      title="HSN Summary"
      description="GSTR-1 HSN-wise outward supply summary."
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
            Loading HSN summary…
          </div>
        ) : result ? (
          <>
            {header && <Gstr1ReportHeaderBlock header={header} />}

            {result.health.warnings.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 space-y-1">
                {result.health.warnings.map((w) => (
                  <p key={w} className="text-[11px] text-amber-800">
                    {w}
                  </p>
                ))}
              </div>
            )}

            <AccountsReportKpiGrid>
              <AccountsReportKpiCard
                label="HSN Rows"
                value={String(result.summary.document_count)}
                icon={Barcode}
                isCount
              />
              <AccountsReportKpiCard
                label="Taxable Value"
                value={formatMoneyString(result.summary.taxable_amount)}
                icon={IndianRupee}
              />
              <AccountsReportKpiCard
                label="Total GST"
                value={formatMoneyString(result.summary.gst_amount)}
                icon={Layers}
              />
              <AccountsReportKpiCard
                label="Page Taxable"
                value={formatMoneyString(result.page_summary.taxable_amount)}
                icon={Package}
              />
            </AccountsReportKpiGrid>

            <AccountsListingTableCard className="flex-1 min-h-0 flex flex-col">
              <AccountsTableScroll className="flex-1 min-h-0">
                <AccountsTable minWidth={1000}>
                  <AccountsTableHead>
                    <AccountsTableHeadRow>
                      <FinancialReportHeadCell>HSN</FinancialReportHeadCell>
                      <FinancialReportHeadCell>
                        Description
                      </FinancialReportHeadCell>
                      <FinancialReportHeadCell>UQC</FinancialReportHeadCell>
                      <FinancialReportHeadCell align="right">
                        Quantity
                      </FinancialReportHeadCell>
                      <FinancialReportHeadCell align="right">
                        Taxable Amount
                      </FinancialReportHeadCell>
                      <FinancialReportHeadCell>
                        GST Rate
                      </FinancialReportHeadCell>
                      <FinancialReportHeadCell align="right">
                        IGST
                      </FinancialReportHeadCell>
                      <FinancialReportHeadCell align="right">
                        CGST
                      </FinancialReportHeadCell>
                      <FinancialReportHeadCell align="right">
                        SGST
                      </FinancialReportHeadCell>
                      <FinancialReportHeadCell align="right">
                        Total Tax
                      </FinancialReportHeadCell>
                    </AccountsTableHeadRow>
                  </AccountsTableHead>
                  <AccountsTableBody>
                    {rows.length === 0 ? (
                      <AccountsTableRow>
                        <AccountsTableCell
                          colSpan={10}
                          className="text-xs text-muted-foreground text-center py-6"
                        >
                          No HSN summary rows for the selected filters.
                        </AccountsTableCell>
                      </AccountsTableRow>
                    ) : (
                      rows.map((row) => (
                        <AccountsTableRow key={row.id}>
                          <AccountsTableCell className="text-xs font-mono font-semibold text-brand-700">
                            {row.hsn_sac_code}
                          </AccountsTableCell>
                          <AccountsTableCell className="text-xs">
                            {row.description ?? "—"}
                          </AccountsTableCell>
                          <AccountsTableCell className="text-xs">
                            {row.uqc ?? "—"}
                          </AccountsTableCell>
                          <AccountsTableCell
                            align="right"
                            className="text-xs tabular-nums"
                          >
                            {row.quantity}
                          </AccountsTableCell>
                          <AccountsTableCell
                            align="right"
                            money
                            className={cn("text-xs", MONEY_AMOUNT_CLASS)}
                          >
                            {formatMoneyString(row.taxable_amount)}
                          </AccountsTableCell>
                          <AccountsTableCell className="text-xs">
                            {row.gst_rate}%
                          </AccountsTableCell>
                          <AccountsTableCell
                            align="right"
                            money
                            className={cn("text-xs", MONEY_AMOUNT_CLASS)}
                          >
                            {formatMoneyString(row.igst_amount)}
                          </AccountsTableCell>
                          <AccountsTableCell
                            align="right"
                            money
                            className={cn("text-xs", MONEY_AMOUNT_CLASS)}
                          >
                            {formatMoneyString(row.cgst_amount)}
                          </AccountsTableCell>
                          <AccountsTableCell
                            align="right"
                            money
                            className={cn("text-xs", MONEY_AMOUNT_CLASS)}
                          >
                            {formatMoneyString(row.sgst_amount)}
                          </AccountsTableCell>
                          <AccountsTableCell
                            align="right"
                            money
                            className={cn("text-xs", MONEY_AMOUNT_CLASS)}
                          >
                            {formatMoneyString(row.gst_amount)}
                          </AccountsTableCell>
                        </AccountsTableRow>
                      ))
                    )}
                  </AccountsTableBody>
                </AccountsTable>
              </AccountsTableScroll>

              {result.pagination.total_rows > 0 && (
                <AccountsTablePagination
                  page={result.pagination.page}
                  pageSize={result.pagination.page_size}
                  totalRecords={result.pagination.total_rows}
                  onPageChange={setPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setPage(1);
                  }}
                  recordLabel="HSN rows"
                />
              )}
            </AccountsListingTableCard>
          </>
        ) : null}
      </AccountsReportBody>
    </AccountsPageShell>
  );
}
