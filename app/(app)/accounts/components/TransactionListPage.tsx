"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Plus } from "lucide-react";
import {
  AccountsDeleteAction,
  AccountsEditAction,
  AccountsTableActionCell,
  AccountsViewAction,
  accountsActionColClass,
} from "@/components/accounts/AccountsTableActions";
import { useClientMounted } from "@/lib/use-client-mounted";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsTable, AccountsTableHead, AccountsTableHeadRow, AccountsTableBody, AccountsTableRow, AccountsTableCell } from "@/components/accounts/AccountsTable";
import { AccountsTablePagination, AccountsTableListing, AccountsListingToolbar } from "@/components/accounts/AccountsTableListing";
import {
  ReportSearchFilter,
  ReportDateRangeFilter,
  useReportDateRange,
  ACCOUNTS_FILTER_CONTROL_CLASS,
} from "@/components/accounts/ReportFilters";
import { INVOICE_TYPE_LABELS } from "@/lib/accounts/invoice-type";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { ACCOUNTS_FILTER_LABEL_CLASS, ACCOUNTS_ACTION_BUTTON_CLASS } from "@/lib/accounts/accounts-typography";
import {
  AccountsColumnFilterProvider,
  AccountsColumnHeader,
  SectionTabs,
  SortTh,
  useAccountsColumnFilterContext,
  useAccountsFilteredRows,
} from "./AccountsUI";
import type { AccountsColumnFilterConfig } from "@/lib/accounts/column-filter-types";
import { AccountsVoucherStatusBadge } from "@/components/accounts/AccountsVoucherStatusBadge";
import { cn } from "@/lib/utils";
import { LedgerImpactPreview, type LedgerImpactLine } from "@/components/accounts/LedgerImpactPreview";
import { InvoiceTypeBadge } from "@/components/accounts/InvoiceTypeBadge";

export interface TransactionRow {
  id: string | number;
  number: string;
  date: string;
  party: string;
  amount: string;
  /** When set, list shows Taxable Value / CGST / SGST / IGST / Invoice Total columns. */
  taxableValue?: string;
  cgst?: string;
  sgst?: string;
  igst?: string;
  gstAmount?: string;
  invoiceTotal?: string;
  status: string;
  branch?: string;
  /** Sales invoice scheme settlement badge: Settlement Required | Settled | undefined (show —) */
  schemeSettlementLabel?: string | null;
  /** Sales | Stock Transfer */
  invoiceType?: "sales" | "stock_transfer";
  sourceNo?: string;
  dispatchNo?: string;
  viewHref?: string;
  viewFields?: { label: string; value: string }[];
  impactLines?: LedgerImpactLine[];
}

export interface TransactionListConfig<T> {
  section: string;
  title: string;
  description: string;
  loadData: () => T[];
  newHref?: string;
  editHref?: (id: string | number) => string;
  statusTabs?: { id: string; label: string }[];
  getStatus?: (item: T) => string;
  getRow: (item: T) => TransactionRow;
  /** Show Post for draft rows when provided */
  onPost?: (id: string | number) => void;
  /** Show Delete for draft rows when provided */
  onDelete?: (id: string | number) => void;
  canPost?: (row: TransactionRow) => boolean;
  canDelete?: (row: TransactionRow) => boolean;
  canEdit?: (row: TransactionRow) => boolean;
  /** Show Scheme Settlement column (Sales Invoices). */
  showSchemeSettlementColumn?: boolean;
  /** Show Type column (Sales | Stock Transfer). */
  showInvoiceTypeColumn?: boolean;
  /** Sales invoice listing: source/dispatch columns + invoice date range filter. */
  invoiceListingMode?: boolean;
  /** Show CGST / SGST / IGST split amount columns (purchase & sales invoices). */
  gstSplitColumns?: boolean;
}

function isDraftStatus(status: string): boolean {
  const s = status.toLowerCase();
  return s === "draft" || s === "sent_back";
}

function transactionGetCellValue(row: TransactionRow, key: string): unknown {
  switch (key) {
    case "invoiceType":
      return row.invoiceType ? INVOICE_TYPE_LABELS[row.invoiceType] : "Sales";
    case "number":
      return row.number;
    case "sourceNo":
      return row.sourceNo ?? "";
    case "dispatchNo":
      return row.dispatchNo ?? "";
    case "party":
      return row.party;
    case "date":
      return row.date;
    case "taxableValue":
      return row.taxableValue ?? row.amount;
    case "cgst":
      return row.cgst ?? "";
    case "sgst":
      return row.sgst ?? "";
    case "igst":
      return row.igst ?? "";
    case "gstAmount":
      return row.gstAmount ?? "";
    case "invoiceTotal":
      return row.invoiceTotal ?? row.amount;
    case "amount":
      return row.amount;
    case "status":
      return row.status.toLowerCase().replace(/\s+/g, "_");
    case "schemeSettlementLabel":
      return row.schemeSettlementLabel ?? "";
    default:
      return "";
  }
}

function buildTransactionColumnConfig(opts: {
  showInvoiceTypeColumn: boolean;
  showSourceColumns: boolean;
  showGstColumns: boolean;
  showGstSplitColumns: boolean;
  showSchemeSettlementColumn: boolean;
}): AccountsColumnFilterConfig {
  const cfg: AccountsColumnFilterConfig = {};
  if (opts.showInvoiceTypeColumn) cfg.invoiceType = { type: "text" };
  cfg.number = { type: "text" };
  if (opts.showSourceColumns) {
    cfg.sourceNo = { type: "text" };
    cfg.dispatchNo = { type: "text" };
  }
  cfg.party = { type: "text" };
  cfg.date = { type: "date" };
  if (opts.showGstColumns) {
    cfg.taxableValue = { type: "amount" };
    if (opts.showGstSplitColumns) {
      cfg.cgst = { type: "amount" };
      cfg.sgst = { type: "amount" };
      cfg.igst = { type: "amount" };
      cfg.invoiceTotal = { type: "amount" };
    } else {
      cfg.gstAmount = { type: "amount" };
      cfg.invoiceTotal = { type: "amount" };
    }
  } else {
    cfg.amount = { type: "amount" };
  }
  if (opts.showSchemeSettlementColumn) cfg.schemeSettlementLabel = { type: "text" };
  return cfg;
}

function exportTransactionRows(
  rows: TransactionRow[],
  config: {
    title: string;
    invoiceListingMode: boolean;
    showGstColumns: boolean;
    showGstSplitColumns: boolean;
    showInvoiceTypeColumn: boolean;
  },
) {
  const { title, invoiceListingMode, showGstColumns, showGstSplitColumns, showInvoiceTypeColumn } = config;
  const headers = invoiceListingMode
    ? [
        "Type",
        "Invoice No",
        "Source No",
        "Dispatch No",
        "Party",
        "Invoice Date",
        "Taxable Value",
        "CGST",
        "SGST",
        "IGST",
        "Invoice Value",
        "Status",
      ]
    : showGstColumns
      ? [
          ...(showInvoiceTypeColumn ? ["Type"] : []),
          "Number",
          "Date",
          "Party",
          "Taxable Value",
          "GST Amount",
          "Invoice Total",
          "Status",
        ]
      : [
          ...(showInvoiceTypeColumn ? ["Type"] : []),
          "Number",
          "Date",
          "Party",
          "Amount",
          "Status",
        ];
  const lines = rows.map((r) => {
    if (invoiceListingMode) {
      return [
        r.invoiceType ? INVOICE_TYPE_LABELS[r.invoiceType] : "Sales",
        r.number,
        r.sourceNo ?? "",
        r.dispatchNo ?? "",
        r.party,
        r.date,
        r.taxableValue ?? "",
        r.cgst ?? "",
        r.sgst ?? "",
        r.igst ?? "",
        r.invoiceTotal ?? r.amount,
        r.status,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",");
    }
    const base = [
      ...(showInvoiceTypeColumn ? [r.invoiceType === "stock_transfer" ? "Stock Transfer" : "Sales"] : []),
      r.number,
      r.date,
      r.party,
    ];
    const amounts = showGstColumns
      ? [r.taxableValue ?? "", r.gstAmount ?? "", r.invoiceTotal ?? r.amount]
      : [r.amount];
    return [...base, ...amounts, r.status].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
  });
  const blob = new Blob([[headers.join(","), ...lines].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.toLowerCase().replace(/\s+/g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function TransactionListPage<T>({ config }: { config: TransactionListConfig<T> }) {
  const router = useRouter();
  const mounted = useClientMounted();
  const invoiceListingMode = config.invoiceListingMode ?? false;
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange(
    invoiceListingMode ? "last_month" : "this_month",
  );
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("");
  const [statusTab, setStatusTab] = useState("all");
  const [viewRow, setViewRow] = useState<TransactionRow | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const allRows = useMemo(
    () => (mounted ? config.loadData().map(config.getRow) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config, refreshKey, mounted],
  );

  const bump = () => setRefreshKey((k) => k + 1);

  const statusTabs = config.statusTabs ?? [
    { id: "all", label: "All" },
    { id: "draft", label: "Draft" },
    { id: "pending_approval", label: "Pending Approval" },
    { id: "sent_back", label: "Sent Back" },
    { id: "posted", label: "Posted" },
    { id: "sent", label: "Posted" },
    { id: "approved", label: "Posted" },
    { id: "rejected", label: "Rejected" },
    { id: "cancelled", label: "Cancelled" },
  ];

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allRows.length };
    for (const r of allRows) {
      const s = r.status.toLowerCase().replace(/\s+/g, "_");
      counts[s] = (counts[s] ?? 0) + 1;
    }
    return counts;
  }, [allRows]);

  const toolbarFiltered = useMemo(() => {
    let list = [...allRows];
    if (statusTab !== "all") {
      list = list.filter((r) => r.status.toLowerCase().replace(/\s+/g, "_") === statusTab);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.number.toLowerCase().includes(q) ||
          r.party.toLowerCase().includes(q) ||
          (r.sourceNo ?? "").toLowerCase().includes(q) ||
          (r.dispatchNo ?? "").toLowerCase().includes(q) ||
          (r.invoiceType ? INVOICE_TYPE_LABELS[r.invoiceType].toLowerCase().includes(q) : false),
      );
    }
    if (dateFrom) list = list.filter((r) => r.date >= dateFrom);
    if (dateTo) list = list.filter((r) => r.date <= dateTo);
    if (branch.trim()) {
      const b = branch.toLowerCase();
      list = list.filter((r) => (r.branch ?? "").toLowerCase().includes(b));
    }
    return list;
  }, [allRows, statusTab, search, dateFrom, dateTo, branch]);

  const getCellValue = useCallback(
    (row: TransactionRow, key: string) => transactionGetCellValue(row, key),
    [],
  );

  const showGstColumns = allRows.some(
    (r) => r.taxableValue != null && r.invoiceTotal != null,
  );
  const showGstSplitColumns =
    (config.gstSplitColumns ?? config.invoiceListingMode ?? false) && showGstColumns;
  const showSchemeSettlementColumn = config.showSchemeSettlementColumn ?? false;
  const showInvoiceTypeColumn = config.showInvoiceTypeColumn ?? false;
  const showSourceColumns = invoiceListingMode;

  const columnConfig = useMemo(
    () =>
      buildTransactionColumnConfig({
        showInvoiceTypeColumn,
        showSourceColumns,
        showGstColumns,
        showGstSplitColumns,
        showSchemeSettlementColumn,
      }),
    [
      showInvoiceTypeColumn,
      showSourceColumns,
      showGstColumns,
      showGstSplitColumns,
      showSchemeSettlementColumn,
    ],
  );

  useEffect(() => {
    setPage(1);
  }, [statusTab, search, dateFrom, dateTo, branch, pageSize]);

  const rowCanEdit = (r: TransactionRow) =>
    config.editHref &&
    (config.canEdit ? config.canEdit(r) : isDraftStatus(r.status) || r.status.toLowerCase() === "sent_back");

  const rowCanPost = (r: TransactionRow) =>
    config.onPost && (config.canPost ? config.canPost(r) : false);

  const rowCanDelete = (r: TransactionRow) =>
    config.onDelete && (config.canDelete ? config.canDelete(r) : isDraftStatus(r.status));

  const amountColumnCount = showGstSplitColumns ? 5 : showGstColumns ? 3 : 1;
  const colSpan =
    1 +
    (showInvoiceTypeColumn ? 1 : 0) +
    (showSourceColumns ? 2 : 0) +
    1 +
    1 +
    amountColumnCount +
    (showSchemeSettlementColumn ? 1 : 0) +
    1;

  const exportConfig = {
    title: config.title,
    invoiceListingMode,
    showGstColumns,
    showGstSplitColumns,
    showInvoiceTypeColumn,
  };

  return (
    <>
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb(config.section, config.title)}
        title={config.title}
        description={config.description}
        hideDescription
        actions={
          config.newHref ? (
            <Button
              size="sm"
              className={cn(ACCOUNTS_ACTION_BUTTON_CLASS, "gap-1.5 bg-brand-600 hover:bg-brand-700 text-white border-0 px-2.5")}
              onClick={() => router.push(config.newHref!)}
            >
              <Plus className="w-4 h-4" /> New
            </Button>
          ) : undefined
        }
        layout="split"
        className="h-full min-h-0"
      >
        <AccountsColumnFilterProvider
          rows={toolbarFiltered}
          getCellValue={getCellValue}
          columnConfig={columnConfig}
          defaultSortKey="date"
          defaultSortDir="desc"
        >
          <AccountsTableListing
            toolbar={
              <TransactionListToolbar
                invoiceListingMode={invoiceListingMode}
                search={search}
                onSearchChange={setSearch}
                exportConfig={exportConfig}
                preset={preset}
                dateFrom={dateFrom}
                dateTo={dateTo}
                onPresetChange={setPreset}
                onDateFromChange={setDateFrom}
                onDateToChange={setDateTo}
                branch={branch}
                onBranchChange={setBranch}
              />
            }
            subheader={
              <SectionTabs tabs={statusTabs} active={statusTab} onChange={setStatusTab} counts={tabCounts} compact />
            }
            footer={
              mounted ? (
                <TransactionListPagination
                  page={page}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              ) : null
            }
          >
            <TransactionListTable
              mounted={mounted}
              colSpan={colSpan}
              page={page}
              pageSize={pageSize}
              invoiceListingMode={invoiceListingMode}
              showInvoiceTypeColumn={showInvoiceTypeColumn}
              showSourceColumns={showSourceColumns}
              showGstColumns={showGstColumns}
              showGstSplitColumns={showGstSplitColumns}
              showSchemeSettlementColumn={showSchemeSettlementColumn}
              config={config}
              bump={bump}
              rowCanEdit={rowCanEdit}
              rowCanPost={rowCanPost}
              rowCanDelete={rowCanDelete}
              onViewRow={setViewRow}
            />
          </AccountsTableListing>
        </AccountsColumnFilterProvider>
      </AccountsPageShell>

      <Sheet open={!!viewRow} onOpenChange={(o) => !o && setViewRow(null)}>
        <SheetContent className="max-w-[400px] w-full sm:max-w-[400px]">
          <SheetHeader>
            <SheetTitle className="text-base">{viewRow?.number}</SheetTitle>
            <SheetDescription className="text-xs">Transaction details (read-only preview)</SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-4">
            {viewRow && (
              <>
                <div className="flex items-center gap-2">
                  <AccountsVoucherStatusBadge legacyStatus={viewRow.status} />
                </div>
                {(viewRow.viewFields ?? [
                  { label: "Date", value: viewRow.date },
                  { label: "Party", value: viewRow.party },
                  ...(viewRow.taxableValue != null
                    ? viewRow.cgst != null || viewRow.sgst != null || viewRow.igst != null
                      ? [
                          { label: "Taxable Value", value: viewRow.taxableValue },
                          { label: "CGST", value: viewRow.cgst ?? "—" },
                          { label: "SGST", value: viewRow.sgst ?? "—" },
                          { label: "IGST", value: viewRow.igst ?? "—" },
                          { label: "Invoice Value", value: viewRow.invoiceTotal ?? viewRow.amount },
                        ]
                      : [
                          { label: "Taxable Value", value: viewRow.taxableValue },
                          { label: "GST Amount", value: viewRow.gstAmount ?? "—" },
                          { label: "Invoice Total (Incl. GST)", value: viewRow.invoiceTotal ?? viewRow.amount },
                        ]
                    : [{ label: "Amount", value: viewRow.amount }]),
                  ...(viewRow.branch ? [{ label: "Branch", value: viewRow.branch }] : []),
                ]).map((f) => (
                  <div key={f.label} className="space-y-1">
                    <p className="text-xs text-muted-foreground">{f.label}</p>
                    <p
                      className={cn(
                        "text-sm font-medium",
                        (f.label.includes("Value") ||
                          f.label.includes("GST") ||
                          f.label.includes("Total") ||
                          f.label === "Amount") &&
                          "tabular-nums",
                      )}
                    >
                      {f.value}
                    </p>
                  </div>
                ))}
                {viewRow.impactLines && viewRow.impactLines.length > 0 && (
                  <LedgerImpactPreview title="Ledger Impact Preview" lines={viewRow.impactLines} className="mt-2" />
                )}
              </>
            )}
          </SheetBody>
          <SheetFooter>
            <Button variant="outline" size="sm" className="h-9 text-sm font-medium" onClick={() => setViewRow(null)}>
              Close
            </Button>
            {viewRow?.viewHref && (
              <Button
                size="sm"
                className="h-9 text-sm font-medium bg-brand-600 text-white"
                onClick={() => {
                  router.push(viewRow.viewHref!);
                  setViewRow(null);
                }}
              >
                Full Details
              </Button>
            )}
            {viewRow && rowCanEdit(viewRow) && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-sm font-medium gap-1.5"
                onClick={() => router.push(config.editHref!(viewRow.id))}
              >
                <Pencil className="w-4 h-4" /> Edit
              </Button>
            )}
            {viewRow && rowCanPost(viewRow) && (
              <Button
                size="sm"
                className="h-9 text-sm font-medium bg-brand-600 text-white"
                onClick={() => {
                  config.onPost!(viewRow.id);
                  setViewRow(null);
                  bump();
                }}
              >
                Post
              </Button>
            )}
            {viewRow && rowCanDelete(viewRow) && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-sm font-medium text-destructive"
                onClick={() => {
                  if (window.confirm(`Delete ${viewRow.number}?`)) {
                    config.onDelete!(viewRow.id);
                    setViewRow(null);
                    bump();
                  }
                }}
              >
                Delete
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

function TransactionListToolbar({
  invoiceListingMode,
  search,
  onSearchChange,
  exportConfig,
  preset,
  dateFrom,
  dateTo,
  onPresetChange,
  onDateFromChange,
  onDateToChange,
  branch,
  onBranchChange,
}: {
  invoiceListingMode: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  exportConfig: {
    title: string;
    invoiceListingMode: boolean;
    showGstColumns: boolean;
    showGstSplitColumns: boolean;
    showInvoiceTypeColumn: boolean;
  };
  preset: ReturnType<typeof useReportDateRange>["preset"];
  dateFrom: string;
  dateTo: string;
  onPresetChange: ReturnType<typeof useReportDateRange>["setPreset"];
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  branch: string;
  onBranchChange: (v: string) => void;
}) {
  const visible = useAccountsFilteredRows<TransactionRow>([]);

  return (
    <AccountsListingToolbar
      onExcel={() => exportTransactionRows(visible, exportConfig)}
      onPdf={() => exportTransactionRows(visible, exportConfig)}
      exportDisabled={visible.length === 0}
    >
      <ReportDateRangeFilter
        preset={preset}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onPresetChange={onPresetChange}
        onDateFromChange={onDateFromChange}
        onDateToChange={onDateToChange}
      />
      <ReportSearchFilter
        value={search}
        onChange={onSearchChange}
        placeholder={invoiceListingMode ? "Search invoice, source, party…" : "Search number, party…"}
        className="min-w-[180px] flex-1 max-w-sm"
      />
      {!invoiceListingMode && (
        <div className="space-y-1 min-w-[100px]">
          <label className={ACCOUNTS_FILTER_LABEL_CLASS}>Branch</label>
          <Input
            className={cn(ACCOUNTS_FILTER_CONTROL_CLASS, "mt-0")}
            placeholder="Branch"
            value={branch}
            onChange={(e) => onBranchChange(e.target.value)}
          />
        </div>
      )}
    </AccountsListingToolbar>
  );
}

function TransactionListPagination({
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
}) {
  const ctx = useAccountsColumnFilterContext();
  const visible = useAccountsFilteredRows<TransactionRow>([]);

  useEffect(() => {
    onPageChange(1);
  }, [ctx?.columnFilters, ctx?.sortKey, ctx?.sortDir, onPageChange]);

  if (visible.length === 0) return null;

  return (
    <AccountsTablePagination
      page={page}
      pageSize={pageSize}
      totalRecords={visible.length}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
    />
  );
}

function TransactionListTable<T>({
  mounted,
  colSpan,
  page,
  pageSize,
  invoiceListingMode,
  showInvoiceTypeColumn,
  showSourceColumns,
  showGstColumns,
  showGstSplitColumns,
  showSchemeSettlementColumn,
  config,
  bump,
  rowCanEdit,
  rowCanPost,
  rowCanDelete,
  onViewRow,
}: {
  mounted: boolean;
  colSpan: number;
  page: number;
  pageSize: number;
  invoiceListingMode: boolean;
  showInvoiceTypeColumn: boolean;
  showSourceColumns: boolean;
  showGstColumns: boolean;
  showGstSplitColumns: boolean;
  showSchemeSettlementColumn: boolean;
  config: TransactionListConfig<T>;
  bump: () => void;
  rowCanEdit: (r: TransactionRow) => boolean | undefined;
  rowCanPost: (r: TransactionRow) => boolean | undefined;
  rowCanDelete: (r: TransactionRow) => boolean | undefined;
  onViewRow: (r: TransactionRow) => void;
}) {
  const router = useRouter();
  const visible = useAccountsFilteredRows<TransactionRow>([]);
  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return visible.slice(start, start + pageSize);
  }, [visible, page, pageSize]);

  return (
    <AccountsTable>
      <AccountsTableHead>
        <AccountsTableHeadRow>
          {showInvoiceTypeColumn && <SortTh label="Type" colKey="invoiceType" />}
          <SortTh label={invoiceListingMode ? "Invoice No" : "Number"} colKey="number" />
          {showSourceColumns && (
            <>
              <SortTh label="Source No" colKey="sourceNo" />
              <SortTh label="Dispatch No" colKey="dispatchNo" />
            </>
          )}
          <SortTh label="Party" colKey="party" className="accounts-col-wide" />
          <SortTh label={invoiceListingMode ? "Invoice Date" : "Date"} colKey="date" filterType="date" />
          {showGstColumns ? (
            showGstSplitColumns ? (
              <>
                <SortTh label="Taxable Value" colKey="taxableValue" filterType="amount" align="right" />
                <SortTh label="CGST" colKey="cgst" filterType="amount" align="right" />
                <SortTh label="SGST" colKey="sgst" filterType="amount" align="right" />
                <SortTh label="IGST" colKey="igst" filterType="amount" align="right" />
                <SortTh label="Invoice Value" colKey="invoiceTotal" filterType="amount" align="right" />
              </>
            ) : (
              <>
                <SortTh label="Taxable Value" colKey="taxableValue" filterType="amount" align="right" />
                <SortTh label="GST Amount" colKey="gstAmount" filterType="amount" align="right" />
                <SortTh
                  label="Invoice Total (Incl. GST)"
                  colKey="invoiceTotal"
                  filterType="amount"
                  align="right"
                />
              </>
            )
          ) : (
            <SortTh label="Amount" colKey="amount" filterType="amount" align="right" />
          )}
          {showSchemeSettlementColumn && (
            <AccountsColumnHeader
              label="Scheme Settlement"
              colKey="schemeSettlementLabel"
              sortable={false}
            />
          )}
          <AccountsColumnHeader
            label="Actions"
            colKey="_actions"
            sortable={false}
            filterable={false}
            align="right"
            className={accountsActionColClass("multi")}
          />
        </AccountsTableHeadRow>
      </AccountsTableHead>
      <AccountsTableBody>
        {!mounted ? (
          <AccountsTableRow>
            <AccountsTableCell colSpan={colSpan} className="accounts-table-empty">
              <p className="text-xs text-muted-foreground">Loading records…</p>
            </AccountsTableCell>
          </AccountsTableRow>
        ) : visible.length === 0 ? (
          <AccountsTableRow>
            <AccountsTableCell colSpan={colSpan} className="accounts-table-empty">
              No records found.
            </AccountsTableCell>
          </AccountsTableRow>
        ) : (
          pagedRows.map((r) => (
            <AccountsTableRow key={r.id}>
              {showInvoiceTypeColumn && (
                <AccountsTableCell>
                  <InvoiceTypeBadge type={r.invoiceType ?? "sales"} />
                </AccountsTableCell>
              )}
              <AccountsTableCell className="text-xs font-medium text-slate-800">
                {r.viewHref ? (
                  <Link href={r.viewHref} className="text-slate-800 hover:text-brand-700 hover:underline">
                    {r.number}
                  </Link>
                ) : (
                  r.number
                )}
              </AccountsTableCell>
              {showSourceColumns && (
                <>
                  <AccountsTableCell mono className="text-brand-700">{r.sourceNo ?? "—"}</AccountsTableCell>
                  <AccountsTableCell mono>{r.dispatchNo ?? "—"}</AccountsTableCell>
                </>
              )}
              <AccountsTableCell>{r.party}</AccountsTableCell>
              <AccountsTableCell>{r.date}</AccountsTableCell>
              {showGstColumns ? (
                showGstSplitColumns ? (
                  <>
                    <AccountsTableCell align="right" money>{r.taxableValue}</AccountsTableCell>
                    <AccountsTableCell align="right" money>{r.cgst}</AccountsTableCell>
                    <AccountsTableCell align="right" money>{r.sgst}</AccountsTableCell>
                    <AccountsTableCell align="right" money>{r.igst}</AccountsTableCell>
                    <AccountsTableCell align="right" money>{r.invoiceTotal}</AccountsTableCell>
                  </>
                ) : (
                  <>
                    <AccountsTableCell align="right" money>{r.taxableValue}</AccountsTableCell>
                    <AccountsTableCell align="right" money>{r.gstAmount}</AccountsTableCell>
                    <AccountsTableCell align="right" money>{r.invoiceTotal}</AccountsTableCell>
                  </>
                )
              ) : (
                <AccountsTableCell align="right" money>{r.amount}</AccountsTableCell>
              )}
              {showSchemeSettlementColumn && (
                <AccountsTableCell>
                  {r.schemeSettlementLabel ? (
                    <span
                      className={cn(
                        "inline-flex h-5 items-center rounded-md border px-1.5 text-xs font-semibold whitespace-nowrap",
                        r.schemeSettlementLabel === "Settled"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-amber-200 bg-amber-50 text-amber-800",
                      )}
                    >
                      {r.schemeSettlementLabel}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </AccountsTableCell>
              )}
              <AccountsTableCell align="right" className={accountsActionColClass("multi")}>
                <AccountsTableActionCell>
                  <AccountsViewAction
                    title="View"
                    onClick={() => {
                      if (r.viewHref) router.push(r.viewHref);
                      else onViewRow(r);
                    }}
                  />
                  {rowCanEdit(r) && (
                    <AccountsEditAction
                      title="Edit"
                      onClick={() => router.push(config.editHref!(r.id))}
                    />
                  )}
                  {rowCanPost(r) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-sm text-brand-700"
                      onClick={() => {
                        config.onPost!(r.id);
                        bump();
                      }}
                    >
                      Post
                    </Button>
                  )}
                  {rowCanDelete(r) && (
                    <AccountsDeleteAction
                      title="Delete"
                      onClick={() => {
                        if (window.confirm(`Delete ${r.number}?`)) {
                          config.onDelete!(r.id);
                          bump();
                        }
                      }}
                    />
                  )}
                </AccountsTableActionCell>
              </AccountsTableCell>
            </AccountsTableRow>
          ))
        )}
      </AccountsTableBody>
    </AccountsTable>
  );
}
