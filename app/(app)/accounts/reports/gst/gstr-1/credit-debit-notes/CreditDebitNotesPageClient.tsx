"use client";

import { useCallback, useEffect, useMemo, useState, Fragment } from "react";
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
  AccountsTableHeadCell,
  AccountsTableHeadRow,
  AccountsTableRow,
  AccountsTableScroll,
} from "@/components/accounts/AccountsTable";
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

const PLACEHOLDER_DATE = "2025-04-01";
const COL_COUNT = 18;

const NOTE_TYPE_OPTIONS: { value: GstNoteTypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "credit", label: "Credit" },
  { value: "debit", label: "Debit" },
];

const STATUS_OPTIONS: { value: GstNoteStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
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
  const [noteType, setNoteType] = useState<GstNoteTypeFilter>("all");
  const [noteNo, setNoteNo] = useState("");
  const [status, setStatus] = useState<GstNoteStatusFilter>("all");
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
      noteType: "all",
      status: "all",
      noteNo: "",
      subsection: "all",
    });
    setFinancialYearId(parsed.financialYearId);
    setDateFrom(parsed.dateFrom);
    setDateTo(parsed.dateTo);
    setBranch(normalizeMultiFilter(parsed.branch));
    setWarehouse(normalizeMultiFilter(parsed.warehouse));
    setCustomerId(normalizeMultiFilter(parsed.customerId));
    setNoteType(parsed.noteType);
    setNoteNo(parsed.noteNo);
    setStatus(parsed.status);
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
      noteType,
      noteNo: debouncedNoteNo,
      status,
      subsection,
    }),
    [
      financialYearId,
      dateFrom,
      dateTo,
      branch,
      warehouse,
      customerId,
      noteType,
      debouncedNoteNo,
      status,
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

  const backHref = `/accounts/reports/gst?${buildGstCreditDebitFilterQuery({
    ...noteFilters,
    customerId: [],
    noteType: "all",
    status: "all",
    noteNo: "",
    subsection: "all",
  })}`;

  const hasFilters =
    isMultiFilterActive(branch) ||
    isMultiFilterActive(warehouse) ||
    isMultiFilterActive(customerId) ||
    noteType !== "all" ||
    status !== "all" ||
    subsection !== "all" ||
    noteNo.trim() !== "";

  const resetFilters = () => {
    setBranch([]);
    setWarehouse([]);
    setCustomerId([]);
    setNoteType("all");
    setStatus("all");
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
      noteType:
        NOTE_TYPE_OPTIONS.find((o) => o.value === noteType)?.label ?? noteType,
      noteNo: debouncedNoteNo,
      status: STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status,
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
    noteType,
    debouncedNoteNo,
    status,
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
      <ReportFilterRow className="items-end gap-2 flex-wrap">
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
        <ReportFilterField label="Note Type" minWidthClass="min-w-[120px]">
          <Select value={noteType} onValueChange={(v) => setNoteType(v as GstNoteTypeFilter)}>
            <SelectTrigger className={cn(filterControlClass, "mt-0 w-full")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NOTE_TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ReportFilterField>
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
        <ReportFilterField label="Status" minWidthClass="min-w-[120px]">
          <Select value={status} onValueChange={(v) => setStatus(v as GstNoteStatusFilter)}>
            <SelectTrigger className={cn(filterControlClass, "mt-0 w-full")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ReportFilterField>
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
  let lastSubsection: GstNoteSubsection | null = null;

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "GST Summary", "Credit / Debit Notes")}
      title="Credit / Debit Notes"
      description="Outward credit and debit notes classified by customer GST registration for GSTR-1."
      hideDescription
      layout="split"
      className="h-full min-h-0"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" asChild>
            <Link href={backHref}>
              <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
            </Link>
          </Button>
          <AccountsExportMenu
            onExcel={handleExportExcel}
            onPdf={handleExportPdf}
            disabled={exporting || !report.hasData}
          />
        </div>
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
            <AccountsTableScroll className="flex-1 min-h-0">
              <AccountsTable minWidth={1800}>
                <AccountsTableHead>
                  <AccountsTableHeadRow>
                    <AccountsTableHeadCell className="w-8" />
                    <AccountsTableHeadCell>Note Date</AccountsTableHeadCell>
                    <AccountsTableHeadCell>Note Number</AccountsTableHeadCell>
                    <AccountsTableHeadCell>Original Invoice No.</AccountsTableHeadCell>
                    <AccountsTableHeadCell>Original Invoice Date</AccountsTableHeadCell>
                    <AccountsTableHeadCell>Customer Name</AccountsTableHeadCell>
                    <AccountsTableHeadCell>GSTIN</AccountsTableHeadCell>
                    <AccountsTableHeadCell>Registration Type</AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right">Taxable Value</AccountsTableHeadCell>
                    <AccountsTableHeadCell>GST Rate</AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right">CGST</AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right">SGST</AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right">IGST</AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right">Cess</AccountsTableHeadCell>
                    <AccountsTableHeadCell align="right">Total Amount</AccountsTableHeadCell>
                    <AccountsTableHeadCell>Reason</AccountsTableHeadCell>
                    <AccountsTableHeadCell>Status</AccountsTableHeadCell>
                    <AccountsTableHeadCell className="w-24">Action</AccountsTableHeadCell>
                  </AccountsTableHeadRow>
                </AccountsTableHead>
                <AccountsTableBody>
                  {report.rows.map((row) => {
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
                  })}
                </AccountsTableBody>
              </AccountsTable>
            </AccountsTableScroll>
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
