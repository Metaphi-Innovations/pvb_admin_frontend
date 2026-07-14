"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Eye,
  FileMinus2,
  FilePlus2,
  FileText,
  MoreVertical,
  Receipt,
  Scale,
  Truck,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsListingTableCard } from "@/components/accounts/AccountsListingHeader";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
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
import type { AccountsColumnFilterConfig } from "@/lib/accounts/column-filter-types";
import type { GstReportFilters } from "@/lib/accounts/gst-report-filters";
import { formatMoney, MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import {
  AccountsClearAllColumnFiltersButton,
  AccountsColumnFilterProvider,
  AccountsColumnHeader,
  SortTh,
  useAccountsColumnFilterContext,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
import { useGstReportFilters } from "../useGstReportFilters";
import { GstReportNavTabs } from "../components/GstReportNavTabs";
import { buildAnnualGstMonthLinks } from "./annual-gst-month-links";
import { buildAnnualGstSummaryReport } from "./annual-gst-summary-data";
import { exportAnnualGstSummaryReport } from "./annual-gst-summary-export";
import { AnnualGstFilterBar } from "./components/AnnualGstFilterBar";
import { AnnualGstMonthDrillSheet } from "./components/AnnualGstMonthDrillSheet";
import type {
  AnnualGstMonthRow,
  AnnualGstParticularRow,
  AnnualGstReport,
  AnnualGstSummaryCards,
} from "./annual-gst-summary-types";

const ANNUAL_GST_COLUMN_CONFIG: AccountsColumnFilterConfig = {
  monthLabel: { type: "text" },
  salesValue: { type: "amount" },
  purchaseValue: { type: "amount" },
  outputGst: { type: "amount" },
  inputGst: { type: "amount" },
  outputCgst: { type: "amount" },
  outputSgst: { type: "amount" },
  outputIgst: { type: "amount" },
  inputCgst: { type: "amount" },
  inputSgst: { type: "amount" },
  inputIgst: { type: "amount" },
  netGst: { type: "amount" },
};

function getAnnualGstCellValue(row: AnnualGstMonthRow, key: string): unknown {
  switch (key) {
    case "monthLabel":
      return row.monthLabel;
    case "salesValue":
      return row.salesValue;
    case "purchaseValue":
      return row.purchaseValue;
    case "outputGst":
      return row.outputCgst + row.outputSgst + row.outputIgst;
    case "inputGst":
      return row.inputCgst + row.inputSgst + row.inputIgst;
    case "outputCgst":
      return row.outputCgst;
    case "outputSgst":
      return row.outputSgst;
    case "outputIgst":
      return row.outputIgst;
    case "inputCgst":
      return row.inputCgst;
    case "inputSgst":
      return row.inputSgst;
    case "inputIgst":
      return row.inputIgst;
    case "netGst":
      return row.netGst;
    default:
      return (row as unknown as Record<string, unknown>)[key];
  }
}
function MonthAmountLink({
  href,
  amount,
  title,
  className,
}: {
  href: string;
  amount: number;
  title: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      title={title}
      className={cn(
        "inline-block tabular-nums hover:text-brand-700 hover:underline underline-offset-2 transition-colors",
        className,
      )}
    >
      {formatMoney(amount)}
    </Link>
  );
}

function MonthRowActions({
  row,
  filters,
  onView,
}: {
  row: AnnualGstMonthRow;
  filters: GstReportFilters;
  onView: () => void;
}) {
  const links = buildAnnualGstMonthLinks(row.monthKey, filters);
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="sm"
        className="h-7 px-2 text-[11px] gap-1"
        onClick={onView}
      >
        <Eye className="w-3 h-3" />
        View
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="p-1.5 hover:bg-muted rounded-md transition-colors"
            aria-label={`Open ${row.monthLabel} reports`}
          >
            <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-widest py-1">
            Drill to {row.monthLabel}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild className="text-xs gap-2 cursor-pointer">
            <Link href={links.gstr1}>
              <FileText className="w-3.5 h-3.5" /> GSTR-1
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="text-xs gap-2 cursor-pointer">
            <Link href={links.gstr3b}>
              <Scale className="w-3.5 h-3.5" /> GSTR-3B
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild className="text-xs gap-2 cursor-pointer">
            <Link href={links.salesInvoices}>
              <FileText className="w-3.5 h-3.5" /> Sales Invoices
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="text-xs gap-2 cursor-pointer">
            <Link href={links.purchaseInvoices}>
              <Truck className="w-3.5 h-3.5" /> Purchase Invoices
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="text-xs gap-2 cursor-pointer">
            <Link href={links.creditNotes}>
              <FileMinus2 className="w-3.5 h-3.5" /> Credit Notes
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="text-xs gap-2 cursor-pointer">
            <Link href={links.debitNotes}>
              <FilePlus2 className="w-3.5 h-3.5" /> Debit Notes
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
function SummaryCards({ summary }: { summary: AnnualGstSummaryCards }) {
  const cards = [
    {
      label: "Total Taxable Outward",
      value: summary.totalTaxableOutward,
      icon: ArrowUpRight,
      border: "border-l-brand-600",
      iconBg: "bg-brand-50",
      iconColor: "text-brand-600",
    },
    {
      label: "Total Taxable Inward",
      value: summary.totalTaxableInward,
      icon: ArrowDownLeft,
      border: "border-l-navy-600",
      iconBg: "bg-navy-50",
      iconColor: "text-navy-600",
    },
    {
      label: "Total Output GST",
      value: summary.totalOutputGst,
      icon: Receipt,
      border: "border-l-amber-500",
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
    },
    {
      label: "Total Input GST",
      value: summary.totalInputGst,
      icon: Wallet,
      border: "border-l-leaf-600",
      iconBg: "bg-leaf-50",
      iconColor: "text-leaf-600",
    },
    {
      label: summary.isRefundable ? "Net GST Refundable" : "Net GST Payable",
      value: summary.netGstPayableOrRefundable,
      icon: Scale,
      border: summary.isRefundable ? "border-l-emerald-500" : "border-l-brand-600",
      iconBg: summary.isRefundable ? "bg-emerald-50" : "bg-brand-50",
      iconColor: summary.isRefundable ? "text-emerald-600" : "text-brand-600",
    },
    {
      label: "Total Credit Notes",
      value: summary.totalCreditNotes,
      icon: FileMinus2,
      border: "border-l-sky-500",
      iconBg: "bg-sky-50",
      iconColor: "text-sky-600",
    },
    {
      label: "Total Debit Notes",
      value: summary.totalDebitNotes,
      icon: FilePlus2,
      border: "border-l-purple-500",
      iconBg: "bg-purple-50",
      iconColor: "text-purple-600",
    },
    {
      label: "Total GST Liability",
      value: summary.totalGstLiability,
      icon: Scale,
      border: "border-l-red-500",
      iconBg: "bg-red-50",
      iconColor: "text-red-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={cn(
              "bg-white rounded-xl border border-border p-3 flex items-center gap-3 shadow-sm border-l-4",
              card.border,
            )}
          >
            <div
              className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                card.iconBg,
              )}
            >
              <Icon className={cn("w-4 h-4", card.iconColor)} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground leading-none tabular-nums">
                {formatMoney(card.value)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight truncate">
                {card.label}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ParticularSummaryTable({
  title,
  rows,
}: {
  title: string;
  rows: AnnualGstParticularRow[];
}) {
  return (
    <AccountsListingTableCard>
      <div className="px-3 py-2 border-b border-border bg-muted/20">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {title}
        </p>
      </div>
      <AccountsTableScroll>
        <AccountsTable minWidth={480}>
          <AccountsTableHead>
            <AccountsTableHeadRow>
              <AccountsTableHeadCell className="text-xs font-semibold">
                Particular
              </AccountsTableHeadCell>
              <AccountsTableHeadCell align="right" className="text-xs font-semibold">
                Taxable Value
              </AccountsTableHeadCell>
              <AccountsTableHeadCell align="right" className="text-xs font-semibold">
                GST Amount
              </AccountsTableHeadCell>
            </AccountsTableHeadRow>
          </AccountsTableHead>
          <AccountsTableBody>
            {rows.map((row) => (
              <AccountsTableRow
                key={row.particular}
                className={cn(row.isTotal && "bg-brand-50/40 font-semibold")}
              >
                <AccountsTableCell className="text-xs font-medium">
                  {row.particular}
                </AccountsTableCell>
                <AccountsTableCell
                  align="right"
                  money
                  className={cn("text-xs", MONEY_AMOUNT_CLASS)}
                >
                  {formatMoney(row.taxableValue)}
                </AccountsTableCell>
                <AccountsTableCell
                  align="right"
                  money
                  className={cn("text-xs", MONEY_AMOUNT_CLASS)}
                >
                  {formatMoney(row.gstAmount)}
                </AccountsTableCell>
              </AccountsTableRow>
            ))}
          </AccountsTableBody>
        </AccountsTable>
      </AccountsTableScroll>
    </AccountsListingTableCard>
  );
}

function NetGstPositionCard({
  outputGst,
  inputGst,
  netGst,
  isRefundable,
}: {
  outputGst: number;
  inputGst: number;
  netGst: number;
  isRefundable: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden max-w-md">
      <div className="px-4 py-2.5 border-b border-border bg-muted/20">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Annual GST Position
        </p>
      </div>
      <div className="px-4 py-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Output GST</span>
          <span className={cn("font-semibold tabular-nums", MONEY_AMOUNT_CLASS)}>
            {formatMoney(outputGst)}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Less: Input GST</span>
          <span className={cn("font-semibold tabular-nums", MONEY_AMOUNT_CLASS)}>
            {formatMoney(inputGst)}
          </span>
        </div>
        <div className="border-t border-border pt-2 flex items-center justify-between">
          <span className="text-xs font-bold text-foreground">
            {isRefundable ? "Net GST Refundable" : "Net GST Payable"}
          </span>
          <span
            className={cn(
              "text-sm font-bold tabular-nums",
              isRefundable ? "text-emerald-700" : "text-brand-700",
            )}
          >
            {formatMoney(Math.abs(netGst))}
          </span>
        </div>
      </div>
    </div>
  );
}

function monthTotals(months: AnnualGstMonthRow[]): AnnualGstMonthRow {
  const t = months.reduce(
    (acc, m) => {
      acc.salesValue += m.salesValue;
      acc.purchaseValue += m.purchaseValue;
      acc.outputCgst += m.outputCgst;
      acc.outputSgst += m.outputSgst;
      acc.outputIgst += m.outputIgst;
      acc.inputCgst += m.inputCgst;
      acc.inputSgst += m.inputSgst;
      acc.inputIgst += m.inputIgst;
      acc.netGst += m.netGst;
      return acc;
    },
    {
      salesValue: 0,
      purchaseValue: 0,
      outputCgst: 0,
      outputSgst: 0,
      outputIgst: 0,
      inputCgst: 0,
      inputSgst: 0,
      inputIgst: 0,
      netGst: 0,
    },
  );
  return {
    id: "total",
    monthKey: "total",
    monthLabel: "Total",
    salesValue: Math.round(t.salesValue * 100) / 100,
    purchaseValue: Math.round(t.purchaseValue * 100) / 100,
    outputCgst: Math.round(t.outputCgst * 100) / 100,
    outputSgst: Math.round(t.outputSgst * 100) / 100,
    outputIgst: Math.round(t.outputIgst * 100) / 100,
    inputCgst: Math.round(t.inputCgst * 100) / 100,
    inputSgst: Math.round(t.inputSgst * 100) / 100,
    inputIgst: Math.round(t.inputIgst * 100) / 100,
    netGst: Math.round(t.netGst * 100) / 100,
    outward: [],
    inward: [],
  };
}

export default function AnnualComputationPageClient() {
  const filterState = useGstReportFilters();
  const { mounted, datesReady, filters } = filterState;
  const [exporting, setExporting] = useState(false);
  const [drillMonth, setDrillMonth] = useState<AnnualGstMonthRow | null>(null);

  const report = useMemo(() => {
    if (!mounted || !datesReady) return null;
    return buildAnnualGstSummaryReport(filters.financialYearId);
  }, [mounted, datesReady, filters.financialYearId]);

  if (!mounted || !datesReady || !report) {
    return (
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Reports", "GST Summary", "Annual GST Summary")}
        title="Annual GST Summary"
        description="Yearly consolidated GST review for management, audit, and GSTR-9 preparation."
        hideDescription
        layout="split"
        className="h-full min-h-0"
        filters={<AnnualGstFilterBar filterState={filterState} mounted={mounted} />}
        subHeader={<GstReportNavTabs filters={filters} />}
      >
        <div className="flex-1 min-h-0 overflow-y-auto">
          <AccountsReportBody className="space-y-4 pb-4">
            <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
              Loading annual GST summary…
            </div>
          </AccountsReportBody>
        </div>
      </AccountsPageShell>
    );
  }

  return (
    <AccountsColumnFilterProvider
      rows={report.months}
      getCellValue={getAnnualGstCellValue}
      columnConfig={ANNUAL_GST_COLUMN_CONFIG}
      defaultSortKey="monthLabel"
      defaultSortDir="asc"
    >
      <AnnualGstSummaryWithFilters
        filterState={filterState}
        mounted={mounted}
        filters={filters}
        report={report}
        exporting={exporting}
        setExporting={setExporting}
        drillMonth={drillMonth}
        setDrillMonth={setDrillMonth}
      />
    </AccountsColumnFilterProvider>
  );
}

function AnnualGstSummaryWithFilters({
  filterState,
  mounted,
  filters,
  report,
  exporting,
  setExporting,
  drillMonth,
  setDrillMonth,
}: {
  filterState: ReturnType<typeof useGstReportFilters>;
  mounted: boolean;
  filters: GstReportFilters;
  report: AnnualGstReport;
  exporting: boolean;
  setExporting: (v: boolean) => void;
  drillMonth: AnnualGstMonthRow | null;
  setDrillMonth: (m: AnnualGstMonthRow | null) => void;
}) {
  const ctx = useAccountsColumnFilterContext();
  const filteredMonths = useAccountsFilteredRows(report.months);
  const totalRow = useMemo(() => monthTotals(filteredMonths), [filteredMonths]);

  const handleExport = (format: "excel" | "pdf") => {
    setExporting(true);
    try {
      exportAnnualGstSummaryReport(
        {
          ...report,
          months: filteredMonths,
        },
        filters,
        format,
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "GST Summary", "Annual GST Summary")}
      title="Annual GST Summary"
      description="Yearly consolidated GST review for management, audit, and GSTR-9 preparation."
      hideDescription
      layout="split"
      className="h-full min-h-0"
      filters={
        <AnnualGstFilterBar
          filterState={filterState}
          mounted={mounted}
          end={
            <>
              <AccountsClearAllColumnFiltersButton />
              <AccountsExportMenu
                onExcel={() => handleExport("excel")}
                onPdf={() => handleExport("pdf")}
                disabled={exporting || filteredMonths.length === 0}
              />
            </>
          }
        />
      }
      subHeader={<GstReportNavTabs filters={filters} />}
    >
      <div className="flex-1 min-h-0 overflow-y-auto">
        <AccountsReportBody className="space-y-4 pb-4">
          <SummaryCards summary={report.summary} />

          <AccountsListingTableCard className="flex-1 min-h-0 flex flex-col">
            <div className="px-3 py-2 border-b border-border bg-muted/20 flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Monthly GST Summary · {report.financialYearLabel}
                {(ctx?.activeFilterCount ?? 0) > 0 && (
                  <span className="ml-2 font-medium normal-case tracking-normal text-brand-700">
                    · Showing {filteredMonths.length} of {report.months.length} months
                  </span>
                )}
              </p>
              <AccountsClearAllColumnFiltersButton />
            </div>
            <AccountsTableScroll className="flex-1 min-h-0">
                  <AccountsTable minWidth={1380}>
                <AccountsTableHead>
                  <AccountsTableHeadRow>
                    <SortTh
                      label="Month"
                      colKey="monthLabel"
                      filterType="text"
                      className="min-w-[7rem]"
                    />
                    <SortTh
                      label="Sales Value"
                      colKey="salesValue"
                      filterType="amount"
                      align="right"
                    />
                    <SortTh
                      label="Purchase Value"
                      colKey="purchaseValue"
                      filterType="amount"
                      align="right"
                    />
                    <SortTh
                      label="Output GST"
                      colKey="outputGst"
                      filterType="amount"
                      align="right"
                    />
                    <SortTh
                      label="Output CGST"
                      colKey="outputCgst"
                      filterType="amount"
                      align="right"
                    />
                    <SortTh
                      label="Output SGST"
                      colKey="outputSgst"
                      filterType="amount"
                      align="right"
                    />
                    <SortTh
                      label="Output IGST"
                      colKey="outputIgst"
                      filterType="amount"
                      align="right"
                    />
                    <SortTh
                      label="Input GST"
                      colKey="inputGst"
                      filterType="amount"
                      align="right"
                    />
                    <SortTh
                      label="Input CGST"
                      colKey="inputCgst"
                      filterType="amount"
                      align="right"
                    />
                    <SortTh
                      label="Input SGST"
                      colKey="inputSgst"
                      filterType="amount"
                      align="right"
                    />
                    <SortTh
                      label="Input IGST"
                      colKey="inputIgst"
                      filterType="amount"
                      align="right"
                    />
                    <SortTh
                      label="Net GST"
                      colKey="netGst"
                      filterType="amount"
                      align="right"
                    />
                    <AccountsColumnHeader
                      label="Action"
                      colKey="_actions"
                      sortable={false}
                      filterable={false}
                      className="w-28"
                    />
                  </AccountsTableHeadRow>
                </AccountsTableHead>
                <AccountsTableBody>
                  {filteredMonths.length === 0 ? (
                    <AccountsTableRow>
                      <AccountsTableCell colSpan={13} className="accounts-table-empty">
                        <div className="flex flex-col items-center gap-1 py-4">
                          <p className="text-sm text-muted-foreground">
                            No months match the column filters.
                          </p>
                          {(ctx?.activeFilterCount ?? 0) > 0 && (
                            <button
                              type="button"
                              onClick={() => ctx?.clearAllColumnFilters()}
                              className="text-xs text-brand-600 hover:underline"
                            >
                              Clear All Filters
                            </button>
                          )}
                        </div>
                      </AccountsTableCell>
                    </AccountsTableRow>
                  ) : (
                    filteredMonths.map((row) => {
                      const links = buildAnnualGstMonthLinks(row.monthKey, filters);
                      const outputGst = row.outputCgst + row.outputSgst + row.outputIgst;
                      const inputGst = row.inputCgst + row.inputSgst + row.inputIgst;
                      return (
                        <AccountsTableRow key={row.id} className="group">
                          <AccountsTableCell className="text-xs font-medium">
                            <button
                              type="button"
                              onClick={() => setDrillMonth(row)}
                              className="text-left font-medium text-brand-700 hover:underline underline-offset-2"
                              title={`Open ${row.monthLabel} drill-down`}
                            >
                              {row.monthLabel}
                            </button>
                          </AccountsTableCell>
                          <AccountsTableCell
                            align="right"
                            money
                            className={cn("text-xs", MONEY_AMOUNT_CLASS)}
                          >
                            <MonthAmountLink
                              href={links.gstr1}
                              amount={row.salesValue}
                              title={`Open GSTR-1 for ${row.monthLabel}`}
                            />
                          </AccountsTableCell>
                          <AccountsTableCell
                            align="right"
                            money
                            className={cn("text-xs", MONEY_AMOUNT_CLASS)}
                          >
                            <MonthAmountLink
                              href={links.purchaseInvoices}
                              amount={row.purchaseValue}
                              title={`Open purchase invoices for ${row.monthLabel}`}
                            />
                          </AccountsTableCell>
                          <AccountsTableCell
                            align="right"
                            money
                            className={cn("text-xs font-medium", MONEY_AMOUNT_CLASS)}
                          >
                            <MonthAmountLink
                              href={links.gstr1}
                              amount={outputGst}
                              title={`Open GSTR-1 for ${row.monthLabel}`}
                            />
                          </AccountsTableCell>
                          <AccountsTableCell
                            align="right"
                            money
                            className={cn("text-xs", MONEY_AMOUNT_CLASS)}
                          >
                            <MonthAmountLink
                              href={links.gstr1}
                              amount={row.outputCgst}
                              title={`Open GSTR-1 for ${row.monthLabel}`}
                            />
                          </AccountsTableCell>
                          <AccountsTableCell
                            align="right"
                            money
                            className={cn("text-xs", MONEY_AMOUNT_CLASS)}
                          >
                            <MonthAmountLink
                              href={links.gstr1}
                              amount={row.outputSgst}
                              title={`Open GSTR-1 for ${row.monthLabel}`}
                            />
                          </AccountsTableCell>
                          <AccountsTableCell
                            align="right"
                            money
                            className={cn("text-xs", MONEY_AMOUNT_CLASS)}
                          >
                            <MonthAmountLink
                              href={links.gstr1}
                              amount={row.outputIgst}
                              title={`Open GSTR-1 for ${row.monthLabel}`}
                            />
                          </AccountsTableCell>
                          <AccountsTableCell
                            align="right"
                            money
                            className={cn("text-xs font-medium", MONEY_AMOUNT_CLASS)}
                          >
                            <MonthAmountLink
                              href={links.gstr3b}
                              amount={inputGst}
                              title={`Open GSTR-3B for ${row.monthLabel}`}
                            />
                          </AccountsTableCell>
                          <AccountsTableCell
                            align="right"
                            money
                            className={cn("text-xs", MONEY_AMOUNT_CLASS)}
                          >
                            <MonthAmountLink
                              href={links.gstr3b}
                              amount={row.inputCgst}
                              title={`Open GSTR-3B for ${row.monthLabel}`}
                            />
                          </AccountsTableCell>
                          <AccountsTableCell
                            align="right"
                            money
                            className={cn("text-xs", MONEY_AMOUNT_CLASS)}
                          >
                            <MonthAmountLink
                              href={links.gstr3b}
                              amount={row.inputSgst}
                              title={`Open GSTR-3B for ${row.monthLabel}`}
                            />
                          </AccountsTableCell>
                          <AccountsTableCell
                            align="right"
                            money
                            className={cn("text-xs", MONEY_AMOUNT_CLASS)}
                          >
                            <MonthAmountLink
                              href={links.gstr3b}
                              amount={row.inputIgst}
                              title={`Open GSTR-3B for ${row.monthLabel}`}
                            />
                          </AccountsTableCell>
                          <AccountsTableCell
                            align="right"
                            money
                            className={cn(
                              "text-xs font-semibold",
                              MONEY_AMOUNT_CLASS,
                              row.netGst < 0 && "text-emerald-700",
                            )}
                          >
                            <MonthAmountLink
                              href={links.gstr3b}
                              amount={row.netGst}
                              title={`Open GSTR-3B liability for ${row.monthLabel}`}
                              className={cn(
                                "font-semibold",
                                row.netGst < 0 && "text-emerald-700",
                              )}
                            />
                          </AccountsTableCell>
                          <AccountsTableCell>
                            <MonthRowActions
                              row={row}
                              filters={filters}
                              onView={() => setDrillMonth(row)}
                            />
                          </AccountsTableCell>
                        </AccountsTableRow>
                      );
                    })
                  )}
                  {filteredMonths.length > 0 && (
                    <AccountsTableRow className="bg-brand-50/40 font-semibold">
                      <AccountsTableCell className="text-xs font-bold">
                        {totalRow.monthLabel}
                      </AccountsTableCell>
                      <AccountsTableCell
                        align="right"
                        money
                        className={cn("text-xs font-bold", MONEY_AMOUNT_CLASS)}
                      >
                        {formatMoney(totalRow.salesValue)}
                      </AccountsTableCell>
                      <AccountsTableCell
                        align="right"
                        money
                        className={cn("text-xs font-bold", MONEY_AMOUNT_CLASS)}
                      >
                        {formatMoney(totalRow.purchaseValue)}
                      </AccountsTableCell>
                      <AccountsTableCell
                        align="right"
                        money
                        className={cn("text-xs font-bold", MONEY_AMOUNT_CLASS)}
                      >
                        {formatMoney(
                          totalRow.outputCgst + totalRow.outputSgst + totalRow.outputIgst,
                        )}
                      </AccountsTableCell>
                      <AccountsTableCell
                        align="right"
                        money
                        className={cn("text-xs font-bold", MONEY_AMOUNT_CLASS)}
                      >
                        {formatMoney(totalRow.outputCgst)}
                      </AccountsTableCell>
                      <AccountsTableCell
                        align="right"
                        money
                        className={cn("text-xs font-bold", MONEY_AMOUNT_CLASS)}
                      >
                        {formatMoney(totalRow.outputSgst)}
                      </AccountsTableCell>
                      <AccountsTableCell
                        align="right"
                        money
                        className={cn("text-xs font-bold", MONEY_AMOUNT_CLASS)}
                      >
                        {formatMoney(totalRow.outputIgst)}
                      </AccountsTableCell>
                      <AccountsTableCell
                        align="right"
                        money
                        className={cn("text-xs font-bold", MONEY_AMOUNT_CLASS)}
                      >
                        {formatMoney(
                          totalRow.inputCgst + totalRow.inputSgst + totalRow.inputIgst,
                        )}
                      </AccountsTableCell>
                      <AccountsTableCell
                        align="right"
                        money
                        className={cn("text-xs font-bold", MONEY_AMOUNT_CLASS)}
                      >
                        {formatMoney(totalRow.inputCgst)}
                      </AccountsTableCell>
                      <AccountsTableCell
                        align="right"
                        money
                        className={cn("text-xs font-bold", MONEY_AMOUNT_CLASS)}
                      >
                        {formatMoney(totalRow.inputSgst)}
                      </AccountsTableCell>
                      <AccountsTableCell
                        align="right"
                        money
                        className={cn("text-xs font-bold", MONEY_AMOUNT_CLASS)}
                      >
                        {formatMoney(totalRow.inputIgst)}
                      </AccountsTableCell>
                      <AccountsTableCell
                        align="right"
                        money
                        className={cn("text-xs font-bold", MONEY_AMOUNT_CLASS)}
                      >
                        {formatMoney(totalRow.netGst)}
                      </AccountsTableCell>
                      <AccountsTableCell>
                        <span className="text-xs text-muted-foreground">—</span>
                      </AccountsTableCell>
                    </AccountsTableRow>
                  )}
                </AccountsTableBody>
              </AccountsTable>
            </AccountsTableScroll>
          </AccountsListingTableCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ParticularSummaryTable
              title="Annual Outward Supply Summary"
              rows={report.outwardAnnual}
            />
            <ParticularSummaryTable
              title="Annual Inward Supply Summary"
              rows={report.inwardAnnual}
            />
          </div>

          <NetGstPositionCard
            outputGst={report.outputGst}
            inputGst={report.inputGst}
            netGst={report.netGst}
            isRefundable={report.isRefundable}
          />
        </AccountsReportBody>
      </div>

      <AnnualGstMonthDrillSheet
        open={drillMonth != null}
        onClose={() => setDrillMonth(null)}
        month={drillMonth}
        filters={filters}
      />
    </AccountsPageShell>
  );
}
