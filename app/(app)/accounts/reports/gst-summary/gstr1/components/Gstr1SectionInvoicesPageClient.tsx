"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, IndianRupee, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Gstr1DocumentRow,
  Gstr1SectionId,
  Gstr1SectionResult,
  Gstr1SortBy,
  Gstr1SortOrder,
} from "@/types/gst-summary.types";
import { useGstSummaryApiFilters } from "../../useGstSummaryApiFilters";
import { GstReportFilterBar } from "../../components/GstReportFilterBar";
import { GstReportNavTabs } from "../../components/GstReportNavTabs";
import { GSTR1_SECTION_LABELS, type Gstr1ReportSectionId } from "../gstr1-report-types";
import { Gstr1ReportHeaderBlock } from "./Gstr1ReportHeaderBlock";

const GST_SUMMARY_GSTR1 = "/accounts/reports/gst-summary/gstr1";

function resolveSourceHref(row: Gstr1DocumentRow): string | null {
  if (row.source_type === "CREDIT_NOTE") {
    return `/accounts/transactions/credit-notes/${row.source_id}`;
  }
  if (
    row.source_type === "SALES_INVOICE" ||
    row.source_type === "STOCK_TRANSFER_SALES"
  ) {
    return `/accounts/transactions/invoices/${row.source_id}`;
  }
  return null;
}

function isCreditNoteSection(sectionId: string): boolean {
  return (
    sectionId === "cn-dn-registered" || sectionId === "cn-dn-unregistered"
  );
}

export function Gstr1SectionInvoicesPageClient({
  sectionId,
}: {
  sectionId: Exclude<
    Gstr1ReportSectionId,
    "hsn-summary" | "documents-summary" | "grand-total"
  >;
}) {
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
  const [sortBy, setSortBy] = useState<Gstr1SortBy>("document_date");
  const [sortOrder, setSortOrder] = useState<Gstr1SortOrder>("desc");
  const [result, setResult] = useState<Gstr1SectionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sectionLabel = GSTR1_SECTION_LABELS[sectionId];
  const isCn = isCreditNoteSection(sectionId);

  useEffect(() => {
    setPage(1);
  }, [queryParams, sectionId]);

  useEffect(() => {
    if (!queryParams) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void GstSummaryApiService.getGstr1Section(
      sectionId as Gstr1SectionId,
      {
        ...queryParams,
        page,
        page_size: pageSize,
        sort_by: sortBy,
        sort_order: sortOrder,
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
            : "Failed to load GSTR-1 section.";
        setError(message);
        setResult(null);
        setLoading(false);
      });
    return () => controller.abort();
  }, [queryParams, sectionId, page, pageSize, sortBy, sortOrder]);

  const rows = (result?.rows ?? []) as Gstr1DocumentRow[];
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

  const summaryCards = result
    ? [
        {
          label: "Documents",
          value: String(result.summary.document_count),
          isCount: true as const,
          icon: FileText,
        },
        {
          label: isCn ? "Taxable Reduction" : "Taxable Amount",
          value: formatMoneyString(result.summary.taxable_amount),
          icon: IndianRupee,
        },
        {
          label: "CGST",
          value: formatMoneyString(result.summary.cgst_amount),
          icon: Scale,
        },
        {
          label: "SGST",
          value: formatMoneyString(result.summary.sgst_amount),
          icon: Scale,
        },
        {
          label: "IGST",
          value: formatMoneyString(result.summary.igst_amount),
          icon: Scale,
        },
        {
          label: isCn ? "Note Value" : "Invoice Value",
          value: formatMoneyString(result.summary.invoice_amount),
          icon: IndianRupee,
        },
      ]
    : [];

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", sectionLabel, backHref)}
      title={sectionLabel}
      description="GSTR-1 section invoice listing."
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
            Loading invoices…
          </div>
        ) : result && !result.supported ? (
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-6 space-y-2">
            <p className="text-sm font-medium text-foreground">
              Not available yet
            </p>
            <p className="text-xs text-muted-foreground">
              {result.unsupported_reason ||
                "Not supported by current PVB transaction model."}
            </p>
            {(sectionId === "b2c-small" || sectionId === "b2c-large") && (
              <p className="text-xs text-muted-foreground">
                B2CL/B2CS threshold subdivision is not implemented. Use generic
                B2C data from the GSTR-1 hub where available.
              </p>
            )}
          </div>
        ) : result ? (
          <>
            {header && <Gstr1ReportHeaderBlock header={header} />}

            {sectionId === "b2c-small" && (
              <p className="text-[11px] text-muted-foreground">
                Showing generic B2C (unregistered / no GSTIN). Statutory
                B2CL/B2CS threshold classification is not applied.
              </p>
            )}

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
              {summaryCards.map((card) => (
                <AccountsReportKpiCard
                  key={card.label}
                  label={card.label}
                  value={card.value}
                  icon={card.icon}
                  isCount={card.isCount}
                />
              ))}
            </AccountsReportKpiGrid>

            <div className="flex items-end gap-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  Sort by
                </label>
                <Select
                  value={sortBy}
                  onValueChange={(v) => {
                    setSortBy(v as Gstr1SortBy);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-[180px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="document_date">Document date</SelectItem>
                    <SelectItem value="document_number">
                      Document number
                    </SelectItem>
                    <SelectItem value="customer_name">Customer</SelectItem>
                    <SelectItem value="taxable_amount">Taxable amount</SelectItem>
                    <SelectItem value="gst_amount">GST amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  Order
                </label>
                <Select
                  value={sortOrder}
                  onValueChange={(v) => {
                    setSortOrder(v as Gstr1SortOrder);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-[120px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Descending</SelectItem>
                    <SelectItem value="asc">Ascending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <AccountsListingTableCard className="flex-1 min-h-0 flex flex-col">
              <AccountsTableScroll className="flex-1 min-h-0">
                <AccountsTable minWidth={isCn ? 1400 : 1300}>
                  <AccountsTableHead>
                    <AccountsTableHeadRow>
                      <FinancialReportHeadCell>
                        {isCn ? "CN Date" : "Invoice Date"}
                      </FinancialReportHeadCell>
                      <FinancialReportHeadCell>
                        {isCn ? "CN Number" : "Invoice Number"}
                      </FinancialReportHeadCell>
                      <FinancialReportHeadCell>Customer</FinancialReportHeadCell>
                      <FinancialReportHeadCell>GSTIN</FinancialReportHeadCell>
                      {isCn && (
                        <FinancialReportHeadCell>
                          Original Invoice
                        </FinancialReportHeadCell>
                      )}
                      <FinancialReportHeadCell>
                        Place of Supply
                      </FinancialReportHeadCell>
                      <FinancialReportHeadCell>
                        {isCn ? "Source" : "Invoice Type"}
                      </FinancialReportHeadCell>
                      <FinancialReportHeadCell align="right">
                        {isCn ? "Note Amount" : "Invoice Amount"}
                      </FinancialReportHeadCell>
                      <FinancialReportHeadCell align="right">
                        {isCn ? "Taxable Reduction" : "Taxable Amount"}
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
                        Tax Amount
                      </FinancialReportHeadCell>
                      <FinancialReportHeadCell>Status</FinancialReportHeadCell>
                      <FinancialReportHeadCell className="w-16">
                        Action
                      </FinancialReportHeadCell>
                    </AccountsTableHeadRow>
                  </AccountsTableHead>
                  <AccountsTableBody>
                    {rows.length === 0 ? (
                      <AccountsTableRow>
                        <AccountsTableCell
                          colSpan={isCn ? 15 : 14}
                          className="text-xs text-muted-foreground text-center py-6"
                        >
                          No GSTR-1 transactions found for the selected filters.
                        </AccountsTableCell>
                      </AccountsTableRow>
                    ) : (
                      rows.map((row) => {
                        const href = resolveSourceHref(row);
                        return (
                          <AccountsTableRow
                            key={row.id}
                            className={cn(
                              row.needs_review && "bg-amber-50/30",
                            )}
                          >
                            <AccountsTableCell className="text-xs">
                              {row.document_date}
                            </AccountsTableCell>
                            <AccountsTableCell className="text-xs font-mono font-semibold text-brand-700">
                              {row.document_number}
                            </AccountsTableCell>
                            <AccountsTableCell className="text-xs font-medium">
                              {row.customer_name ?? "—"}
                            </AccountsTableCell>
                            <AccountsTableCell className="text-xs font-mono">
                              {row.customer_gstin ?? "—"}
                            </AccountsTableCell>
                            {isCn && (
                              <AccountsTableCell className="text-xs font-mono">
                                {row.original_invoice_number ?? "—"}
                              </AccountsTableCell>
                            )}
                            <AccountsTableCell className="text-xs">
                              {row.place_of_supply_state_code ?? "—"}
                            </AccountsTableCell>
                            <AccountsTableCell className="text-xs">
                              {row.invoice_type ?? row.source_type}
                            </AccountsTableCell>
                            <AccountsTableCell
                              align="right"
                              money
                              className={cn("text-xs", MONEY_AMOUNT_CLASS)}
                            >
                              {formatMoneyString(row.total_amount)}
                            </AccountsTableCell>
                            <AccountsTableCell
                              align="right"
                              money
                              className={cn("text-xs", MONEY_AMOUNT_CLASS)}
                            >
                              {formatMoneyString(
                                isCn
                                  ? row.taxable_reduction ?? row.taxable_amount
                                  : row.taxable_amount,
                              )}
                            </AccountsTableCell>
                            <AccountsTableCell
                              align="right"
                              money
                              className={cn("text-xs", MONEY_AMOUNT_CLASS)}
                            >
                              {formatMoneyString(
                                isCn
                                  ? row.igst_reduction ?? row.igst_amount
                                  : row.igst_amount,
                              )}
                            </AccountsTableCell>
                            <AccountsTableCell
                              align="right"
                              money
                              className={cn("text-xs", MONEY_AMOUNT_CLASS)}
                            >
                              {formatMoneyString(
                                isCn
                                  ? row.cgst_reduction ?? row.cgst_amount
                                  : row.cgst_amount,
                              )}
                            </AccountsTableCell>
                            <AccountsTableCell
                              align="right"
                              money
                              className={cn("text-xs", MONEY_AMOUNT_CLASS)}
                            >
                              {formatMoneyString(
                                isCn
                                  ? row.sgst_reduction ?? row.sgst_amount
                                  : row.sgst_amount,
                              )}
                            </AccountsTableCell>
                            <AccountsTableCell
                              align="right"
                              money
                              className={cn("text-xs", MONEY_AMOUNT_CLASS)}
                            >
                              {formatMoneyString(
                                isCn
                                  ? row.gst_reduction ?? row.gst_amount
                                  : row.gst_amount,
                              )}
                            </AccountsTableCell>
                            <AccountsTableCell className="text-xs">
                              <span
                                className={cn(
                                  "inline-flex text-xs px-2 py-0.5 rounded-full font-medium",
                                  row.needs_review
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-emerald-50 text-emerald-700",
                                )}
                              >
                                {row.needs_review
                                  ? "Needs Review"
                                  : row.source_status}
                              </span>
                            </AccountsTableCell>
                            <AccountsTableCell>
                              {href ? (
                                <Link
                                  href={href}
                                  className="text-xs text-brand-600 hover:underline font-medium"
                                >
                                  View
                                </Link>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  —
                                </span>
                              )}
                            </AccountsTableCell>
                          </AccountsTableRow>
                        );
                      })
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
                  recordLabel="documents"
                />
              )}
            </AccountsListingTableCard>
          </>
        ) : null}
      </AccountsReportBody>
    </AccountsPageShell>
  );
}
