"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AccountsEditAction,
  AccountsTableActionCell,
  AccountsViewAction,
  accountsActionColClass,
} from "@/components/accounts/AccountsTableActions";
import { MoneyAmount } from "@/components/accounts/MoneyAmount";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableFoot,
  AccountsTableHead,
  AccountsTableHeadRow,
  AccountsTableRow,
} from "@/components/accounts/AccountsTable";
import {
  ACCOUNTS_DEFAULT_PAGE_SIZE,
  AccountsTableListing,
  AccountsTableLoading,
  AccountsTablePagination,
  AccountsTableToolbar,
} from "@/components/accounts/AccountsTableListing";
import {
  ReportDateRangeFilter,
  useReportDateRange,
} from "@/components/accounts/ReportFilters";
import {
  ACCOUNTS_FILTER_CONTROL_CLASS,
  ACCOUNTS_FILTER_LABEL_CLASS,
  ACCOUNTS_FILTER_SELECT_CLASS,
} from "@/lib/accounts/accounts-typography";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/app/(app)/accounts/reports/pl/pl-hooks";
import {
  AccountsColumnFilterProvider,
  AccountsColumnHeader,
  SortTh,
  useAccountsColumnFilterContext,
} from "../../components/AccountsUI";
import type {
  AccountsColumnFilterState,
  AccountsColumnFilters,
  ColumnValueOption,
} from "@/lib/accounts/column-filter-types";
import { collectColumnValueCounts } from "@/lib/accounts/column-filter-engine";
import { JournalVoucherService } from "@/services/journal-voucher.service";
import { useAccountsSectionRefresh } from "@/lib/accounts/use-accounts-section-refresh";
import {
  JOURNAL_STATUS_LABELS,
  type JournalVoucherListItem,
  type JournalVoucherListQuery,
  type JournalVoucherStatus,
} from "@/types/journal-voucher.types";
import {
  formatSrNo,
  isDraftEditable,
  journalEditPath,
  journalViewPath,
  ledgerDisplayName,
  toMoneyNumber,
} from "./journal-voucher-utils";

const SORT_KEY_TO_API: Record<string, NonNullable<JournalVoucherListQuery["sort_by"]>> = {
  sr_no: "sr_no",
  voucher_date: "voucher_date",
  debit_ledger: "debit_ledger",
  credit_ledger: "credit_ledger",
  amount: "amount",
  reference_number: "reference_number",
  status: "status",
};

const STATUS_FILTER_OPTIONS = Object.keys(JOURNAL_STATUS_LABELS).map((value) => ({
  value,
  count: 0,
}));

function statusKey(
  status: JournalVoucherStatus,
): "active" | "pending" | "approved" | "rejected" | "draft" | "inactive" | "closed" {
  switch (status) {
    case "POSTED":
    case "APPROVED":
      return "approved";
    case "PENDING_APPROVAL":
      return "pending";
    case "REJECTED":
      return "rejected";
    case "CANCELLED":
    case "REVERSED":
      return "closed";
    case "DRAFT":
      return "draft";
    default:
      return "inactive";
  }
}

function selectedValues(filter?: AccountsColumnFilterState): string[] {
  return (filter?.selectedValues ?? []).map((v) => String(v).trim()).filter(Boolean);
}

function csvSelected(filter?: AccountsColumnFilterState): string | undefined {
  const values = selectedValues(filter);
  return values.length > 0 ? values.join(",") : undefined;
}

function toValueOptions(values: string[]): { value: string; count: number }[] {
  return [...new Set(values.filter(Boolean))].map((value) => ({ value, count: 0 }));
}

function mergeValueOptions(
  ...sources: ColumnValueOption[][]
): ColumnValueOption[] {
  const map = new Map<string, number>();
  for (const source of sources) {
    for (const option of source) {
      const value = option.value?.trim();
      if (!value) continue;
      map.set(value, Math.max(map.get(value) ?? 0, option.count ?? 0));
    }
  }
  return [...map.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value.localeCompare(b.value));
}

function amountRange(filter?: AccountsColumnFilterState): {
  min?: number;
  max?: number;
} {
  if (!filter || filter.type !== "amount") return {};
  const op = filter.numberOperator ?? "equals";
  const v1 = filter.numberValue;
  const v2 = filter.numberValue2;
  if (op === "gt" && v1 != null) return { min: v1 };
  if (op === "lt" && v1 != null) return { max: v1 };
  if (op === "between") {
    return {
      min: v1 != null ? v1 : undefined,
      max: v2 != null ? v2 : undefined,
    };
  }
  if (op === "equals" && v1 != null) return { min: v1, max: v1 };
  return {};
}

function JournalListSortSync({
  sortKey,
  sortDir,
  columnFilters,
  onSortChange,
  onFilterChange,
}: {
  sortKey: string;
  sortDir: "asc" | "desc";
  columnFilters: AccountsColumnFilters;
  onSortChange: (sortKey: string, sortDir: "asc" | "desc") => void;
  onFilterChange: (filters: AccountsColumnFilters) => void;
}) {
  const ctx = useAccountsColumnFilterContext();
  const lastSyncedFiltersRef = useRef<string>("");

  useEffect(() => {
    if (!ctx) return;
    const nextKey = ctx.sortKey || "";
    const nextDir = ctx.sortDir ?? "asc";
    if (nextKey !== sortKey || (nextKey !== "" && nextDir !== sortDir)) {
      onSortChange(nextKey, nextDir);
    }
  }, [ctx?.sortKey, ctx?.sortDir, sortKey, sortDir, onSortChange]);

  useEffect(() => {
    if (!ctx) return;
    const ctxFiltersStr = JSON.stringify(ctx.columnFilters || {});
    if (ctxFiltersStr === lastSyncedFiltersRef.current) return;
    const propFiltersStr = JSON.stringify(columnFilters || {});
    if (ctxFiltersStr !== propFiltersStr) {
      lastSyncedFiltersRef.current = ctxFiltersStr;
      onFilterChange(ctx.columnFilters || {});
    } else {
      lastSyncedFiltersRef.current = ctxFiltersStr;
    }
  }, [ctx?.columnFilters, columnFilters, onFilterChange]);

  return null;
}

function JournalListTable({
  rows,
  loading,
  total,
  debitLedgerOptions,
  creditLedgerOptions,
  ledgerOptionsLoading,
  onLedgerFilterOpen,
}: {
  rows: JournalVoucherListItem[];
  loading: boolean;
  total: number;
  debitLedgerOptions: ColumnValueOption[];
  creditLedgerOptions: ColumnValueOption[];
  ledgerOptionsLoading: boolean;
  onLedgerFilterOpen?: () => void;
}) {
  const router = useRouter();

  return (
    <AccountsTable minWidth={1100}>
      <AccountsTableHead>
        <AccountsTableHeadRow>
          <SortTh label="JV No." colKey="sr_no" filterable={false} />
          <SortTh label="Date" colKey="voucher_date" filterType="date" />
          <SortTh
            label="Debit Ledger"
            colKey="debit_ledger"
            sortable={false}
            filterType="select"
            valueOptions={debitLedgerOptions}
            onFilterOpen={onLedgerFilterOpen}
            optionsLoading={ledgerOptionsLoading}
            optionsReady={debitLedgerOptions.length > 0}
          />
          <SortTh
            label="Credit Ledger"
            colKey="credit_ledger"
            sortable={false}
            filterType="select"
            valueOptions={creditLedgerOptions}
            onFilterOpen={onLedgerFilterOpen}
            optionsLoading={ledgerOptionsLoading}
            optionsReady={creditLedgerOptions.length > 0}
          />
          <SortTh label="Amount" colKey="amount" filterType="amount" align="right" />
          <SortTh label="Reference" colKey="reference_number" filterType="text" />
          <SortTh
            label="Status"
            colKey="status"
            filterType="status"
            valueOptions={STATUS_FILTER_OPTIONS}
            statusOptions={Object.keys(JOURNAL_STATUS_LABELS)}
          />
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
        {loading && rows.length === 0 ? (
          <AccountsTableLoading colSpan={8} message="Loading journals…" />
        ) : rows.length === 0 ? (
          <AccountsTableRow>
            <AccountsTableCell colSpan={8} className="accounts-table-empty">
              No journal vouchers found.
            </AccountsTableCell>
          </AccountsTableRow>
        ) : (
          rows.map((row) => {
            const id = row.journal_voucher_id;
            const canEdit = isDraftEditable(row.status);
            return (
              <AccountsTableRow key={id} className="group">
                <AccountsTableCell mono>
                  <Link
                    href={journalViewPath(id)}
                    className="text-brand-700 hover:underline font-mono text-xs font-semibold"
                  >
                    {formatSrNo(row.sr_no)}
                  </Link>
                </AccountsTableCell>
                <AccountsTableCell className="tabular-nums text-xs">
                  {String(row.voucher_date).slice(0, 10)}
                </AccountsTableCell>
                <AccountsTableCell className="text-xs max-w-[180px] truncate">
                  {ledgerDisplayName({
                    ledger: row.debit_ledger,
                    snapshot: row.debit_ledger_snapshot,
                  })}
                </AccountsTableCell>
                <AccountsTableCell className="text-xs max-w-[180px] truncate">
                  {ledgerDisplayName({
                    ledger: row.credit_ledger,
                    snapshot: row.credit_ledger_snapshot,
                  })}
                </AccountsTableCell>
                <AccountsTableCell align="right" money>
                  <MoneyAmount amount={toMoneyNumber(row.amount)} />
                </AccountsTableCell>
                <AccountsTableCell className="text-xs max-w-[140px] truncate text-muted-foreground">
                  {row.reference_number || "—"}
                </AccountsTableCell>
                <AccountsTableCell>
                  <StatusBadge
                    status={statusKey(row.status)}
                    label={JOURNAL_STATUS_LABELS[row.status] || row.status}
                    size="sm"
                    showDot
                  />
                </AccountsTableCell>
                <AccountsTableCell
                  align="right"
                  className={accountsActionColClass("multi")}
                >
                  <AccountsTableActionCell>
                    <AccountsViewAction
                      title="View"
                      onClick={() => router.push(journalViewPath(id))}
                    />
                    {canEdit ? (
                      <AccountsEditAction
                        title="Edit"
                        onClick={() => router.push(journalEditPath(id))}
                      />
                    ) : null}
                  </AccountsTableActionCell>
                </AccountsTableCell>
              </AccountsTableRow>
            );
          })
        )}
      </AccountsTableBody>
      {!loading && rows.length > 0 ? (
        <AccountsTableFoot>
          <AccountsTableRow>
            <AccountsTableCell colSpan={8} className="text-xs text-muted-foreground">
              Showing {rows.length} of {total} journals
            </AccountsTableCell>
          </AccountsTableRow>
        </AccountsTableFoot>
      ) : null}
    </AccountsTable>
  );
}

export function JournalVoucherListClient() {
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } =
    useReportDateRange("this_year");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(ACCOUNTS_DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<JournalVoucherListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [sortKey, setSortKey] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [columnFilters, setColumnFilters] = useState<AccountsColumnFilters>({});
  const [debitLedgerOptions, setDebitLedgerOptions] = useState<ColumnValueOption[]>([]);
  const [creditLedgerOptions, setCreditLedgerOptions] = useState<ColumnValueOption[]>([]);
  const [ledgerOptionsLoading, setLedgerOptionsLoading] = useState(false);
  const ledgerOptionsLoadedRef = useRef(false);
  const ledgerOptionsInflightRef = useRef(false);

  const loadEligibleLedgers = useCallback(async () => {
    if (ledgerOptionsInflightRef.current) return;
    ledgerOptionsInflightRef.current = true;
    setLedgerOptionsLoading(true);
    try {
      const res = await JournalVoucherService.listEligibleLedgers({
        page: 1,
        page_size: 100,
      });
      const names = (res.data ?? [])
        .map((l) => l.ledger_name || l.alias_name || "")
        .filter(Boolean);
      const options = toValueOptions(names);
      setDebitLedgerOptions(options);
      setCreditLedgerOptions(options);
      ledgerOptionsLoadedRef.current = true;
    } catch {
      /* facet load failures are non-fatal; row-derived options still work */
    } finally {
      ledgerOptionsInflightRef.current = false;
      setLedgerOptionsLoading(false);
    }
  }, []);

  const handleLedgerFilterOpen = useCallback(() => {
    if (ledgerOptionsLoadedRef.current || ledgerOptionsInflightRef.current) return;
    void loadEligibleLedgers();
  }, [loadEligibleLedgers]);

  const refreshTick = useAccountsSectionRefresh("journal-vouchers", { apiListing: true });

  const handleSortChange = useCallback((key: string, dir: "asc" | "desc") => {
    setSortKey(key);
    setSortDir(dir);
    setPage(1);
  }, []);

  const handleFilterChange = useCallback((filters: AccountsColumnFilters) => {
    setColumnFilters(filters);
    setPage(1);
  }, []);

  const onPresetChange = useCallback(
    (p: typeof preset) => {
      setPreset(p);
      setPage(1);
    },
    [setPreset],
  );

  const onDateFromChange = useCallback(
    (v: string) => {
      setDateFrom(v);
      setPage(1);
    },
    [setDateFrom],
  );

  const onDateToChange = useCallback(
    (v: string) => {
      setDateTo(v);
      setPage(1);
    },
    [setDateTo],
  );

  const onSearchChange = useCallback((v: string) => {
    setSearch(v);
    setPage(1);
  }, []);

  const listQuery = useMemo((): JournalVoucherListQuery => {
    const dateFilter = columnFilters.voucher_date;
    const from = dateFilter?.dateFrom || dateFrom || undefined;
    const to = dateFilter?.dateTo || dateTo || undefined;
    const apiSort = SORT_KEY_TO_API[sortKey];
    const colStatus = csvSelected(columnFilters.status);
    const toolbarStatus = statusFilter || undefined;
    const amountFilter = amountRange(columnFilters.amount);
    const referenceFilter = columnFilters.reference_number?.textValue?.trim();

    return {
      page,
      page_size: pageSize,
      search: debouncedSearch.trim() || undefined,
      status: colStatus || toolbarStatus,
      debit_ledger_names: csvSelected(columnFilters.debit_ledger),
      credit_ledger_names: csvSelected(columnFilters.credit_ledger),
      reference_number: referenceFilter || undefined,
      from_date: from || undefined,
      to_date: to || undefined,
      sort_by: apiSort,
      sort_dir: apiSort ? sortDir : undefined,
      amount_min: amountFilter.min,
      amount_max: amountFilter.max,
    };
  }, [
    page,
    pageSize,
    debouncedSearch,
    statusFilter,
    dateFrom,
    dateTo,
    sortKey,
    sortDir,
    columnFilters,
    refreshTick,
  ]);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await JournalVoucherService.list(listQuery);
        if (ac.signal.aborted) return;
        setRows(res.data ?? []);
        setTotal(res.pagination?.total ?? 0);
      } catch (e) {
        if (ac.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Failed to load journals.");
        setRows([]);
        setTotal(0);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [listQuery]);

  const getCellValue = useCallback((row: JournalVoucherListItem, key: string) => {
    switch (key) {
      case "sr_no":
        return formatSrNo(row.sr_no);
      case "voucher_date":
        return String(row.voucher_date).slice(0, 10);
      case "debit_ledger":
        return ledgerDisplayName({
          ledger: row.debit_ledger,
          snapshot: row.debit_ledger_snapshot,
        });
      case "credit_ledger":
        return ledgerDisplayName({
          ledger: row.credit_ledger,
          snapshot: row.credit_ledger_snapshot,
        });
      case "amount":
        return toMoneyNumber(row.amount);
      case "reference_number":
        return row.reference_number || "";
      case "status":
        return row.status;
      default:
        return "";
    }
  }, []);

  const debitLedgerFilterOptions = useMemo(
    () =>
      mergeValueOptions(
        debitLedgerOptions,
        collectColumnValueCounts(rows, "debit_ledger", getCellValue),
      ),
    [debitLedgerOptions, rows, getCellValue],
  );

  const creditLedgerFilterOptions = useMemo(
    () =>
      mergeValueOptions(
        creditLedgerOptions,
        collectColumnValueCounts(rows, "credit_ledger", getCellValue),
      ),
    [creditLedgerOptions, rows, getCellValue],
  );

  return (
    <AccountsTableListing
      toolbar={
        <AccountsTableToolbar
          search={{
            value: search,
            onChange: onSearchChange,
            placeholder: "Search JV no., ledger, reference…",
          }}
          filters={
            <>
              <ReportDateRangeFilter
                preset={preset}
                dateFrom={dateFrom}
                dateTo={dateTo}
                onPresetChange={onPresetChange}
                onDateFromChange={onDateFromChange}
                onDateToChange={onDateToChange}
              />
              <div className="space-y-0.5 shrink-0 w-[148px]">
                <span className={ACCOUNTS_FILTER_LABEL_CLASS}>Status</span>
                <Select
                  value={statusFilter || "all"}
                  onValueChange={(v) => {
                    setStatusFilter(v === "all" ? "" : v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger
                    className={cn(
                      ACCOUNTS_FILTER_CONTROL_CLASS,
                      ACCOUNTS_FILTER_SELECT_CLASS,
                      "mt-0 w-[148px]",
                    )}
                  >
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">
                      All statuses
                    </SelectItem>
                    {Object.entries(JOURNAL_STATUS_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k} className="text-xs">
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          }
        />
      }
      footer={
        <AccountsTablePagination
          page={page}
          pageSize={pageSize}
          totalRecords={total}
          onPageChange={setPage}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(1);
          }}
          recordLabel="journals"
        />
      }
    >
      {error ? (
        <div className="px-4 py-3 text-xs text-red-600 bg-red-50 border-b border-red-100">
          {error}
        </div>
      ) : null}

      <AccountsColumnFilterProvider
        rows={rows}
        getCellValue={getCellValue}
        columnConfig={{
          status: {
            type: "status",
            options: Object.keys(JOURNAL_STATUS_LABELS),
            optionLabels: JOURNAL_STATUS_LABELS,
          },
          voucher_date: { type: "date" },
          debit_ledger: { type: "select" },
          credit_ledger: { type: "select" },
          amount: { type: "amount" },
          reference_number: { type: "text" },
        }}
        defaultSortKey={null}
        defaultSortDir="desc"
      >
        <JournalListSortSync
          sortKey={sortKey}
          sortDir={sortDir}
          columnFilters={columnFilters}
          onSortChange={handleSortChange}
          onFilterChange={handleFilterChange}
        />
        <JournalListTable
          rows={rows}
          loading={loading}
          total={total}
          debitLedgerOptions={debitLedgerFilterOptions}
          creditLedgerOptions={creditLedgerFilterOptions}
          ledgerOptionsLoading={ledgerOptionsLoading}
          onLedgerFilterOpen={handleLedgerFilterOpen}
        />
      </AccountsColumnFilterProvider>
    </AccountsTableListing>
  );
}
