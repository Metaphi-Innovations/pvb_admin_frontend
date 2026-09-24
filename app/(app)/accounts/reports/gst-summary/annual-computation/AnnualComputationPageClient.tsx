"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  FileText,
  Receipt,
  Scale,
  Wallet,
} from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsListingTableCard } from "@/components/accounts/AccountsListingHeader";
import { AccountsReportBody } from "@/components/accounts/AccountsReportLayout";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableHead,
  AccountsTableHeadCell,
  AccountsTableHeadRow,
  AccountsTableRow,
  AccountsTableScroll,
} from "@/components/accounts/AccountsTable";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { ACCOUNTS_COMPANY_NAME } from "@/lib/accounts/report-export-presentation";
import { formatMoneyString, MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import {
  GstSummaryApiError,
  GstSummaryApiService,
} from "@/services/gst-summary.service";
import type {
  AnnualPeriodStatuses,
  AnnualSupportStatus,
  AnnualWorkingQueryParams,
  AnnualWorkingResult,
} from "@/types/gst-summary.types";
import { useGstSummaryApiFilters } from "../useGstSummaryApiFilters";
import { GstReportNavTabs } from "../components/GstReportNavTabs";
import { GstSummaryExportMenu } from "../components/GstSummaryExportMenu";
import { Gstr1ReportHeaderBlock } from "../gstr1/components/Gstr1ReportHeaderBlock";
import { AnnualGstFilterBar } from "./components/AnnualGstFilterBar";
import { buildAnnualGstMonthLinks } from "./annual-gst-month-links";

function moneyOrDash(
  value: string | null | undefined,
  support?: AnnualSupportStatus,
): string {
  if (
    support === "MISSING" ||
    support === "NOT_AVAILABLE" ||
    support === "NOT_IMPLEMENTED_IN_V1"
  ) {
    return "—";
  }
  if (value == null || value === "") return "—";
  return formatMoneyString(value);
}

function StatusPill({ status }: { status: AnnualSupportStatus }) {
  const label =
    status === "READY" || status === "SUPPORTED"
      ? "Ready"
      : status === "MISSING"
        ? "Missing"
        : status === "PARTIAL"
          ? "Partial"
          : status === "NOT_AVAILABLE"
            ? "Not Available"
            : status === "NOT_IMPLEMENTED_IN_V1"
              ? "Not Implemented"
              : status;

  const tone =
    status === "READY" || status === "SUPPORTED"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : status === "MISSING"
        ? "bg-red-50 text-red-800 border-red-200"
        : status === "PARTIAL"
          ? "bg-amber-50 text-amber-900 border-amber-200"
          : "bg-muted/40 text-muted-foreground border-border";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium",
        tone,
      )}
    >
      {label}
    </span>
  );
}

function HeadlineCards({ report }: { report: AnnualWorkingResult }) {
  const h = report.headline.values;
  const cards = [
    {
      label: "Annual Outward Taxable",
      value: moneyOrDash(h?.annual_outward_taxable, report.headline.support),
      icon: ArrowUpRight,
    },
    {
      label: "Annual Output GST",
      value: moneyOrDash(h?.annual_output_gst, report.headline.support),
      icon: Receipt,
    },
    {
      label: "Suggested Eligible ITC",
      value: moneyOrDash(
        h?.suggested_eligible_itc_total,
        h?.suggested_eligible_itc_support,
      ),
      icon: Wallet,
    },
    {
      label: "Final Claimed ITC",
      value: moneyOrDash(
        h?.final_claimed_itc_total,
        h?.final_claimed_itc_support,
      ),
      icon: Wallet,
    },
    {
      label: "Books GST Working Difference (control)",
      value: moneyOrDash(h?.books_gst_working_difference),
      icon: Scale,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-border p-3 flex items-center gap-3 shadow-sm border-l-4 border-l-brand-600"
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-brand-50">
              <Icon className="w-4 h-4 text-brand-600" />
            </div>
            <div className="min-w-0">
              <p className={cn("text-sm font-bold leading-none", MONEY_AMOUNT_CLASS)}>
                {card.value}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                {card.label}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PeriodMatrix({
  rows,
  filters,
}: {
  rows: AnnualPeriodStatuses[];
  filters: ReturnType<typeof useGstSummaryApiFilters>["filters"];
}) {
  return (
    <AccountsListingTableCard>
      <div className="px-3 py-2 border-b border-border bg-muted/20">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Monthly compliance completeness
        </p>
      </div>
      <AccountsTableScroll>
        <AccountsTable minWidth={720}>
          <AccountsTableHead>
            <AccountsTableHeadRow>
              <AccountsTableHeadCell className="text-xs font-semibold">
                Period
              </AccountsTableHeadCell>
              <AccountsTableHeadCell className="text-xs font-semibold">
                GSTR-1
              </AccountsTableHeadCell>
              <AccountsTableHeadCell className="text-xs font-semibold">
                GSTR-2A
              </AccountsTableHeadCell>
              <AccountsTableHeadCell className="text-xs font-semibold">
                GSTR-2B
              </AccountsTableHeadCell>
              <AccountsTableHeadCell className="text-xs font-semibold">
                GSTR-3B Working
              </AccountsTableHeadCell>
              <AccountsTableHeadCell className="text-xs font-semibold">
                Links
              </AccountsTableHeadCell>
            </AccountsTableHeadRow>
          </AccountsTableHead>
          <AccountsTableBody>
            {rows.map((row) => {
              const links = buildAnnualGstMonthLinks(row.return_period, filters);
              return (
                <AccountsTableRow key={row.return_period}>
                  <AccountsTableCell className="text-xs font-medium">
                    {row.label}
                    <span className="block text-[10px] text-muted-foreground font-normal">
                      {row.return_period}
                    </span>
                  </AccountsTableCell>
                  <AccountsTableCell>
                    <StatusPill status={row.gstr1} />
                  </AccountsTableCell>
                  <AccountsTableCell>
                    <StatusPill status={row.gstr2a} />
                  </AccountsTableCell>
                  <AccountsTableCell>
                    <StatusPill status={row.gstr2b} />
                  </AccountsTableCell>
                  <AccountsTableCell>
                    <StatusPill status={row.gstr3b} />
                  </AccountsTableCell>
                  <AccountsTableCell className="text-[11px]">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={links.gstr1}
                        className="text-brand-700 hover:underline"
                      >
                        1
                      </Link>
                      <Link
                        href={links.gstr2a}
                        className="text-brand-700 hover:underline"
                      >
                        2A
                      </Link>
                      <Link
                        href={links.gstr2b}
                        className="text-brand-700 hover:underline"
                      >
                        2B
                      </Link>
                      <Link
                        href={links.gstr3b}
                        className="text-brand-700 hover:underline"
                      >
                        3B
                      </Link>
                    </div>
                  </AccountsTableCell>
                </AccountsTableRow>
              );
            })}
          </AccountsTableBody>
        </AccountsTable>
      </AccountsTableScroll>
    </AccountsListingTableCard>
  );
}

function SectionPanel({
  title,
  support,
  reason,
  children,
}: {
  title: string;
  support?: AnnualSupportStatus;
  reason?: string | null;
  children: React.ReactNode;
}) {
  return (
    <AccountsListingTableCard>
      <div className="px-3 py-2 border-b border-border bg-muted/20 flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {title}
        </p>
        {support ? <StatusPill status={support} /> : null}
      </div>
      {reason && support && support !== "SUPPORTED" && support !== "READY" ? (
        <p className="px-3 py-1.5 text-[11px] text-muted-foreground border-b border-border">
          {reason}
        </p>
      ) : null}
      <div className="p-3">{children}</div>
    </AccountsListingTableCard>
  );
}

function Kv({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium tabular-nums", MONEY_AMOUNT_CLASS)}>
        {value}
      </span>
    </div>
  );
}

function CountKv({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

export default function AnnualComputationPageClient() {
  const filterState = useGstSummaryApiFilters();
  const {
    mounted,
    datesReady,
    filters,
    filtersLoading,
    filtersError,
    financialYearId,
    gstRegistration,
    branch,
  } = filterState;

  const [report, setReport] = useState<AnnualWorkingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scopeReady =
    !!financialYearId && gstRegistration !== "all" && !!gstRegistration;

  const annualParams = useMemo((): AnnualWorkingQueryParams | null => {
    if (!scopeReady) return null;
    return {
      financial_year_id: financialYearId,
      gstin: gstRegistration,
      branch_ids: branch,
      warehouse_ids: branch,
    };
  }, [scopeReady, financialYearId, gstRegistration, branch]);

  useEffect(() => {
    if (!annualParams) {
      setReport(null);
      setLoading(false);
      setError(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void GstSummaryApiService.getAnnual(annualParams, controller.signal)
      .then((result) => {
        setReport(result);
        setLoading(false);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        const message =
          err instanceof GstSummaryApiError
            ? err.message
            : "Failed to load Annual GST Compliance Summary.";
        setError(message);
        setReport(null);
        setLoading(false);
      });
    return () => controller.abort();
  }, [annualParams]);

  const showLoading =
    !mounted || filtersLoading || !datesReady || (loading && !report);

  const gstr1Sections = report?.gstr1.values?.sections ?? [];
  const suggested = report?.gstr3b_working.suggested_eligible_itc;
  const finalClaimed = report?.gstr3b_working.final_claimed_itc;
  const books = report?.books_control;

  const handleExport = useCallback(
    async (format: "EXCEL" | "PDF") => {
      if (!annualParams) return;
      await GstSummaryApiService.exportAnnual({ ...annualParams, format });
    },
    [annualParams],
  );

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb(
        "Reports",
        "GST Summary",
        "Annual GST Summary",
      )}
      title="Annual GST Compliance Summary"
      description="Annual compliance working and reconciliation summary — not a GST return filing module."
      hideDescription
      layout="split"
      className="h-full min-h-0"
      filters={
        <AnnualGstFilterBar
          filterState={filterState}
          mounted={mounted}
          end={
            <GstSummaryExportMenu
              disabled={!annualParams || loading || !report}
              onExport={handleExport}
            />
          }
        />
      }
      subHeader={<GstReportNavTabs filters={filters} />}
    >
      <div className="flex-1 min-h-0 overflow-y-auto">
        <AccountsReportBody className="space-y-3 pb-4">
          <p className="text-[11px] text-muted-foreground leading-snug">
            Annual GST compliance and reconciliation working for the selected
            GSTIN. This is not a GST return filing module.
          </p>

          {filtersError || error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-4 text-xs text-red-700">
              {filtersError || error}
            </div>
          ) : !scopeReady && mounted && datesReady && !filtersLoading ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-4 text-xs text-amber-900 space-y-1">
              <p className="font-medium">Select Financial Year and GSTIN</p>
              <p className="text-[11px] leading-snug">
                Annual GST Compliance Summary requires one GSTIN. All GSTINs is
                not supported in this step. Branch/warehouse remains optional
                narrowing only.
              </p>
            </div>
          ) : showLoading ? (
            <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
              Loading Annual GST Compliance Summary…
            </div>
          ) : report ? (
            <>
              <Gstr1ReportHeaderBlock
                header={{
                  companyName:
                    report.scope.company_name || ACCOUNTS_COMPANY_NAME,
                  reportName: "Annual GST Compliance Summary",
                  gstin: report.scope.gstin,
                  financialYear:
                    report.scope.financial_year_code ||
                    report.scope.financial_year_name ||
                    "—",
                  returnPeriod: `${report.scope.from_date} → ${report.scope.to_date}`,
                  filingStatus: "Working only — not a filing module",
                }}
                items={[
                  {
                    label: "Company Name",
                    value:
                      report.scope.company_name || ACCOUNTS_COMPANY_NAME,
                  },
                  { label: "GSTIN", value: report.scope.gstin },
                  {
                    label: "Financial Year",
                    value:
                      report.scope.financial_year_code ||
                      report.scope.financial_year_name ||
                      "—",
                  },
                ]}
              />

              <HeadlineCards report={report} />

              <PeriodMatrix rows={report.period_matrix} filters={filters} />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <SectionPanel
                  title="Annual Outward GST"
                  support={report.outward.support}
                  reason={report.outward.reason}
                >
                  {report.outward.values ? (
                    <div className="space-y-1">
                      <Kv
                        label="Taxable value"
                        value={formatMoneyString(
                          report.outward.values.taxable_value,
                        )}
                      />
                      <Kv
                        label="CGST"
                        value={formatMoneyString(report.outward.values.cgst)}
                      />
                      <Kv
                        label="SGST"
                        value={formatMoneyString(report.outward.values.sgst)}
                      />
                      <Kv
                        label="IGST"
                        value={formatMoneyString(report.outward.values.igst)}
                      />
                      <Kv
                        label="Cess"
                        value="Not Available"
                      />
                      <Kv
                        label="GST total"
                        value={formatMoneyString(
                          report.outward.values.gst_total,
                        )}
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Not available</p>
                  )}
                </SectionPanel>

                <SectionPanel
                  title="Books GST Control"
                  support={books?.support}
                  reason={books?.reason}
                >
                  <div className="mb-2">
                    <span className="inline-flex items-center rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                      NON-STATUTORY CONTROL
                    </span>
                  </div>
                  {books?.values ? (
                    <div className="space-y-1">
                      <Kv
                        label="Output GST"
                        value={formatMoneyString(books.values.output_gst)}
                      />
                      <Kv
                        label="Input Books GST"
                        value={formatMoneyString(books.values.input_gst)}
                      />
                      <Kv
                        label="Working difference"
                        value={formatMoneyString(
                          books.values.books_gst_working_difference,
                        )}
                      />
                      <p className="text-[11px] text-muted-foreground pt-1">
                        {books.values.note}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Not available</p>
                  )}
                </SectionPanel>
              </div>

              <SectionPanel
                title="Annual GSTR-1"
                support={report.gstr1.support}
                reason={report.gstr1.reason}
              >
                <AccountsTableScroll>
                  <AccountsTable minWidth={640}>
                    <AccountsTableHead>
                      <AccountsTableHeadRow>
                        <AccountsTableHeadCell className="text-xs">
                          Particular
                        </AccountsTableHeadCell>
                        <AccountsTableHeadCell className="text-xs">
                          Support
                        </AccountsTableHeadCell>
                        <AccountsTableHeadCell align="right" className="text-xs">
                          Docs
                        </AccountsTableHeadCell>
                        <AccountsTableHeadCell align="right" className="text-xs">
                          Taxable
                        </AccountsTableHeadCell>
                        <AccountsTableHeadCell align="right" className="text-xs">
                          GST
                        </AccountsTableHeadCell>
                      </AccountsTableHeadRow>
                    </AccountsTableHead>
                    <AccountsTableBody>
                      {gstr1Sections.map((s) => (
                        <AccountsTableRow key={s.section_id}>
                          <AccountsTableCell className="text-xs">
                            {s.particulars}
                          </AccountsTableCell>
                          <AccountsTableCell>
                            <StatusPill status={s.support} />
                          </AccountsTableCell>
                          <AccountsTableCell align="right" className="text-xs">
                            {s.document_count ?? "—"}
                          </AccountsTableCell>
                          <AccountsTableCell
                            align="right"
                            className={cn("text-xs", MONEY_AMOUNT_CLASS)}
                          >
                            {moneyOrDash(s.taxable_amount, s.support)}
                          </AccountsTableCell>
                          <AccountsTableCell
                            align="right"
                            className={cn("text-xs", MONEY_AMOUNT_CLASS)}
                          >
                            {moneyOrDash(s.gst_amount, s.support)}
                          </AccountsTableCell>
                        </AccountsTableRow>
                      ))}
                    </AccountsTableBody>
                  </AccountsTable>
                </AccountsTableScroll>
              </SectionPanel>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <SectionPanel
                  title="Annual GSTR-2A reconciliation"
                  support={report.gstr2a.support}
                  reason={report.gstr2a.reason}
                >
                  {report.gstr2a.values ? (
                    <div className="space-y-1">
                      <CountKv
                        label="Imported periods"
                        value={report.gstr2a.values.imported_period_count}
                      />
                      <CountKv
                        label="Missing periods"
                        value={report.gstr2a.values.missing_period_count}
                      />
                      <CountKv
                        label="Matched"
                        value={report.gstr2a.values.counts.matched}
                      />
                      <CountKv
                        label="Partial match"
                        value={report.gstr2a.values.counts.partial_match}
                      />
                      <CountKv
                        label="Missing in books"
                        value={report.gstr2a.values.counts.missing_in_books}
                      />
                      <CountKv
                        label="Missing in GSTR"
                        value={report.gstr2a.values.counts.missing_in_gstr}
                      />
                      <CountKv
                        label="Needs review"
                        value={report.gstr2a.values.counts.needs_review}
                      />
                      <CountKv
                        label="Unresolved"
                        value={report.gstr2a.values.counts.unresolved_review}
                      />
                      <Kv
                        label="Portal GST"
                        value={moneyOrDash(
                          report.gstr2a.values.portal_gst_total,
                        )}
                      />
                      <Kv
                        label="Books GST"
                        value={moneyOrDash(report.gstr2a.values.books_gst_total)}
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No current GSTR-2A imports for this FY — not treated as
                      zero.
                    </p>
                  )}
                </SectionPanel>

                <SectionPanel
                  title="Annual GSTR-2B / ITC workflow"
                  support={report.gstr2b.support}
                  reason={report.gstr2b.reason}
                >
                  {report.gstr2b.values ? (
                    <div className="space-y-1">
                      <CountKv
                        label="Imported periods"
                        value={report.gstr2b.values.imported_period_count}
                      />
                      <CountKv
                        label="Missing periods"
                        value={report.gstr2b.values.missing_period_count}
                      />
                      <CountKv
                        label="ITC Available (portal)"
                        value={report.gstr2b.values.portal_itc_available_count}
                      />
                      <CountKv
                        label="ITC Not Available"
                        value={
                          report.gstr2b.values.portal_itc_not_available_count
                        }
                      />
                      <CountKv
                        label="Unknown"
                        value={report.gstr2b.values.portal_itc_unknown_count}
                      />
                      <CountKv
                        label="To Review"
                        value={report.gstr2b.values.to_review_count}
                      />
                      <CountKv
                        label="Eligible to Claim"
                        value={report.gstr2b.values.eligible_to_claim_count}
                      />
                      <CountKv
                        label="Hold"
                        value={report.gstr2b.values.hold_count}
                      />
                      <CountKv
                        label="Ineligible"
                        value={report.gstr2b.values.ineligible_count}
                      />
                      <CountKv
                        label="Reversal Required (workflow)"
                        value={report.gstr2b.values.reversal_required_count}
                      />
                      <CountKv
                        label="Claimed"
                        value={report.gstr2b.values.claimed_count}
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No current GSTR-2B imports for this FY — not treated as
                      zero.
                    </p>
                  )}
                </SectionPanel>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <SectionPanel
                  title="GSTR-3B Working · 3.1(a)"
                  support={report.gstr3b_working.section_3_1_a.support}
                  reason={report.gstr3b_working.section_3_1_a.reason}
                >
                  {report.gstr3b_working.section_3_1_a.values ? (
                    <div className="space-y-1">
                      <Kv
                        label="Taxable"
                        value={formatMoneyString(
                          report.gstr3b_working.section_3_1_a.values
                            .taxable_value,
                        )}
                      />
                      <Kv
                        label="Output GST"
                        value={formatMoneyString(
                          report.gstr3b_working.section_3_1_a.values.gst_total,
                        )}
                      />
                      <Kv label="Cess" value="Not Available" />
                    </div>
                  ) : null}
                </SectionPanel>

                <SectionPanel
                  title="Suggested Eligible ITC"
                  support={suggested?.support}
                  reason={suggested?.reason}
                >
                  {suggested?.values ? (
                    <div className="space-y-1">
                      <Kv
                        label="IGST"
                        value={formatMoneyString(suggested.values.igst)}
                      />
                      <Kv
                        label="CGST"
                        value={formatMoneyString(suggested.values.cgst)}
                      />
                      <Kv
                        label="SGST"
                        value={formatMoneyString(suggested.values.sgst)}
                      />
                      <Kv
                        label="Cess"
                        value={formatMoneyString(suggested.values.cess)}
                      />
                      <Kv
                        label="Total"
                        value={formatMoneyString(suggested.values.total)}
                      />
                      <CountKv
                        label="Rows"
                        value={suggested.values.row_count}
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Unavailable — missing GSTR-2B periods are not zero.
                    </p>
                  )}
                </SectionPanel>

                <SectionPanel
                  title="Final Claimed ITC"
                  support={finalClaimed?.support}
                  reason={finalClaimed?.reason}
                >
                  {finalClaimed?.values ? (
                    <div className="space-y-1">
                      <Kv
                        label="IGST"
                        value={formatMoneyString(finalClaimed.values.igst)}
                      />
                      <Kv
                        label="CGST"
                        value={formatMoneyString(finalClaimed.values.cgst)}
                      />
                      <Kv
                        label="SGST"
                        value={formatMoneyString(finalClaimed.values.sgst)}
                      />
                      <Kv
                        label="Cess"
                        value={formatMoneyString(finalClaimed.values.cess)}
                      />
                      <Kv
                        label="Total"
                        value={formatMoneyString(finalClaimed.values.total)}
                      />
                      <CountKv
                        label="Rows"
                        value={finalClaimed.values.row_count}
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No CLAIMED items with claim period in this FY.
                    </p>
                  )}
                </SectionPanel>
              </div>

              <SectionPanel
                title="Health / compliance indicators"
              >
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  <CountKv
                    label="Unresolved recon"
                    value={report.health.unresolved_reconciliation_count}
                  />
                  <CountKv
                    label="Missing in books"
                    value={report.health.missing_in_books_count}
                  />
                  <CountKv
                    label="Missing in GSTR"
                    value={report.health.missing_in_gstr_count}
                  />
                  <CountKv
                    label="ITC To Review"
                    value={report.health.itc_to_review_count}
                  />
                  <CountKv
                    label="ITC Hold"
                    value={report.health.itc_hold_count}
                  />
                  <CountKv
                    label="ITC Ineligible"
                    value={report.health.itc_ineligible_count}
                  />
                  <CountKv
                    label="Reversal Required (workflow)"
                    value={report.health.reversal_required_workflow_count}
                  />
                  <CountKv
                    label="Ambiguous 0%-tax"
                    value={report.health.ambiguous_zero_tax_quarantine_count}
                  />
                </div>
                {report.health.warnings.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground list-disc pl-4">
                    {report.health.warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                ) : null}
                <p className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  Tax payment / filing / GSTR-9: Not Implemented. Parser
                  confidence: {report.health.parser_confidence}.
                </p>
              </SectionPanel>
            </>
          ) : null}
        </AccountsReportBody>
      </div>
    </AccountsPageShell>
  );
}
