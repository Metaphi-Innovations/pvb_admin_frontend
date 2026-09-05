"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Settings2 } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import {
  AccountsListingTableCard,
  AccountsListingTabsRow,
} from "@/components/accounts/AccountsListingHeader";
import { AgeingBreakpointPanel } from "@/components/accounts/AgeingBreakpointPanel";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { formatDisplayDate } from "@/lib/accounts/date-display";
import {
  breakpointsToDraft,
  DEFAULT_AGEING_BREAKPOINTS,
  getApiAgeingBucketKeys,
  type AgeingBreakpoints,
} from "@/lib/accounts/ageing-breakpoints";
import { computePaymentAllocationSummary } from "@/lib/accounts/payables-data";
import type {
  ApiSupplierBillOutstandingRow,
  ApiVendorAgeingGroup,
  ApiVendorOutstandingRow,
  PayablesExportView,
} from "@/types/payables.types";
import {
  AGING_SORT_KEY_TO_API,
  BILLS_SORT_KEY_TO_API,
  SUMMARY_SORT_KEY_TO_API,
} from "@/lib/accounts/payables-api-mappers";
import { usePayablesListing } from "@/lib/accounts/use-payables-listing";
import { useAccountsSectionRefresh } from "@/lib/accounts/use-accounts-section-refresh";
import { SupplierListService } from "@/services/supplier-list.service";
import { PayablesService } from "@/services/payables.service";
import { formatMoneyNumber, MONEY_CELL_CLASS } from "@/lib/accounts/money-format";
import { defaultAsOnDate } from "@/lib/accounts/report-date-presets";
import { PAYABLE_STATUS_COLUMN_FILTER } from "@/lib/accounts/column-filter-presets";
import type { AccountsColumnFilterConfig } from "@/lib/accounts/column-filter-types";
import {
  AccountsColumnFilterProvider,
  SectionTabs,
  useAccountsColumnFilterContext,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
import {
  ReportFilterRow,
  ReportAsOnDateFilter,
  ReportVendorMultiFilter,
  ReportSearchFilter,
  ReportFilterResetButton,
} from "@/components/accounts/ReportFilters";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { payableStatusToBadge } from "@/lib/accounts/accounts-status-badges";
import {
  AccountsRichTable,
  AccountsTableScroll,
  type AccountsRichColumnDef,
} from "@/components/accounts/AccountsTable";
import { AccountsTablePagination } from "@/components/accounts/AccountsTableListing";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import {
  AccountsTableActionCell,
  AccountsViewAction,
  accountsActionColClass,
} from "@/components/accounts/AccountsTableActions";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AccountsToast, useAccountsToast } from "@/components/accounts/AccountsToast";
import { cn } from "@/lib/utils";
import { AgeingGroupedTable } from "./AgeingGroupedTable";

type WorkspaceView = "summary" | "bills" | "ageing";
type DueStatusFilter = "all" | "overdue" | "not_due";

const VIEW_TABS = [
  { id: "summary", label: "Vendor Summary" },
  { id: "bills", label: "Bill View" },
  { id: "ageing", label: "Ageing View" },
];

function AmountCell({ amount, className }: { amount: number; className?: string }) {
  return (
    <span className={cn("inline-block whitespace-nowrap tabular-nums", MONEY_CELL_CLASS, className)}>
      ₹{formatMoneyNumber(amount)}
    </span>
  );
}

function parseViewParam(raw: string | null): WorkspaceView {
  if (raw === "bills" || raw === "bill" || raw === "invoice" || raw === "invoices") return "bills";
  if (raw === "ageing" || raw === "aging") return "ageing";
  if (raw === "summary" || raw === "vendors" || raw === "suppliers") return "summary";
  return "summary";
}

function resolveInitialView(searchParams: URLSearchParams): WorkspaceView {
  const view = searchParams.get("view");
  const tab = searchParams.get("tab");
  if (view) return parseViewParam(view);
  if (tab) return parseViewParam(tab);
  return "summary";
}

function PayablesListSortSync({
  sortKey,
  sortDir,
  onSortChange,
}: {
  sortKey: string;
  sortDir: "asc" | "desc";
  onSortChange: (sortKey: string, sortDir: "asc" | "desc") => void;
}) {
  const ctx = useAccountsColumnFilterContext();

  useEffect(() => {
    if (!ctx) return;
    const nextKey = ctx.sortKey || "";
    const nextDir = ctx.sortDir ?? "asc";
    if (nextKey !== sortKey || (nextKey !== "" && nextDir !== sortDir)) {
      onSortChange(nextKey, nextDir);
    }
  }, [ctx?.sortKey, ctx?.sortDir, sortKey, sortDir, onSortChange]);

  return null;
}

function SummaryTable({
  rows,
  totalRecords,
  loading,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  rows: ApiVendorOutstandingRow[];
  totalRecords: number;
  loading: boolean;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
}) {
  const router = useRouter();
  const ctx = useAccountsColumnFilterContext();
  const visible = useAccountsFilteredRows(rows);

  useEffect(() => {
    onPageChange(1);
  }, [ctx?.columnFilters, ctx?.sortKey, ctx?.sortDir, onPageChange]);

  const columns: AccountsRichColumnDef<ApiVendorOutstandingRow>[] = useMemo(
    () => [
      {
        key: "vendorName",
        label: "Vendor Name",
        filterType: "text",
        render: (r) => (
          <span className="text-xs font-medium leading-snug line-clamp-2" title={r.vendorName}>
            {r.vendorName}
          </span>
        ),
      },
      {
        key: "vendorCode",
        label: "Vendor Code",
        filterType: "text",
        render: (r) => (
          <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
            {r.vendorCode}
          </span>
        ),
      },
      {
        key: "outstanding",
        label: "Total Outstanding",
        align: "right",
        filterType: "amount",
        render: (r) => <AmountCell amount={r.outstanding} className="font-semibold" />,
      },
      {
        key: "overdueAmount",
        label: "Overdue Amount",
        align: "right",
        filterType: "amount",
        render: (r) => <AmountCell amount={r.overdueAmount} />,
      },
      {
        key: "notDueAmount",
        label: "Not Due Amount",
        align: "right",
        filterType: "amount",
        render: (r) => <AmountCell amount={r.notDueAmount} />,
      },
      {
        key: "oldestDueDate",
        label: "Oldest Due",
        filterType: "date",
        render: (r) => (
          <span className="text-xs whitespace-nowrap">{formatDisplayDate(r.oldestDueDate)}</span>
        ),
      },
      {
        key: "lastPaymentDate",
        label: "Last Payment Date",
        filterType: "date",
        render: (r) => (
          <span className="text-xs whitespace-nowrap">{formatDisplayDate(r.lastPaymentDate)}</span>
        ),
      },
      {
        key: "status",
        label: "Status",
        filterType: "status",
        render: (r) => {
          const badge = payableStatusToBadge(r.status);
          return <StatusBadge status={badge.status} label={badge.label} size="sm" showDot />;
        },
      },
      {
        key: "_actions",
        label: "",
        sortable: false,
        filterable: false,
        align: "right",
        className: accountsActionColClass("single"),
        render: (r) => (
          <AccountsTableActionCell variant="single">
            <AccountsViewAction
              title="View vendor"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/accounts/payables/outstanding/${r.vendorId}`);
              }}
            />
          </AccountsTableActionCell>
        ),
      },
    ],
    [router],
  );

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <AccountsTableScroll>
        {loading && rows.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
            Loading vendor summary…
          </div>
        ) : (
          <AccountsRichTable
            columns={columns}
            rows={visible}
            minWidth={1100}
            getRowKey={(r) => r.vendorId}
            emptyMessage="No vendors with outstanding balances."
            onRowClick={(r) => router.push(`/accounts/payables/outstanding/${r.vendorId}`)}
          />
        )}
      </AccountsTableScroll>
      {totalRecords > 0 && (
        <AccountsTablePagination
          page={page}
          pageSize={pageSize}
          totalRecords={totalRecords}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  );
}

function BillTable({
  rows,
  totalRecords,
  loading,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  rows: ApiSupplierBillOutstandingRow[];
  totalRecords: number;
  loading: boolean;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
}) {
  const router = useRouter();
  const ctx = useAccountsColumnFilterContext();
  const visible = useAccountsFilteredRows(rows);

  useEffect(() => {
    onPageChange(1);
  }, [ctx?.columnFilters, ctx?.sortKey, ctx?.sortDir, onPageChange]);

  const columns: AccountsRichColumnDef<ApiSupplierBillOutstandingRow>[] = useMemo(
    () => [
      {
        key: "vendorName",
        label: "Vendor",
        filterType: "text",
        render: (r) => (
          <span className="text-xs font-medium leading-snug line-clamp-2">{r.vendorName}</span>
        ),
      },
      {
        key: "invoiceNo",
        label: "Purchase Invoice No.",
        filterType: "text",
        render: (r) => (
          <span className="text-xs font-mono font-semibold text-brand-700">{r.invoiceNo}</span>
        ),
      },
      {
        key: "invoiceDate",
        label: "Invoice Date",
        filterType: "date",
        render: (r) => (
          <span className="text-xs whitespace-nowrap">{formatDisplayDate(r.invoiceDate)}</span>
        ),
      },
      {
        key: "dueDate",
        label: "Due Date",
        filterType: "date",
        render: (r) => (
          <span className="text-xs whitespace-nowrap">{formatDisplayDate(r.dueDate)}</span>
        ),
      },
      {
        key: "billAmount",
        label: "Original Amount",
        align: "right",
        filterType: "amount",
        render: (r) => <AmountCell amount={r.billAmount} />,
      },
      {
        key: "paidAmount",
        label: "Paid Amount",
        align: "right",
        filterType: "amount",
        render: (r) => <AmountCell amount={r.paidAmount} />,
      },
      {
        key: "debitNoteAdjusted",
        label: "Debit Note Adj.",
        align: "right",
        filterType: "amount",
        render: (r) => <AmountCell amount={r.debitNoteAdjusted} />,
      },
      {
        key: "outstanding",
        label: "Outstanding",
        align: "right",
        filterType: "amount",
        render: (r) => <AmountCell amount={r.outstanding} className="font-semibold" />,
      },
      {
        key: "overdueDays",
        label: "Overdue Days",
        align: "right",
        filterType: "number",
        render: (r) => (
          <span className="text-xs tabular-nums">
            {r.outstanding > 0 ? r.overdueDays : "—"}
          </span>
        ),
      },
      {
        key: "status",
        label: "Status",
        filterType: "status",
        render: (r) => {
          const badge = payableStatusToBadge(r.status);
          return <StatusBadge status={badge.status} label={badge.label} size="sm" showDot />;
        },
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <AccountsTableScroll>
        {loading && rows.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
            Loading bills…
          </div>
        ) : (
          <AccountsRichTable
            columns={columns}
            rows={visible}
            minWidth={1200}
            getRowKey={(r) => r.openItemId}
            emptyMessage="No open purchase bills."
            onRowClick={(r) =>
              router.push(
                `/accounts/payables/outstanding/${r.vendorId}?billId=${r.billId}`,
              )
            }
          />
        )}
      </AccountsTableScroll>
      {totalRecords > 0 && (
        <AccountsTablePagination
          page={page}
          pageSize={pageSize}
          totalRecords={totalRecords}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  );
}

export default function VendorOutstandingClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sectionRefresh = useAccountsSectionRefresh("payables");
  const { toast, showExportCompleted, showToast, dismissToast } = useAccountsToast();
  const [exporting, setExporting] = useState(false);

  const [view, setView] = useState<WorkspaceView>(() =>
    resolveInitialView(new URLSearchParams(searchParams.toString())),
  );
  const [asOnDate, setAsOnDate] = useState(defaultAsOnDate());
  const [search, setSearch] = useState("");
  const [supplierIds, setSupplierIds] = useState<string[]>([]);
  const [dueStatus, setDueStatus] = useState<DueStatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [appliedBreakpoints, setAppliedBreakpoints] =
    useState<AgeingBreakpoints>(DEFAULT_AGEING_BREAKPOINTS);
  const [breakpointDraft, setBreakpointDraft] = useState(() =>
    breakpointsToDraft(DEFAULT_AGEING_BREAKPOINTS),
  );
  const [breakpointError, setBreakpointError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sortKey, setSortKey] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [vendors, setVendors] = useState<{ id: string; vendorName: string }[]>([]);

  useEffect(() => {
    setView(resolveInitialView(new URLSearchParams(searchParams.toString())));
  }, [searchParams]);

  useEffect(() => {
    setRefreshKey((k) => k + 1);
  }, [sectionRefresh]);

  const setWorkspaceView = useCallback(
    (next: WorkspaceView) => {
      setView(next);
      setPage(1);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("tab");
      if (next === "summary") params.delete("view");
      else params.set("view", next === "bills" ? "bills" : next);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const items = await SupplierListService.dropdown();
        if (cancelled) return;
        setVendors(
          items.map((s) => ({
            id: s.supplier_id,
            vendorName: s.supplierName,
          })),
        );
      } catch {
        if (!cancelled) setVendors([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const handleSortChange = useCallback((key: string, dir: "asc" | "desc") => {
    setSortKey(key);
    setSortDir(dir);
    setPage(1);
  }, []);

  const {
    loading,
    error,
    total,
    summaryRows,
    billRows,
    ageingRows,
  } = usePayablesListing({
    view,
    asOnDate,
    search,
    supplierIds,
    dueStatus,
    page,
    pageSize,
    sortKey,
    sortDir,
    appliedBreakpoints,
    refreshKey,
  });

  const pendingAllocations = useMemo(() => {
    void refreshKey;
    return computePaymentAllocationSummary().pendingAllocationCount;
  }, [refreshKey, sectionRefresh]);

  /** API bucket keys in breakpoint order — matches backend labels. */
  const ageingBucketKeys = useMemo(
    () => getApiAgeingBucketKeys(appliedBreakpoints),
    [appliedBreakpoints],
  );

  const hasFilters =
    search.trim() !== "" || supplierIds.length > 0 || dueStatus !== "all";

  const clearFilters = () => {
    setSearch("");
    setSupplierIds([]);
    setDueStatus("all");
    setPage(1);
  };

  const buildExportQuery = useCallback(() => {
    const viewMap: Record<WorkspaceView, PayablesExportView> = {
      summary: "summary",
      bills: "bills",
      ageing: "ageing",
    };
    const sortMap =
      view === "summary"
        ? SUMMARY_SORT_KEY_TO_API
        : view === "bills"
          ? BILLS_SORT_KEY_TO_API
          : AGING_SORT_KEY_TO_API;
    const apiSort = sortKey ? sortMap[sortKey] : undefined;
    return {
      view: viewMap[view],
      search: search.trim() || undefined,
      supplierIds: supplierIds.length > 0 ? supplierIds : undefined,
      asOfDate: asOnDate,
      excludeZeroBalance: true,
      status: dueStatus === "overdue" ? "OVERDUE" : undefined,
      dueStatus,
      agingBreakpoints: appliedBreakpoints.join(","),
      sortBy: apiSort,
      sortOrder: apiSort ? sortDir : undefined,
    };
  }, [
    view,
    search,
    supplierIds,
    asOnDate,
    dueStatus,
    appliedBreakpoints,
    sortKey,
    sortDir,
  ]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await PayablesService.exportExcel(buildExportQuery());
      showExportCompleted();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to export payables.", "error");
    } finally {
      setExporting(false);
    }
  };

  const handlePdf = async () => {
    setExporting(true);
    try {
      await PayablesService.exportPdf(buildExportQuery());
      showExportCompleted();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to export payables.", "error");
    } finally {
      setExporting(false);
    }
  };

  const getSummaryCell = useCallback((row: ApiVendorOutstandingRow, key: string) => {
    if (key === "status") return row.status;
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  const getBillCell = useCallback((row: ApiSupplierBillOutstandingRow, key: string) => {
    if (key === "overdueDays") return row.outstanding > 0 ? row.overdueDays : 0;
    if (key === "status") return row.status;
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  const getAgeingCell = useCallback((row: ApiVendorAgeingGroup, key: string) => {
    if (key === "vendorName") return row.vendorName;
    if (key === "totalOutstanding") return row.totals.totalOutstanding;
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  const providerRows =
    view === "summary" ? summaryRows : view === "bills" ? billRows : ageingRows;

  const columnConfig: AccountsColumnFilterConfig =
    view === "summary"
      ? {
          vendorName: { type: "text" },
          vendorCode: { type: "text" },
          outstanding: { type: "amount" },
          overdueAmount: { type: "amount" },
          notDueAmount: { type: "amount" },
          oldestDueDate: { type: "date" },
          lastPaymentDate: { type: "date" },
          status: PAYABLE_STATUS_COLUMN_FILTER,
        }
      : view === "bills"
        ? {
            vendorName: { type: "text" },
            invoiceNo: { type: "text" },
            invoiceDate: { type: "date" },
            dueDate: { type: "date" },
            billAmount: { type: "amount" },
            paidAmount: { type: "amount" },
            debitNoteAdjusted: { type: "amount" },
            outstanding: { type: "amount" },
            overdueDays: { type: "number" },
            status: PAYABLE_STATUS_COLUMN_FILTER,
          }
        : {
            vendorName: { type: "text" },
            totalOutstanding: { type: "amount" },
          };

  const getCellValue =
    view === "summary" ? getSummaryCell : view === "bills" ? getBillCell : getAgeingCell;

  const defaultSortKey =
    view === "summary" ? "outstanding" : view === "bills" ? "invoiceDate" : "totalOutstanding";

  return (
    <AccountsColumnFilterProvider
      rows={providerRows as never[]}
      getCellValue={getCellValue as never}
      columnConfig={columnConfig}
      defaultSortKey={defaultSortKey}
      defaultSortDir="desc"
    >
      <PayablesListSortSync
        sortKey={sortKey}
        sortDir={sortDir}
        onSortChange={handleSortChange}
      />
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Payables", "Outstanding")}
        title="Outstanding"
        description="Vendor payables — outstanding balances from posted purchase invoices."
        hideDescription
        actions={
          pendingAllocations > 0 ? (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs font-medium gap-1.5 border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
              onClick={() => router.push("/accounts/payables/payment-allocation")}
            >
              Pending Payment Allocations: {pendingAllocations}
            </Button>
          ) : undefined
        }
        filters={
          <ReportFilterRow
            end={
              <AccountsExportMenu
                onExcel={() => void handleExport()}
                onPdf={() => void handlePdf()}
                disabled={loading || exporting}
              />
            }
          >
            <ReportSearchFilter
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder={view === "bills" ? "Search bill, vendor…" : "Search vendor…"}
            />
            <ReportVendorMultiFilter
              values={supplierIds}
              onChange={(v) => {
                setSupplierIds(v);
                setPage(1);
              }}
              vendors={vendors}
            />
            {view !== "ageing" && (
              <Select
                value={dueStatus}
                onValueChange={(v) => {
                  setDueStatus(v as DueStatusFilter);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[130px] text-xs">
                  <SelectValue placeholder="Due status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="not_due">Not Due</SelectItem>
                </SelectContent>
              </Select>
            )}
            <ReportAsOnDateFilter
              value={asOnDate}
              onChange={(v) => {
                setAsOnDate(v);
                setPage(1);
              }}
            />
            <ReportFilterResetButton
              showOnlyWhenActive
              active={hasFilters}
              onClick={clearFilters}
            />
          </ReportFilterRow>
        }
        layout="split"
        className="h-full min-h-0"
      >
        <AccountsListingTableCard className="flex flex-col flex-1 min-h-0">
          {error ? (
            <div className="px-4 py-3 text-xs text-red-600 bg-red-50 border-b border-red-100">
              {error}
            </div>
          ) : null}
          <AccountsListingTabsRow className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-border/70">
            <SectionTabs
              tabs={VIEW_TABS}
              active={view}
              onChange={(id) => setWorkspaceView(id as WorkspaceView)}
            />
            {view === "ageing" && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 shrink-0">
                    <Settings2 className="w-3.5 h-3.5" /> Ageing buckets
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-[340px] p-3">
                  <AgeingBreakpointPanel
                    draft={breakpointDraft}
                    onDraftChange={setBreakpointDraft}
                    onApply={(bp) => {
                      setAppliedBreakpoints(bp);
                      setPage(1);
                    }}
                    error={breakpointError}
                    onErrorChange={setBreakpointError}
                  />
                </PopoverContent>
              </Popover>
            )}
          </AccountsListingTabsRow>
          {view === "summary" && (
            <SummaryTable
              rows={summaryRows}
              totalRecords={total}
              loading={loading}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(1);
              }}
            />
          )}
          {view === "bills" && (
            <BillTable
              rows={billRows}
              totalRecords={total}
              loading={loading}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(1);
              }}
            />
          )}
          {view === "ageing" && (
            <AgeingGroupedTable
              groups={ageingRows}
              bucketKeys={ageingBucketKeys}
              totalRecords={total}
              loading={loading}
              error={error}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(1);
              }}
            />
          )}
        </AccountsListingTableCard>
      </AccountsPageShell>
      <AccountsToast toast={toast} onDismiss={dismissToast} />
    </AccountsColumnFilterProvider>
  );
}
