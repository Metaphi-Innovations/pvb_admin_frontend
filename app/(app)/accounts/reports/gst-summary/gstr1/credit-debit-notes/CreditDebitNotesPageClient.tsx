"use client";

import { useCallback, useEffect, useMemo, useState, Fragment, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  FileText,
  IndianRupee,
  Receipt,
  Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsListingTableCard } from "@/components/accounts/AccountsListingHeader";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
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
import {
  AccountsColumnFilterProvider,
  SortTh,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
import {
  ReportFilterRow,
  ReportDateRangeFilter,
  ReportFinancialYearFilter,
  ReportBranchMultiFilter,
  ReportCustomerMultiFilter,
  ReportWarehouseMultiFilter,
  ReportMoreFilters,
  ReportFilterSummary,
  ReportFilterField,
  ReportStatusMultiFilter,
  ACCOUNTS_FILTER_LABEL_CLASS as filterLabelClass,
  ACCOUNTS_FILTER_CONTROL_CLASS as filterControlClass,
  REPORT_BRANCH_OPTIONS,
} from "@/components/accounts/ReportFilters";
import {
  buildBranchFilterSummary,
  buildEntityFilterSummary,
  countActiveMoreFilters,
  formatMultiSelectLabel,
  isMultiFilterActive,
  normalizeMultiFilter,
} from "@/lib/accounts/report-multi-filter-utils";
import type { ReportFilterSummaryItem } from "@/lib/accounts/report-multi-filter-utils";
import {
  resolveBranchFilterLabel,
  resolveWarehouseFilterLabel,
} from "../../gst-summary-data";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { formatMoney, MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
import { useClientMounted } from "@/lib/use-client-mounted";
import { cn } from "@/lib/utils";
import { ensureFinancialYearsCurrent, loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { getActiveFinancialYearId } from "@/lib/accounts/day-book-data";
import { resolveFinancialYearLabel } from "@/lib/accounts/gst-summary-compute";
import type { DateRangePresetId } from "@/lib/accounts/report-date-presets";
import {
  buildGstCreditDebitFilterQuery,
  buildGstCreditDebitReport,
  getGstNoteBranchOptions,
  getGstNoteCustomerOptions,
  getGstNoteWarehouseOptions,
  parseGstCreditDebitFiltersFromSearch,
  resolveGstNoteExceptionFixAction,
  subsectionLabel,
  type GstCreditDebitFilters,
  type GstCreditDebitNoteRow,
  type GstNoteStatusFilter,
  type GstNoteSubsection,
  type GstNoteTypeFilter,
} from "@/lib/accounts/gstr1-credit-debit-compute";
import { exportGstCreditDebitToExcel, exportGstCreditDebitToPdf } from "./gstr1-credit-debit-export";
import { CreditDebitNoteDetailSheet } from "./components/CreditDebitNoteDetailSheet";
import { useDebouncedValue } from "../../../pl/pl-hooks";


function getCdnFilterCell(row: GstCreditDebitNoteRow, colKey: string): string {
  switch (colKey) {
    case "noteNumber":
      return row.noteNumber || "";
    case "originalInvoiceNo":
      return row.originalInvoiceNo || "";
    case "customerName":
      return row.customerName || "";
    case "gstin":
      return row.gstin || "";
    case "registrationType":
      return row.registrationType || "";
    case "reason":
      return row.reason || "";
    case "status":
      return row.status || "";
    default:
      return "";
  }
}

function CdnFilteredRows({
  rows,
  children,
}: {
  rows: GstCreditDebitNoteRow[];
  children: (visible: GstCreditDebitNoteRow[]) => ReactNode;
}) {
  const visible = useAccountsFilteredRows(rows);
  return <>{children(visible)}</>;
}


const PLACEHOLDER_DATE = "2025-04-01";
const COL_COUNT = 18;

const NOTE_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "credit", label: "Credit Note" },
  { value: "debit", label: "Debit Note" },
];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "valid", label: "Valid" },
  { value: "exception", label: "Exception" },
];

const SUBSECTION_OPTIONS: { value: GstCreditDebitFilters["subsection"]; label: string }[] = [
  { value: "all", label: "All sections" },
  { value: "credit-notes-registered", label: "CN — Registered" },
  { value: "credit-notes-unregistered", label: "CN — Unregistered" },
  { value: "debit-notes-registered", label: "DN — Registered" },
  { value: "debit-notes-unregistered", label: "DN — Unregistered" },
];

function defaultFyDateRange(): { from: string; to: string; fyId: string } {
  ensureFinancialYearsCurrent();
  const activeFyId = getActiveFinancialYearId();
  const fy = loadFinancialYears().find((f) => f.id === activeFyId);
  const today = new Date().toISOString().slice(0, 10);
  if (!fy) return { from: PLACEHOLDER_DATE, to: today, fyId: "all" };
  return {
    from: fy.startDate,
    to: today < fy.endDate ? today : fy.endDate,
    fyId: String(fy.id),
  };
}

function NoteStatusBadge({ status }: { status: "valid" | "exception" }) {
  if (status === "valid") {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Valid
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-700">
      <AlertTriangle className="w-3 h-3" />
      Exception
    </span>
  );
}

function RateBreakupRows({ row }: { row: GstCreditDebitNoteRow }) {
  return (
    <>
      {row.rateBreakups.map((b) => (
        <AccountsTableRow key={`${row.rowKey}-${b.ratePct}`} className="bg-muted/10">
          <AccountsTableCell className="text-xs text-muted-foreground pl-10" colSpan={8}>
            GST @ {b.ratePct}%
          </AccountsTableCell>
          <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
            {formatMoney(b.taxableValue)}
          </AccountsTableCell>
          <AccountsTableCell className="text-xs text-muted-foreground">{b.ratePct}%</AccountsTableCell>
          <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
            {formatMoney(b.cgst)}
          </AccountsTableCell>
          <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
            {formatMoney(b.sgst)}
          </AccountsTableCell>
          <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
            {formatMoney(b.igst)}
          </AccountsTableCell>
          <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
            {formatMoney(b.cess)}
          </AccountsTableCell>
          <AccountsTableCell align="right" money className={cn("text-xs", MONEY_AMOUNT_CLASS)}>
            {formatMoney(b.totalTax)}
          </AccountsTableCell>
          <AccountsTableCell colSpan={3} />
        </AccountsTableRow>
      ))}
    </>
  );
}

function SectionHeaderRow({ label }: { label: string }) {
  return (
    <AccountsTableRow className="bg-navy-50/40 hover:bg-navy-50/40">
      <AccountsTableCell colSpan={COL_COUNT} className="py-2">
        <p className="text-xs font-bold text-navy-700 uppercase tracking-wide">{label}</p>
      </AccountsTableCell>
    </AccountsTableRow>
  );
}

export default function CreditDebitNotesPageClient() {
  const mounted = useClientMounted();
  const searchParams = useSearchParams();

  const [preset, setPreset] = useState<DateRangePresetId>("custom");
  const [dateFrom, setDateFrom] = useState(PLACEHOLDER_DATE);
  const [dateTo, setDateTo] = useState(PLACEHOLDER_DATE);
  const [datesReady, setDatesReady] = useState(false);
  const [financialYearId, setFinancialYearId] = useState("all");
  const [branch, setBranch] = useState<string[]>([]);
  const [warehouse, setWarehouse] = useState<string[]>([]);
  const [customerId, setCustomerId] = useState<string[]>([]);
  const [noteTypes, setNoteTypes] = useState<string[]>([]);
  const [noteNo, setNoteNo] = useState("");
  const [statuses, setStatuses] = useState<string[]>([]);
  const [subsection, setSubsection] = useState<GstCreditDebitFilters["subsection"]>("all");
  const [exporting, setExporting] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [viewRow, setViewRow] = useState<GstCreditDebitNoteRow | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const debouncedNoteNo = useDebouncedValue(noteNo, 300);

  useEffect(() => {
    const { from, to, fyId } = defaultFyDateRange();
    setDateFrom(from);
    setDateTo(to);
    setFinancialYearId(fyId);
    setDatesReady(true);
  }, []);

  useEffect(() => {
    if (!datesReady) return;
    const qs = searchParams.toString();
    if (!qs) return;
    const { from, to, fyId } = defaultFyDateRange();
    const parsed = parseGstCreditDebitFiltersFromSearch(qs, {
      financialYearId: fyId,
      dateFrom: from,
      dateTo: to,
      branch: [],
      warehouse: [],
      customerId: [],
      noteType: [],
      status: [],
      noteNo: "",
      subsection: "all",
    });
    setFinancialYearId(parsed.financialYearId);
    setDateFrom(parsed.dateFrom);
    setDateTo(parsed.dateTo);
    setBranch(normalizeMultiFilter(parsed.branch));
    setWarehouse(normalizeMultiFilter(parsed.warehouse));
    setCustomerId(normalizeMultiFilter(parsed.customerId));
    setNoteTypes(parsed.noteType);
    setNoteNo(parsed.noteNo);
    setStatuses(parsed.status);
    setSubsection(parsed.subsection);
    setPreset("custom");
  }, [searchParams, datesReady]);

  useEffect(() => {
    const onFocus = () => setRefreshKey((k) => k + 1);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const handleFinancialYearChange = useCallback((fyId: string) => {
    setFinancialYearId(fyId);
    if (fyId !== "all") {
      const fy = loadFinancialYears().find((f) => String(f.id) === fyId);
      if (fy) {
        setDateFrom(fy.startDate);
        const today = new Date().toISOString().slice(0, 10);
        setDateTo(today < fy.endDate ? today : fy.endDate);
        setPreset("custom");
      }
    }
  }, []);

  const noteFilters = useMemo(
    (): GstCreditDebitFilters => ({
      financialYearId,
      dateFrom,
      dateTo,
      branch,
      warehouse,
      customerId,
      noteType: noteTypes,
      noteNo: debouncedNoteNo,
      status: statuses,
      subsection,
    }),
    [
      financialYearId,
      dateFrom,
      dateTo,
      branch,
      warehouse,
      customerId,
      noteTypes,
      debouncedNoteNo,
      statuses,
      subsection,
      refreshKey,
    ],
  );

  const branchOptions = useMemo(
    () => (mounted ? getGstNoteBranchOptions() : REPORT_BRANCH_OPTIONS),
    [mounted, noteFilters],
  );
  const warehouseOptions = useMemo(
    () => (mounted ? getGstNoteWarehouseOptions() : []),
    [mounted, noteFilters],
  );
  const customerOptions = useMemo(
    () => (mounted ? getGstNoteCustomerOptions() : []),
    [mounted, noteFilters],
  );
  const customerMultiOptions = useMemo(
    () =>
      customerOptions.map((c) => ({
        id: Number(c.id),
        customerName: c.name,
      })),
    [customerOptions],
  );
  const customerSelectOptions = useMemo(
    () => customerOptions.map((c) => ({ value: c.id, label: c.name })),
    [customerOptions],
  );
  const warehouseOptionsForFilter = warehouseOptions.filter((w) => w !== "all");
  const moreFilterCount = countActiveMoreFilters({ warehouse });

  const report = useMemo(() => {
    if (!mounted || !datesReady) {
      return {
        rows: [],
        totals: {
          totalCreditNotes: 0,
          totalDebitNotes: 0,
          totalTaxableValue: 0,
          totalGst: 0,
          totalExceptions: 0,
        },
        hasData: false,
      };
    }
    return buildGstCreditDebitReport(noteFilters);
  }, [mounted, datesReady, noteFilters]);

  const backHref = `/accounts/reports/gst-summary/gstr1?${buildGstCreditDebitFilterQuery({
    ...noteFilters,
    customerId: [],
    noteType: [],
    status: [],
    noteNo: "",
    subsection: "all",
  })}`;

  const hasFilters =
    isMultiFilterActive(branch) ||
    isMultiFilterActive(warehouse) ||
    isMultiFilterActive(customerId) ||
    noteTypes.length > 0 ||
    statuses.length > 0 ||
    subsection !== "all" ||
    noteNo.trim() !== "";

  const resetFilters = () => {
    setBranch([]);
    setWarehouse([]);
    setCustomerId([]);
    setNoteTypes([]);
    setStatuses([]);
    setSubsection("all");
    setNoteNo("");
  };

  const filterSummaryItems = useMemo(
    () =>
      [
        buildBranchFilterSummary(normalizeMultiFilter(branch), () => setBranch([])),
        buildEntityFilterSummary(
          "customer",
          "Customers",
          normalizeMultiFilter(customerId),
          customerSelectOptions,
          () => setCustomerId([]),
        ),
        buildEntityFilterSummary(
          "warehouse",
          "Warehouses",
          normalizeMultiFilter(warehouse),
          warehouseOptionsForFilter.map((w) => ({ value: w, label: w })),
          () => setWarehouse([]),
        ),
      ].filter((item): item is ReportFilterSummaryItem => item != null),
    [branch, customerId, warehouse, customerSelectOptions, warehouseOptionsForFilter],
  );

  const exportMeta = useMemo(() => {
    return {
      financialYear: resolveFinancialYearLabel(financialYearId),
      dateFrom,
      dateTo,
      branch: resolveBranchFilterLabel(branch),
      warehouse: resolveWarehouseFilterLabel(warehouse),
      customer: formatMultiSelectLabel(
        normalizeMultiFilter(customerId),
        customerSelectOptions,
        "Customer",
        "All customers",
      ),
      noteType: formatMultiSelectLabel(noteTypes, NOTE_TYPE_OPTIONS, "Type", "All types"),
      noteNo: debouncedNoteNo,
      status: formatMultiSelectLabel(statuses, STATUS_OPTIONS, "Status", "All"),
      subsection:
        SUBSECTION_OPTIONS.find((o) => o.value === subsection)?.label ?? subsection,
    };
  }, [
    financialYearId,
    dateFrom,
    dateTo,
    branch,
    warehouse,
    customerId,
    customerSelectOptions,
    noteTypes,
    debouncedNoteNo,
    statuses,
    subsection,
  ]);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      await exportGstCreditDebitToExcel(report.rows, report.totals, exportMeta);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    exportGstCreditDebitToPdf(report.rows, report.totals, exportMeta);
  };

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const filterBar = (
    <>
      <ReportFilterRow
        className="items-end gap-2 flex-wrap"
        end={
          <AccountsExportMenu
            onExcel={handleExportExcel}
            onPdf={handleExportPdf}
            disabled={exporting || !report.hasData}
          />
        }
      >
        <ReportFinancialYearFilter value={financialYearId} onChange={handleFinancialYearChange} />
        <ReportDateRangeFilter
          preset={preset}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onPresetChange={setPreset}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
        />
        <ReportBranchMultiFilter values={branch} onChange={setBranch} options={branchOptions} />
        <ReportCustomerMultiFilter
          values={customerId}
          onChange={setCustomerId}
          customers={customerMultiOptions}
        />
        <ReportMoreFilters activeCount={moreFilterCount}>
          <ReportWarehouseMultiFilter
            values={warehouse}
            onChange={setWarehouse}
            options={warehouseOptionsForFilter}
          />
        </ReportMoreFilters>
        <ReportStatusMultiFilter
          label="Note Type"
          values={noteTypes}
          onChange={setNoteTypes}
          options={NOTE_TYPE_OPTIONS}
        />
        <ReportFilterField label="Section" minWidthClass="min-w-[160px]">
          <Select
            value={subsection}
            onValueChange={(v) => setSubsection(v as GstCreditDebitFilters["subsection"])}
          >
            <SelectTrigger className={cn(filterControlClass, "mt-0 w-full")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUBSECTION_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ReportFilterField>
        <ReportFilterField label="Note Number" minWidthClass="min-w-[180px]">
          <Input
            value={noteNo}
            onChange={(e) => setNoteNo(e.target.value)}
            placeholder="Search note…"
            className={cn(filterControlClass, "mt-0 w-full")}
          />
        </ReportFilterField>
        <ReportStatusMultiFilter
          label="Status"
          values={statuses}
          onChange={setStatuses}
          options={STATUS_OPTIONS}
        />
        {hasFilters && (
          <Button variant="outline" size="sm" className="h-8 text-sm px-2" onClick={resetFilters}>
            Reset
          </Button>
        )}
      </ReportFilterRow>
      <ReportFilterSummary items={filterSummaryItems} />
    </>
  );

  const { totals } = report;

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "GST Summary", "Credit / Debit Notes")}
      title="Credit / Debit Notes"
      description="Outward credit and debit notes classified by customer GST registration for GSTR-1."
      hideDescription
      layout="split"
      className="h-full min-h-0"
      actions={
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" asChild>
          <Link href={backHref}>
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
          </Link>
        </Button>
      }
      filters={filterBar}
    >
      <AccountsReportBody>
        <AccountsReportKpiGrid>
          <AccountsReportKpiCard
            label="Total Credit Notes"
            value={totals.totalCreditNotes}
            icon={Receipt}
            isCount
          />
          <AccountsReportKpiCard
            label="Total Debit Notes"
            value={totals.totalDebitNotes}
            icon={FileText}
            isCount
          />
          <AccountsReportKpiCard
            label="Total Taxable Value"
            value={totals.totalTaxableValue}
            icon={IndianRupee}
          />
          <AccountsReportKpiCard label="Total GST" value={totals.totalGst} icon={Scale} />
          <AccountsReportKpiCard
            label="Total Exceptions"
            value={totals.totalExceptions}
            icon={AlertTriangle}
            warning={totals.totalExceptions > 0}
            isCount
          />
        </AccountsReportKpiGrid>

        <AccountsListingTableCard className="flex-1 min-h-0 flex flex-col">
          {!mounted || !datesReady ? (
            <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
              Loading credit / debit notes…
            </div>
          ) : !report.hasData ? (
            <div className="accounts-table-empty py-4 text-center">
              <p className="text-sm text-muted-foreground">
                No credit or debit notes match the selected filters.
              </p>
              {hasFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="block mx-auto mt-1 text-brand-600 hover:underline text-xs"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <AccountsColumnFilterProvider
              rows={report.rows}
              getCellValue={getCdnFilterCell}
            >
            <AccountsTableScroll className="flex-1 min-h-0">
              <AccountsTable minWidth={1800}>
                <AccountsTableHead>
                  <AccountsTableHeadRow>
                    <SortTh label="" colKey="_expand" sortable={false} filterable={false} className="w-8" />
                    <SortTh label="Note Date" colKey="noteDate" sortable={false} filterable={false} />
                    <SortTh label="Note Number" colKey="noteNumber" sortable={false} />
                    <SortTh label="Original Invoice No." colKey="originalInvoiceNo" sortable={false} />
                    <SortTh label="Original Invoice Date" colKey="originalInvoiceDate" sortable={false} filterable={false} />
                    <SortTh label="Customer Name" colKey="customerName" sortable={false} />
                    <SortTh label="GSTIN" colKey="gstin" sortable={false} />
                    <SortTh label="Registration Type" colKey="registrationType" sortable={false} />
                    <SortTh label="Taxable Value" colKey="taxableValue" sortable={false} filterable={false} align="right" />
                    <SortTh label="GST Rate" colKey="gstRate" sortable={false} filterable={false} />
                    <SortTh label="CGST" colKey="cgst" sortable={false} filterable={false} align="right" />
                    <SortTh label="SGST" colKey="sgst" sortable={false} filterable={false} align="right" />
                    <SortTh label="IGST" colKey="igst" sortable={false} filterable={false} align="right" />
                    <SortTh label="Cess" colKey="cess" sortable={false} filterable={false} align="right" />
                    <SortTh label="Total Amount" colKey="totalAmount" sortable={false} filterable={false} align="right" />
                    <SortTh label="Reason" colKey="reason" sortable={false} />
                    <SortTh label="Status" colKey="status" sortable={false} />
                    <SortTh label="Action" colKey="_actions" sortable={false} filterable={false} className="w-24" />
                  </AccountsTableHeadRow>
                </AccountsTableHead>
                <AccountsTableBody>
                  <CdnFilteredRows rows={report.rows}>
                    {(visibleRows) => {
                      let lastSubsection: GstNoteSubsection | null = null;
                      return visibleRows.map((row) => {
                    const showSectionHeader =
                      subsection === "all" && row.subsection !== lastSubsection;
                    if (showSectionHeader) lastSubsection = row.subsection;

                    const isExpanded = expandedKeys.has(row.rowKey);
                    const primaryFix =
                      row.status === "exception" && row.exceptions[0]
                        ? resolveGstNoteExceptionFixAction(row.exceptions[0].code, row)
                        : null;

                    return (
                      <Fragment key={row.rowKey}>
                        {showSectionHeader && (
                          <SectionHeaderRow label={subsectionLabel(row.subsection)} />
                        )}
                        <AccountsTableRow
                          className={cn(
                            "group",
                            row.status === "exception" && "bg-amber-50/30",
                          )}
                        >
                          <AccountsTableCell className="w-8 px-2">
                            {row.hasMultipleRates ? (
                              <button
                                type="button"
                                onClick={() => toggleExpand(row.rowKey)}
                                className="p-0.5 hover:bg-muted rounded"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                                )}
                              </button>
                            ) : null}
                          </AccountsTableCell>
                          <AccountsTableCell className="text-xs whitespace-nowrap">
                            {row.noteDate}
                          </AccountsTableCell>
                          <AccountsTableCell className="font-mono text-xs font-semibold text-brand-700">
                            {row.noteNumber}
                          </AccountsTableCell>
                          <AccountsTableCell className="font-mono text-xs text-brand-700">
                            {row.originalInvoiceNo}
                          </AccountsTableCell>
                          <AccountsTableCell className="text-xs whitespace-nowrap">
                            {row.originalInvoiceDate}
                          </AccountsTableCell>
                          <AccountsTableCell className="text-xs font-semibold">
                            {row.customerName}
                          </AccountsTableCell>
                          <AccountsTableCell className="font-mono text-xs">
                            {row.gstin}
                          </AccountsTableCell>
                          <AccountsTableCell className="text-xs">{row.registrationType}</AccountsTableCell>
                          <AccountsTableCell align="right" money className={MONEY_AMOUNT_CLASS}>
                            {formatMoney(row.taxableValue)}
                          </AccountsTableCell>
                          <AccountsTableCell className="text-xs">{row.gstRateLabel}</AccountsTableCell>
                          <AccountsTableCell align="right" money className={MONEY_AMOUNT_CLASS}>
                            {formatMoney(row.cgst)}
                          </AccountsTableCell>
                          <AccountsTableCell align="right" money className={MONEY_AMOUNT_CLASS}>
                            {formatMoney(row.sgst)}
                          </AccountsTableCell>
                          <AccountsTableCell align="right" money className={MONEY_AMOUNT_CLASS}>
                            {formatMoney(row.igst)}
                          </AccountsTableCell>
                          <AccountsTableCell align="right" money className={MONEY_AMOUNT_CLASS}>
                            {formatMoney(row.cess)}
                          </AccountsTableCell>
                          <AccountsTableCell align="right" money className={MONEY_AMOUNT_CLASS}>
                            {formatMoney(row.totalAmount)}
                          </AccountsTableCell>
                          <AccountsTableCell className="text-xs max-w-[140px] truncate" title={row.reason}>
                            {row.reason}
                          </AccountsTableCell>
                          <AccountsTableCell>
                            <div className="flex flex-col gap-0.5">
                              <NoteStatusBadge status={row.status} />
                              {row.status === "exception" && row.exceptions[0] && (
                                <span
                                  className="text-[10px] text-amber-700 truncate max-w-[120px]"
                                  title={row.exceptions.map((e) => e.message).join("; ")}
                                >
                                  {row.exceptions[0].message}
                                </span>
                              )}
                            </div>
                          </AccountsTableCell>
                          <AccountsTableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-[11px] px-2"
                                onClick={() => setViewRow(row)}
                              >
                                View
                              </Button>
                              {primaryFix && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-[10px] px-1.5 opacity-0 group-hover:opacity-100"
                                  asChild
                                >
                                  <Link href={primaryFix.href}>{primaryFix.label}</Link>
                                </Button>
                              )}
                            </div>
                          </AccountsTableCell>
                        </AccountsTableRow>
                        {isExpanded && row.hasMultipleRates && <RateBreakupRows row={row} />}
                      </Fragment>
                    );
                      });
                    }}
                  </CdnFilteredRows>
                </AccountsTableBody>
              </AccountsTable>
            </AccountsTableScroll>
            </AccountsColumnFilterProvider>
          )}
        </AccountsListingTableCard>
      </AccountsReportBody>

      <CreditDebitNoteDetailSheet
        row={viewRow}
        open={viewRow != null}
        onClose={() => setViewRow(null)}
      />
    </AccountsPageShell>
  );
}
