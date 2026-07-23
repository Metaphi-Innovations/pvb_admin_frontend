"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
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
  AccountsTableActionCell,
  AccountsViewAction,
  accountsActionColClass,
} from "@/components/accounts/AccountsTableActions";
import {
  ACCOUNTS_DEFAULT_PAGE_SIZE,
  AccountsTableEmpty,
  AccountsTablePagination,
} from "@/components/accounts/AccountsTableListing";
import {
  AccountsClearAllColumnFiltersButton,
  AccountsColumnFilterProvider,
  SortTh,
  useAccountsColumnFilterContext,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
import {
  ReportBranchMultiFilter,
  ReportDateRangeFilter,
  ReportFilterRow,
  ReportFilterSummary,
  ReportFinancialYearFilter,
  ReportSearchFilter,
  ReportStatusMultiFilter,
  REPORT_BRANCH_OPTIONS,
} from "@/components/accounts/ReportFilters";
import { PartyCrossNavButtons } from "@/components/accounts/PartyCrossNavButtons";
import { accountsBreadcrumb, CHART_OF_ACCOUNTS_HREF } from "@/lib/accounts/accounts-nav";
import { formatMoney } from "@/lib/accounts/money-format";
import { useClientMounted } from "@/lib/use-client-mounted";
import { useAccountsSectionRefresh } from "@/lib/accounts/use-accounts-section-refresh";
import {
  billWiseDocumentViewHref,
  getBillWiseOutstandingForLedger,
  type BillWiseReferenceRow,
  type BillWiseOutstandingView,
} from "@/lib/accounts/bill-wise-outstanding";
import { isBillWiseDemoDocumentId } from "@/lib/accounts/bill-wise-demo-data";
import { buildBillWiseCrossNavLinks } from "@/lib/accounts/party-cross-nav";
import { defaultDayBookFyDateRange } from "@/lib/accounts/day-book-data";
import {
  DAY_BOOK_DATE_RANGE_PRESET_OPTIONS,
  resolveDateRangePreset,
  type DateRangePresetId,
} from "@/lib/accounts/report-date-presets";
import {
  ensureFinancialYearsCurrent,
  loadFinancialYears,
} from "@/app/(app)/accounts/masters/masters-data";
import {
  buildBranchFilterSummary,
  buildEntityFilterSummary,
  matchesMultiFilter,
  type ReportFilterSummaryItem,
} from "@/lib/accounts/report-multi-filter-utils";
import {
  buildTabularReportBodyHtml,
  escapeHtml,
  exportAccountsReportToExcel,
  exportAccountsReportToPdf,
} from "@/lib/accounts/report-export-engine";
import { useFY } from "@/lib/fy-store";
import { loadCustomers } from "@/app/(app)/masters/customers/customer-data";
import { loadVendors } from "@/app/(app)/masters/vendors/vendor-data";
import type { AccountsColumnFilterConfig } from "@/lib/accounts/column-filter-types";
import { cn } from "@/lib/utils";

const BILL_WISE_STATUS_OPTIONS = [
  { value: "Pending", label: "Pending" },
  { value: "Partially Paid", label: "Partially Paid" },
  { value: "Overdue", label: "Overdue" },
  { value: "Unpaid", label: "Unpaid" },
  { value: "Paid", label: "Paid" },
] as const;

const BILL_WISE_COLUMN_CONFIG: AccountsColumnFilterConfig = {
  documentNo: { type: "text" },
  documentDate: { type: "date" },
  dueDate: { type: "date" },
  documentAmount: { type: "amount" },
  adjustedAmount: { type: "amount" },
  outstandingAmount: { type: "amount" },
  daysOverdue: { type: "number" },
  status: { type: "status" },
};

function formatReportDate(value: string): string {
  if (!value || value === "—") return "—";
  const [y, m, d] = value.slice(0, 10).split("-");
  if (!y || !m || !d) return value;
  return `${d}-${m}-${y}`;
}

function statusPillClass(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("overdue")) return "bg-red-50 text-red-700";
  if (s.includes("partial")) return "bg-amber-50 text-amber-700";
  if (s.includes("pending")) return "bg-navy-50 text-navy-700";
  if (s.includes("open") || s.includes("due") || s.includes("unpaid")) {
    return "bg-navy-50 text-navy-700";
  }
  return "bg-slate-100 text-slate-600";
}

function summarizeReferences(rows: BillWiseReferenceRow[]) {
  const totalInvoiceAmount = rows.reduce((s, r) => s + r.documentAmount, 0);
  const totalAdjusted = rows.reduce((s, r) => s + r.adjustedAmount, 0);
  const totalOutstanding = rows.reduce((s, r) => s + r.outstandingAmount, 0);
  const totalOverdue = rows
    .filter((r) => r.status.toLowerCase().includes("overdue"))
    .reduce((s, r) => s + r.outstandingAmount, 0);
  return {
    totalBills: rows.length,
    totalInvoiceAmount,
    totalAdjusted,
    totalOutstanding,
    totalOverdue,
  };
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg border border-border px-2.5 py-1.5 shadow-sm min-w-0 min-h-[44px] flex flex-col justify-center">
      <p className="accounts-summary-label">{label}</p>
      <p className="accounts-summary-value mt-0.5 tabular-nums truncate">{value}</p>
    </div>
  );
}

function resolvePartyBranch(view: BillWiseOutstandingView): string {
  if (view.partyKind === "customer") {
    const customer = loadCustomers().find((c) => c.id === view.partyId);
    return (customer?.branch || customer?.stateName || "").trim();
  }
  const vendor = loadVendors().find((v) => v.id === view.partyId);
  return (vendor?.branch || "").trim();
}

function getBillWiseCellValue(
  row: BillWiseReferenceRow,
  key: string,
): string | number | boolean | null | undefined {
  switch (key) {
    case "documentNo":
      return row.documentNo;
    case "documentDate":
      return row.documentDate;
    case "dueDate":
      return row.dueDate;
    case "documentAmount":
      return row.documentAmount;
    case "adjustedAmount":
      return row.adjustedAmount;
    case "outstandingAmount":
      return row.outstandingAmount;
    case "daysOverdue":
      return row.daysOverdue;
    case "status":
      return row.status;
    default:
      return (row as unknown as Record<string, unknown>)[key] as
        | string
        | number
        | boolean
        | null
        | undefined;
  }
}

function filterBillWiseReferences(
  rows: BillWiseReferenceRow[],
  opts: {
    dateFrom: string;
    dateTo: string;
    statuses: string[];
    search: string;
    branches: string[];
    partyBranch: string;
  },
): BillWiseReferenceRow[] {
  const q = opts.search.trim().toLowerCase();
  return rows.filter((row) => {
    if (opts.dateFrom && row.documentDate.slice(0, 10) < opts.dateFrom) return false;
    if (opts.dateTo && row.documentDate.slice(0, 10) > opts.dateTo) return false;
    if (opts.statuses.length > 0) {
      const match = opts.statuses.some(
        (s) => row.status.toLowerCase() === s.toLowerCase(),
      );
      if (!match) return false;
    }
    if (q && !row.documentNo.toLowerCase().includes(q)) return false;
    if (!matchesMultiFilter(opts.branches, opts.partyBranch || undefined)) return false;
    return true;
  });
}

export default function BillWiseOutstandingPageClient({
  ledgerId,
  from,
}: {
  ledgerId: number;
  from?: string | null;
}) {
  const mounted = useClientMounted();
  const sectionRefresh = useAccountsSectionRefresh();
  const [viewRow, setViewRow] = useState<BillWiseReferenceRow | null>(null);
  const [datesReady, setDatesReady] = useState(false);
  const [preset, setPreset] = useState<DateRangePresetId>("custom");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [financialYearId, setFinancialYearId] = useState("all");
  const [branches, setBranches] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(ACCOUNTS_DEFAULT_PAGE_SIZE);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    ensureFinancialYearsCurrent();
    const { from: fyFrom, to: fyTo, fyId } = defaultDayBookFyDateRange();
    setDateFrom(fyFrom);
    setDateTo(fyTo);
    setFinancialYearId(fyId);
    setDatesReady(true);
  }, []);

  const view = useMemo(
    () => (mounted && Number.isFinite(ledgerId) ? getBillWiseOutstandingForLedger(ledgerId) : null),
    [mounted, ledgerId, sectionRefresh],
  );

  const partyBranch = useMemo(() => (view ? resolvePartyBranch(view) : ""), [view]);

  const branchOptions = useMemo(() => {
    const set = new Set<string>(REPORT_BRANCH_OPTIONS);
    if (partyBranch) set.add(partyBranch);
    return [...set];
  }, [partyBranch]);

  const statusOptions = useMemo(() => {
    const fromData = new Set(
      (view?.references ?? []).map((r) => r.status).filter(Boolean),
    );
    const base: string[] = BILL_WISE_STATUS_OPTIONS.map((o) => o.value);
    for (const s of fromData) {
      if (!base.some((b) => b.toLowerCase() === s.toLowerCase())) {
        base.push(s);
      }
    }
    return base.map((value) => ({ value, label: value }));
  }, [view?.references]);

  const filteredReferences = useMemo(() => {
    if (!view || !datesReady) return [];
    return filterBillWiseReferences(view.references, {
      dateFrom,
      dateTo,
      statuses,
      search,
      branches,
      partyBranch,
    });
  }, [view, datesReady, dateFrom, dateTo, statuses, search, branches, partyBranch]);

  const crossNav = useMemo(
    () =>
      view
        ? buildBillWiseCrossNavLinks({
            partyKind: view.partyKind,
            partyId: view.partyId,
            partyName: view.partyName,
            ledgerId: view.ledgerId,
          })
        : [],
    [view],
  );

  const handleFinancialYearChange = useCallback((fyId: string) => {
    setFinancialYearId(fyId);
    if (fyId !== "all") {
      const fy = loadFinancialYears().find((f) => String(f.id) === fyId);
      if (fy) {
        const today = new Date().toISOString().slice(0, 10);
        setDateFrom(fy.startDate);
        setDateTo(today < fy.endDate ? today : fy.endDate);
        setPreset("custom");
      }
    }
  }, []);

  const handlePresetChange = useCallback((next: DateRangePresetId) => {
    setPreset(next);
    if (next !== "custom") {
      const { from: f, to: t } = resolveDateRangePreset(next);
      setDateFrom(f);
      setDateTo(t);
    }
  }, []);

  const defaultFy = useMemo(() => defaultDayBookFyDateRange(), []);

  const hasFilters =
    datesReady &&
    (preset !== "custom" ||
      financialYearId !== defaultFy.fyId ||
      dateFrom !== defaultFy.from ||
      dateTo !== defaultFy.to ||
      branches.length > 0 ||
      statuses.length > 0 ||
      search.trim().length > 0);

  const clearFilters = useCallback(() => {
    const { from: f, to: t, fyId } = defaultDayBookFyDateRange();
    setPreset("custom");
    setDateFrom(f);
    setDateTo(t);
    setFinancialYearId(fyId);
    setBranches([]);
    setStatuses([]);
    setSearch("");
  }, []);

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, financialYearId, branches, statuses, search]);

  const filterSummaryItems = useMemo((): ReportFilterSummaryItem[] => {
    return [
      buildBranchFilterSummary(branches, () => setBranches([])),
      buildEntityFilterSummary(
        "status",
        "Statuses",
        statuses,
        statusOptions,
        () => setStatuses([]),
      ),
    ].filter((item): item is ReportFilterSummaryItem => item != null);
  }, [branches, statuses, statusOptions]);

  const backHref =
    from === "gl"
      ? `/accounts/reports/general-ledger?ledgerId=${ledgerId}`
      : `${CHART_OF_ACCOUNTS_HREF}?node=${ledgerId}`;

  if (!mounted) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
    );
  }

  if (!view) {
    return (
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Chart of Accounts", "Bill-wise Outstanding")}
        title="Bill-wise Outstanding"
        description="Available only for Customer and Supplier ledgers under Sundry Debtors / Creditors."
        layout="standard"
      >
        <div className="p-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            This ledger is not a customer or supplier party ledger under Sundry Debtors or Sundry
            Creditors.
          </p>
          <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
            <Link href={backHref}>
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Back
            </Link>
          </Button>
        </div>
      </AccountsPageShell>
    );
  }

  const docLabel = view.partyKind === "customer" ? "Invoice" : "Bill";

  return (
    <AccountsColumnFilterProvider
      rows={filteredReferences}
      getCellValue={getBillWiseCellValue}
      columnConfig={BILL_WISE_COLUMN_CONFIG}
      defaultSortKey="documentDate"
      defaultSortDir="desc"
    >
      <BillWiseOutstandingBody
        view={view}
        docLabel={docLabel}
        backHref={backHref}
        crossNav={crossNav}
        filteredReferences={filteredReferences}
        hasFilters={hasFilters}
        clearFilters={clearFilters}
        preset={preset}
        dateFrom={dateFrom}
        dateTo={dateTo}
        financialYearId={financialYearId}
        branches={branches}
        statuses={statuses}
        search={search}
        branchOptions={branchOptions}
        statusOptions={statusOptions}
        filterSummaryItems={filterSummaryItems}
        exporting={exporting}
        setExporting={setExporting}
        page={page}
        setPage={setPage}
        pageSize={pageSize}
        setPageSize={setPageSize}
        viewRow={viewRow}
        setViewRow={setViewRow}
        onFinancialYearChange={handleFinancialYearChange}
        onPresetChange={handlePresetChange}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onBranchesChange={setBranches}
        onStatusesChange={setStatuses}
        onSearchChange={setSearch}
      />
    </AccountsColumnFilterProvider>
  );
}

function BillWiseOutstandingBody({
  view,
  docLabel,
  backHref,
  crossNav,
  filteredReferences,
  hasFilters,
  clearFilters,
  preset,
  dateFrom,
  dateTo,
  financialYearId,
  branches,
  statuses,
  search,
  branchOptions,
  statusOptions,
  filterSummaryItems,
  exporting,
  setExporting,
  page,
  setPage,
  pageSize,
  setPageSize,
  viewRow,
  setViewRow,
  onFinancialYearChange,
  onPresetChange,
  onDateFromChange,
  onDateToChange,
  onBranchesChange,
  onStatusesChange,
  onSearchChange,
}: {
  view: BillWiseOutstandingView;
  docLabel: string;
  backHref: string;
  crossNav: ReturnType<typeof buildBillWiseCrossNavLinks>;
  filteredReferences: BillWiseReferenceRow[];
  hasFilters: boolean;
  clearFilters: () => void;
  preset: DateRangePresetId;
  dateFrom: string;
  dateTo: string;
  financialYearId: string;
  branches: string[];
  statuses: string[];
  search: string;
  branchOptions: string[];
  statusOptions: { value: string; label: string }[];
  filterSummaryItems: ReportFilterSummaryItem[];
  exporting: boolean;
  setExporting: (v: boolean) => void;
  page: number;
  setPage: (p: number) => void;
  pageSize: number;
  setPageSize: (s: number) => void;
  viewRow: BillWiseReferenceRow | null;
  setViewRow: (row: BillWiseReferenceRow | null) => void;
  onFinancialYearChange: (fyId: string) => void;
  onPresetChange: (next: DateRangePresetId) => void;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onBranchesChange: (v: string[]) => void;
  onStatusesChange: (v: string[]) => void;
  onSearchChange: (v: string) => void;
}) {
  const { selectedFY } = useFY();
  const ctx = useAccountsColumnFilterContext();
  const visibleRows = useAccountsFilteredRows(filteredReferences);

  const summary = useMemo(() => summarizeReferences(visibleRows), [visibleRows]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return visibleRows.slice(start, start + pageSize);
  }, [visibleRows, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [ctx?.columnFilters, ctx?.sortKey, ctx?.sortDir, setPage]);

  const financialYearLabel = useMemo(() => {
    if (financialYearId === "all") return "All years";
    return loadFinancialYears().find((f) => String(f.id) === financialYearId)?.name ?? selectedFY.label;
  }, [financialYearId, selectedFY.label]);

  const buildExportBody = useCallback(() => {
    const columns = [
      { label: `${docLabel} No.`, className: "mono" },
      { label: `${docLabel} Date` },
      { label: "Due Date" },
      { label: "Original Amount", align: "right" as const, className: "num" },
      { label: "Adjusted Amount", align: "right" as const, className: "num" },
      { label: "Outstanding Amount", align: "right" as const, className: "num" },
      { label: "Ageing Days", align: "right" as const, className: "num" },
      { label: "Status" },
    ];
    const bodyHtml = visibleRows
      .map((row) => {
        const cells = [
          `<td class="mono">${escapeHtml(row.documentNo)}</td>`,
          `<td>${escapeHtml(formatReportDate(row.documentDate))}</td>`,
          `<td>${escapeHtml(formatReportDate(row.dueDate))}</td>`,
          `<td class="num">${escapeHtml(formatMoney(row.documentAmount))}</td>`,
          `<td class="num">${escapeHtml(formatMoney(row.adjustedAmount))}</td>`,
          `<td class="num">${escapeHtml(formatMoney(row.outstandingAmount))}</td>`,
          `<td class="num">${escapeHtml(String(row.daysOverdue))}</td>`,
          `<td>${escapeHtml(row.status)}</td>`,
        ].join("");
        return `<tr>${cells}</tr>`;
      })
      .join("");
    return buildTabularReportBodyHtml({ columns, bodyHtml });
  }, [docLabel, visibleRows]);

  const handleExportExcel = async () => {
    if (exporting || visibleRows.length === 0) return;
    setExporting(true);
    try {
      await exportAccountsReportToExcel({
        title: "Bill-wise Outstanding",
        filename: `Bill_wise_Outstanding_${view.ledgerCode}`,
        header: {
          reportTitle: "Bill-wise Outstanding",
          financialYear: financialYearLabel,
          dateFrom,
          dateTo,
          subtitle: `${view.ledgerCode} · ${view.partyName}`,
        },
        bodyHtml: buildExportBody(),
        landscape: true,
      });
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    if (visibleRows.length === 0) return;
    exportAccountsReportToPdf({
      title: "Bill-wise Outstanding",
      filename: `Bill_wise_Outstanding_${view.ledgerCode}`,
      header: {
        reportTitle: "Bill-wise Outstanding",
        financialYear: financialYearLabel,
        dateFrom,
        dateTo,
        subtitle: `${view.ledgerCode} · ${view.partyName}`,
      },
      bodyHtml: buildExportBody(),
      landscape: true,
    });
  };

  const showColumnFilterEmpty =
    filteredReferences.length > 0 && visibleRows.length === 0;

  return (
    <AccountsPageShell
      breadcrumbs={[
        ...accountsBreadcrumb("Chart of Accounts", view.ledgerName, backHref),
        { label: "Bill-wise Outstanding" },
      ]}
      title="Bill-wise Outstanding"
      description={`${view.ledgerCode} · ${view.partyName} · ${
        view.partyKind === "customer" ? "Customer" : "Supplier"
      }`}
      actions={
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" asChild>
          <Link href={backHref}>
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </Link>
        </Button>
      }
      filters={
        <>
          <ReportFilterRow
            className="items-end"
            end={
              <>
                <AccountsClearAllColumnFiltersButton />
                <AccountsExportMenu
                  onExcel={handleExportExcel}
                  onPdf={handleExportPdf}
                  disabled={exporting || visibleRows.length === 0}
                />
              </>
            }
          >
            <ReportFinancialYearFilter
              value={financialYearId}
              onChange={onFinancialYearChange}
            />
            <ReportDateRangeFilter
              preset={preset}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onPresetChange={onPresetChange}
              onDateFromChange={onDateFromChange}
              onDateToChange={onDateToChange}
              presetOptions={DAY_BOOK_DATE_RANGE_PRESET_OPTIONS}
            />
            <ReportBranchMultiFilter
              values={branches}
              onChange={onBranchesChange}
              options={branchOptions}
            />
            <ReportStatusMultiFilter
              values={statuses}
              onChange={onStatusesChange}
              options={statusOptions}
            />
            <ReportSearchFilter
              value={search}
              onChange={onSearchChange}
              placeholder={`${docLabel} No. / Reference`}
              className="min-w-[180px] flex-1 basis-[180px] max-w-xs"
            />
            {hasFilters && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-sm font-medium"
                onClick={clearFilters}
              >
                Clear Filters
              </Button>
            )}
          </ReportFilterRow>
          <ReportFilterSummary items={filterSummaryItems} />
        </>
      }
      layout="split"
      className="h-full min-h-0"
    >
      <div className="flex-shrink-0 border-b border-border/60 bg-white px-4 py-3 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <SummaryCard label="Total Bills" value={String(summary.totalBills)} />
          <SummaryCard
            label="Total Invoice Amount"
            value={formatMoney(summary.totalInvoiceAmount)}
          />
          <SummaryCard label="Total Adjusted" value={formatMoney(summary.totalAdjusted)} />
          <SummaryCard
            label="Total Outstanding"
            value={formatMoney(summary.totalOutstanding)}
          />
          <SummaryCard label="Total Overdue" value={formatMoney(summary.totalOverdue)} />
        </div>

        <PartyCrossNavButtons items={crossNav} label="Go to" />
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        <AccountsTableScroll className="flex-1 min-h-0">
          <AccountsTable minWidth={1200} className="text-xs financial-report">
            <AccountsTableHead>
              <AccountsTableHeadRow>
                <SortTh label={`${docLabel} No.`} colKey="documentNo" />
                <SortTh label={`${docLabel} Date`} colKey="documentDate" filterType="date" />
                <SortTh label="Due Date" colKey="dueDate" filterType="date" />
                <SortTh
                  label="Original Amount"
                  colKey="documentAmount"
                  filterType="amount"
                  align="right"
                />
                <SortTh
                  label="Adjusted Amount"
                  colKey="adjustedAmount"
                  filterType="amount"
                  align="right"
                />
                <SortTh
                  label="Outstanding Amount"
                  colKey="outstandingAmount"
                  filterType="amount"
                  align="right"
                />
                <SortTh
                  label="Ageing Days"
                  colKey="daysOverdue"
                  filterType="number"
                  align="right"
                />
                <SortTh label="Status" colKey="status" filterType="status" />
                <AccountsTableHeadCell sticky={false} align="right">
                  View
                </AccountsTableHeadCell>
              </AccountsTableHeadRow>
            </AccountsTableHead>
            <AccountsTableBody>
              {view.references.length === 0 ? (
                <AccountsTableEmpty
                  colSpan={9}
                  message="No bill-wise outstanding transactions found for the selected criteria."
                />
              ) : filteredReferences.length === 0 ? (
                <AccountsTableEmpty
                  colSpan={9}
                  message="No bill-wise outstanding transactions found for the selected criteria."
                  onClear={hasFilters ? clearFilters : undefined}
                />
              ) : showColumnFilterEmpty ? (
                <AccountsTableEmpty
                  colSpan={9}
                  message="No records match the column filters."
                  onClear={ctx?.clearAllColumnFilters}
                />
              ) : (
                paginated.map((row) => {
                  const isDemo = isBillWiseDemoDocumentId(row.documentId);
                  return (
                    <AccountsTableRow key={row.documentId} className="group">
                      <AccountsTableCell>
                        <span className="font-mono text-xs font-semibold text-brand-700">
                          {row.documentNo}
                        </span>
                      </AccountsTableCell>
                      <AccountsTableCell>{formatReportDate(row.documentDate)}</AccountsTableCell>
                      <AccountsTableCell>{formatReportDate(row.dueDate)}</AccountsTableCell>
                      <AccountsTableCell align="right">
                        <span className="tabular-nums">{formatMoney(row.documentAmount)}</span>
                      </AccountsTableCell>
                      <AccountsTableCell align="right">
                        <span className="tabular-nums">{formatMoney(row.adjustedAmount)}</span>
                      </AccountsTableCell>
                      <AccountsTableCell align="right">
                        <span className="tabular-nums font-semibold">
                          {formatMoney(row.outstandingAmount)}
                        </span>
                      </AccountsTableCell>
                      <AccountsTableCell align="right">
                        <span className="tabular-nums text-xs">{row.daysOverdue}</span>
                      </AccountsTableCell>
                      <AccountsTableCell>
                        <span
                          className={cn(
                            "inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium",
                            statusPillClass(row.status),
                          )}
                        >
                          {row.status}
                        </span>
                      </AccountsTableCell>
                      <AccountsTableCell
                        align="right"
                        className={accountsActionColClass("single")}
                      >
                        <AccountsTableActionCell variant="single">
                          {isDemo ? (
                            <button
                              type="button"
                              title={`View ${docLabel.toLowerCase()}`}
                              className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                              onClick={() => setViewRow(row)}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <AccountsViewAction
                              title={`View ${docLabel.toLowerCase()}`}
                              href={billWiseDocumentViewHref(view.partyKind, row.documentId)}
                            />
                          )}
                        </AccountsTableActionCell>
                      </AccountsTableCell>
                    </AccountsTableRow>
                  );
                })
              )}
            </AccountsTableBody>
          </AccountsTable>
        </AccountsTableScroll>

        {visibleRows.length > 0 ? (
          <AccountsTablePagination
            page={page}
            pageSize={pageSize}
            totalRecords={visibleRows.length}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
            recordLabel="bills"
          />
        ) : null}
      </div>

      <p className="flex-shrink-0 px-4 py-2 text-[11px] text-muted-foreground border-t border-border bg-muted/10">
        Frontend UI preview. Mock rows (when shown) are for testing only and do not require
        invoices or vouchers.
      </p>

      <Dialog open={!!viewRow} onOpenChange={(open) => !open && setViewRow(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-brand-600" />
              </div>
              {viewRow?.documentNo ?? "Invoice"}
            </DialogTitle>
            <DialogDescription className="pt-1">
              Demo invoice preview — not linked to a live sales invoice.
            </DialogDescription>
          </DialogHeader>
          {viewRow ? (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Invoice Date</span>
                <span className="font-medium">{formatReportDate(viewRow.documentDate)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Due Date</span>
                <span className="font-medium">{formatReportDate(viewRow.dueDate)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Original Amount</span>
                <span className="font-medium tabular-nums">
                  {formatMoney(viewRow.documentAmount)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Adjusted</span>
                <span className="font-medium tabular-nums">
                  {formatMoney(viewRow.adjustedAmount)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Outstanding</span>
                <span className="font-semibold tabular-nums text-brand-700">
                  {formatMoney(viewRow.outstandingAmount)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium">{viewRow.status}</span>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </AccountsPageShell>
  );
}
