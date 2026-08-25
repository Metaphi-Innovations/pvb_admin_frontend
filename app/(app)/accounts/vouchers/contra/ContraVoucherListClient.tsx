"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
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
  SortTh,
  AccountsColumnHeader,
  useAccountsColumnFilterContext,
} from "../../components/AccountsUI";
import type {
  AccountsColumnFilterState,
  AccountsColumnFilters,
} from "@/lib/accounts/column-filter-types";
import { ContraVoucherService } from "@/services/contra-voucher.service";
import { WarehouseService } from "@/services/warehouse.service";
import {
  CONTRA_ACCOUNT_TYPE_LABELS,
  CONTRA_STATUS_LABELS,
  type ContraAccountType,
  type ContraEligibleAccount,
  type ContraVoucherListItem,
  type ContraVoucherListQuery,
  type ContraVoucherListSortBy,
  type ContraVoucherStatus,
} from "@/types/contra-voucher.types";
import {
  contraEditPath,
  contraViewPath,
  formatEligibleBankLabel,
  formatEligibleCashLabel,
  formatSrNo,
  isBankEligible,
  isCashEligible,
  isDraftEditable,
  toMoneyNumber,
} from "./contra-voucher-utils";

/** UI column key → backend sort_by whitelist. Transfer From/To are intentionally omitted. */
const SORT_KEY_TO_API: Record<string, ContraVoucherListSortBy> = {
  sr_no: "sr_no",
  voucher_date: "voucher_date",
  from_warehouse: "from_warehouse_name",
  to_warehouse: "to_warehouse_name",
  from_account_type: "from_account_type",
  to_account_type: "to_account_type",
  amount: "amount",
  status: "status",
};

type AccountFilterOption = {
  id: string;
  label: string;
  accountType: ContraAccountType;
};

function statusKey(
  status: ContraVoucherStatus,
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

function firstSelected(filter?: AccountsColumnFilterState): string | undefined {
  const values = selectedValues(filter);
  return values.length > 0 ? values[0] : undefined;
}

function toValueOptions(values: string[]): { value: string; count: number }[] {
  return [...new Set(values.filter(Boolean))].map((value) => ({ value, count: 0 }));
}

function eligibleToFilterOptions(rows: ContraEligibleAccount[]): AccountFilterOption[] {
  const out: AccountFilterOption[] = [];
  for (const row of rows) {
    if (isCashEligible(row)) {
      out.push({
        id: row.cash_ledger_id,
        label: formatEligibleCashLabel(row),
        accountType: "CASH",
      });
    } else if (isBankEligible(row)) {
      out.push({
        id: row.bank_account_id,
        label: formatEligibleBankLabel(row),
        accountType: "BANK",
      });
    }
  }
  return out;
}

const STATUS_FILTER_OPTIONS = toValueOptions(Object.keys(CONTRA_STATUS_LABELS));
const ACCOUNT_TYPE_FILTER_OPTIONS = toValueOptions(
  Object.keys(CONTRA_ACCOUNT_TYPE_LABELS),
);

function ContraListSortSync({
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
    const propFiltersStr = JSON.stringify(columnFilters || {});
    if (ctxFiltersStr !== propFiltersStr) {
      onFilterChange(ctx.columnFilters || {});
    }
  }, [ctx?.columnFilters, columnFilters, onFilterChange]);

  return null;
}

function ContraListTable({
  rows,
  loading,
  total,
  branchOptions,
  fromAccountOptions,
  toAccountOptions,
}: {
  rows: ContraVoucherListItem[];
  loading: boolean;
  total: number;
  branchOptions: { value: string; count: number }[];
  fromAccountOptions: { value: string; count: number }[];
  toAccountOptions: { value: string; count: number }[];
}) {
  const router = useRouter();

  return (
    <AccountsTable minWidth={1280}>
      <AccountsTableHead>
        <AccountsTableHeadRow>
          <SortTh label="Contra No." colKey="sr_no" filterable={false} />
          <SortTh label="Date" colKey="voucher_date" filterType="date" />
          <SortTh
            label="From Branch"
            colKey="from_warehouse"
            filterType="select"
            valueOptions={branchOptions}
          />
          <SortTh
            label="Transfer From"
            colKey="from_account"
            sortable={false}
            filterType="select"
            valueOptions={fromAccountOptions}
          />
          <SortTh
            label="From Type"
            colKey="from_account_type"
            filterType="status"
            valueOptions={ACCOUNT_TYPE_FILTER_OPTIONS}
            statusOptions={Object.keys(CONTRA_ACCOUNT_TYPE_LABELS)}
          />
          <SortTh
            label="To Branch"
            colKey="to_warehouse"
            filterType="select"
            valueOptions={branchOptions}
          />
          <SortTh
            label="Transfer To"
            colKey="to_account"
            sortable={false}
            filterType="select"
            valueOptions={toAccountOptions}
          />
          <SortTh
            label="To Type"
            colKey="to_account_type"
            filterType="status"
            valueOptions={ACCOUNT_TYPE_FILTER_OPTIONS}
            statusOptions={Object.keys(CONTRA_ACCOUNT_TYPE_LABELS)}
          />
          <SortTh label="Amount" colKey="amount" filterable={false} align="right" />
          <SortTh
            label="Reference"
            colKey="reference_number"
            filterable={false}
            sortable={false}
          />
          <SortTh
            label="Status"
            colKey="status"
            filterType="status"
            valueOptions={STATUS_FILTER_OPTIONS}
            statusOptions={Object.keys(CONTRA_STATUS_LABELS)}
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
        {loading ? (
          <AccountsTableRow>
            <AccountsTableCell colSpan={12} className="accounts-table-empty">
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading contra vouchers…
              </span>
            </AccountsTableCell>
          </AccountsTableRow>
        ) : rows.length === 0 ? (
          <AccountsTableRow>
            <AccountsTableCell colSpan={12} className="accounts-table-empty">
              No contra vouchers found.
            </AccountsTableCell>
          </AccountsTableRow>
        ) : (
          rows.map((row) => {
            const id = row.contra_voucher_id;
            const canEdit = isDraftEditable(row.status);
            return (
              <AccountsTableRow key={id} className="group">
                <AccountsTableCell mono>
                  <Link
                    href={contraViewPath(id)}
                    className="text-brand-700 hover:underline font-mono text-xs font-semibold"
                  >
                    {formatSrNo(row.sr_no)}
                  </Link>
                </AccountsTableCell>
                <AccountsTableCell className="tabular-nums text-xs">
                  {String(row.voucher_date).slice(0, 10)}
                </AccountsTableCell>
                <AccountsTableCell className="text-xs">
                  {row.from_warehouse?.warehouse_name || "—"}
                </AccountsTableCell>
                <AccountsTableCell className="text-xs max-w-[160px] truncate">
                  {row.from_ledger?.ledger_name || "—"}
                </AccountsTableCell>
                <AccountsTableCell className="text-xs">
                  {CONTRA_ACCOUNT_TYPE_LABELS[row.from_account_type] ||
                    row.from_account_type}
                </AccountsTableCell>
                <AccountsTableCell className="text-xs">
                  {row.to_warehouse?.warehouse_name || "—"}
                </AccountsTableCell>
                <AccountsTableCell className="text-xs max-w-[160px] truncate">
                  {row.to_ledger?.ledger_name || "—"}
                </AccountsTableCell>
                <AccountsTableCell className="text-xs">
                  {CONTRA_ACCOUNT_TYPE_LABELS[row.to_account_type] ||
                    row.to_account_type}
                </AccountsTableCell>
                <AccountsTableCell align="right" money>
                  <MoneyAmount amount={toMoneyNumber(row.amount)} />
                </AccountsTableCell>
                <AccountsTableCell className="text-xs text-muted-foreground max-w-[120px] truncate">
                  {row.reference_number || "—"}
                </AccountsTableCell>
                <AccountsTableCell>
                  <StatusBadge
                    status={statusKey(row.status)}
                    label={CONTRA_STATUS_LABELS[row.status] || row.status}
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
                      onClick={() => router.push(contraViewPath(id))}
                    />
                    {canEdit ? (
                      <AccountsEditAction
                        title="Edit"
                        onClick={() => router.push(contraEditPath(id))}
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
            <AccountsTableCell colSpan={12} className="text-xs text-muted-foreground">
              Showing {rows.length} of {total} contra vouchers
            </AccountsTableCell>
          </AccountsTableRow>
        </AccountsTableFoot>
      ) : null}
    </AccountsTable>
  );
}

export function ContraVoucherListClient() {
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } =
    useReportDateRange("this_month");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [fromWarehouseId, setFromWarehouseId] = useState<string>("");
  const [toWarehouseId, setToWarehouseId] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(ACCOUNTS_DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ContraVoucherListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [sortKey, setSortKey] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [columnFilters, setColumnFilters] = useState<AccountsColumnFilters>({});
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
  const [fromAccountOpts, setFromAccountOpts] = useState<AccountFilterOption[]>([]);
  const [toAccountOpts, setToAccountOpts] = useState<AccountFilterOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const wh = await WarehouseService.dropdown().catch(() => []);
        if (cancelled) return;
        setWarehouses(
          wh
            .map((w) => ({
              id: w.warehouse_id,
              name: w.warehouse_name,
            }))
            .filter((w) => w.id && w.name),
        );
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const branchOptions = useMemo(
    () => toValueOptions(warehouses.map((w) => w.name)),
    [warehouses],
  );

  const warehouseIdByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const w of warehouses) map.set(w.name, w.id);
    return map;
  }, [warehouses]);

  const resolvedFromWh = useMemo(() => {
    const colFromWhName = firstSelected(columnFilters.from_warehouse);
    return (
      fromWarehouseId ||
      (colFromWhName ? warehouseIdByName.get(colFromWhName) : undefined) ||
      undefined
    );
  }, [fromWarehouseId, columnFilters.from_warehouse, warehouseIdByName]);

  const resolvedToWh = useMemo(() => {
    const colToWhName = firstSelected(columnFilters.to_warehouse);
    return (
      toWarehouseId ||
      (colToWhName ? warehouseIdByName.get(colToWhName) : undefined) ||
      undefined
    );
  }, [toWarehouseId, columnFilters.to_warehouse, warehouseIdByName]);

  const fromType = firstSelected(columnFilters.from_account_type) as
    | ContraAccountType
    | undefined;
  const toType = firstSelected(columnFilters.to_account_type) as
    | ContraAccountType
    | undefined;

  // Clear stale From account filter when warehouse / type context changes
  useEffect(() => {
    setColumnFilters((prev) => {
      if (!prev.from_account) return prev;
      const next = { ...prev };
      delete next.from_account;
      return next;
    });
  }, [resolvedFromWh, fromType]);

  // Clear stale To account filter when warehouse / type context changes
  useEffect(() => {
    setColumnFilters((prev) => {
      if (!prev.to_account) return prev;
      const next = { ...prev };
      delete next.to_account;
      return next;
    });
  }, [resolvedToWh, toType]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!resolvedFromWh) {
        setFromAccountOpts([]);
        return;
      }
      try {
        const res = await ContraVoucherService.listEligibleAccounts({
          warehouse_id: resolvedFromWh,
          account_type: fromType,
          page: 1,
          page_size: 100,
        });
        if (cancelled) return;
        setFromAccountOpts(eligibleToFilterOptions(res.data ?? []));
      } catch {
        if (!cancelled) setFromAccountOpts([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resolvedFromWh, fromType]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!resolvedToWh) {
        setToAccountOpts([]);
        return;
      }
      try {
        const res = await ContraVoucherService.listEligibleAccounts({
          warehouse_id: resolvedToWh,
          account_type: toType,
          page: 1,
          page_size: 100,
        });
        if (cancelled) return;
        setToAccountOpts(eligibleToFilterOptions(res.data ?? []));
      } catch {
        if (!cancelled) setToAccountOpts([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resolvedToWh, toType]);

  const fromAccountById = useMemo(() => {
    const map = new Map<string, AccountFilterOption>();
    for (const o of fromAccountOpts) map.set(o.id, o);
    return map;
  }, [fromAccountOpts]);

  const toAccountById = useMemo(() => {
    const map = new Map<string, AccountFilterOption>();
    for (const o of toAccountOpts) map.set(o.id, o);
    return map;
  }, [toAccountOpts]);

  const fromAccountValueOptions = useMemo(
    () => fromAccountOpts.map((o) => ({ value: o.id, count: 0 })),
    [fromAccountOpts],
  );

  const toAccountValueOptions = useMemo(
    () => toAccountOpts.map((o) => ({ value: o.id, count: 0 })),
    [toAccountOpts],
  );

  const fromAccountLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    for (const o of fromAccountOpts) labels[o.id] = o.label;
    return labels;
  }, [fromAccountOpts]);

  const toAccountLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    for (const o of toAccountOpts) labels[o.id] = o.label;
    return labels;
  }, [toAccountOpts]);

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

  const listQuery = useMemo((): ContraVoucherListQuery => {
    const dateFilter = columnFilters.voucher_date;
    const from = dateFilter?.dateFrom || dateFrom || undefined;
    const to = dateFilter?.dateTo || dateTo || undefined;

    const colStatus = firstSelected(columnFilters.status);
    const toolbarStatus = statusFilter || undefined;

    const apiSort = SORT_KEY_TO_API[sortKey];

    const fromAccountId = firstSelected(columnFilters.from_account);
    const toAccountId = firstSelected(columnFilters.to_account);

    const fromOpt = fromAccountId ? fromAccountById.get(fromAccountId) : undefined;
    const toOpt = toAccountId ? toAccountById.get(toAccountId) : undefined;

    // Prefer explicit type filter; fall back to selected option's type
    const effectiveFromType = fromType || fromOpt?.accountType;
    const effectiveToType = toType || toOpt?.accountType;

    const query: ContraVoucherListQuery = {
      page,
      page_size: pageSize,
      search: debouncedSearch.trim() || undefined,
      status: colStatus || toolbarStatus,
      from_warehouse_id: resolvedFromWh,
      to_warehouse_id: resolvedToWh,
      from_account_type: fromType,
      to_account_type: toType,
      from_date: from || undefined,
      to_date: to || undefined,
      sort_by: apiSort,
      sort_dir: apiSort ? sortDir : undefined,
    };

    if (fromAccountId && fromOpt) {
      if (effectiveFromType === "CASH") {
        query.from_cash_ledger_id = fromAccountId;
      } else if (effectiveFromType === "BANK") {
        query.from_bank_account_id = fromAccountId;
      }
    }

    if (toAccountId && toOpt) {
      if (effectiveToType === "CASH") {
        query.to_cash_ledger_id = toAccountId;
      } else if (effectiveToType === "BANK") {
        query.to_bank_account_id = toAccountId;
      }
    }

    return query;
  }, [
    page,
    pageSize,
    debouncedSearch,
    statusFilter,
    resolvedFromWh,
    resolvedToWh,
    fromType,
    toType,
    dateFrom,
    dateTo,
    sortKey,
    sortDir,
    columnFilters,
    fromAccountById,
    toAccountById,
  ]);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await ContraVoucherService.list(listQuery);
        if (ac.signal.aborted) return;
        setRows(res.data ?? []);
        setTotal(res.pagination?.total ?? 0);
      } catch (e) {
        if (ac.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Failed to load contra vouchers.");
        setRows([]);
        setTotal(0);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [listQuery]);

  const getCellValue = useCallback((row: ContraVoucherListItem, key: string) => {
    switch (key) {
      case "sr_no":
        return formatSrNo(row.sr_no);
      case "voucher_date":
        return String(row.voucher_date).slice(0, 10);
      case "from_warehouse":
        return row.from_warehouse?.warehouse_name || "";
      case "to_warehouse":
        return row.to_warehouse?.warehouse_name || "";
      case "from_account":
        // Prefer cash/bank identity IDs for filter matching when present on list rows
        return (
          row.from_ledger?.ledger_name ||
          ""
        );
      case "to_account":
        return row.to_ledger?.ledger_name || "";
      case "from_account_type":
        return row.from_account_type;
      case "to_account_type":
        return row.to_account_type;
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

  return (
    <AccountsTableListing
      toolbar={
        <AccountsTableToolbar
          search={{
            value: search,
            onChange: onSearchChange,
            placeholder: "Search contra no., reference, ledger…",
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
                    {Object.entries(CONTRA_STATUS_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k} className="text-xs">
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-0.5 shrink-0 w-[160px]">
                <span className={ACCOUNTS_FILTER_LABEL_CLASS}>From Branch</span>
                <Select
                  value={fromWarehouseId || "all"}
                  onValueChange={(v) => {
                    setFromWarehouseId(v === "all" ? "" : v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger
                    className={cn(
                      ACCOUNTS_FILTER_CONTROL_CLASS,
                      ACCOUNTS_FILTER_SELECT_CLASS,
                      "mt-0 w-[160px]",
                    )}
                  >
                    <SelectValue placeholder="All branches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">
                      All branches
                    </SelectItem>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id} className="text-xs">
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-0.5 shrink-0 w-[160px]">
                <span className={ACCOUNTS_FILTER_LABEL_CLASS}>To Branch</span>
                <Select
                  value={toWarehouseId || "all"}
                  onValueChange={(v) => {
                    setToWarehouseId(v === "all" ? "" : v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger
                    className={cn(
                      ACCOUNTS_FILTER_CONTROL_CLASS,
                      ACCOUNTS_FILTER_SELECT_CLASS,
                      "mt-0 w-[160px]",
                    )}
                  >
                    <SelectValue placeholder="All branches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">
                      All branches
                    </SelectItem>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id} className="text-xs">
                        {w.name}
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
          recordLabel="contra vouchers"
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
            options: Object.keys(CONTRA_STATUS_LABELS),
            optionLabels: CONTRA_STATUS_LABELS,
          },
          from_account_type: {
            type: "status",
            options: Object.keys(CONTRA_ACCOUNT_TYPE_LABELS),
            optionLabels: CONTRA_ACCOUNT_TYPE_LABELS,
          },
          to_account_type: {
            type: "status",
            options: Object.keys(CONTRA_ACCOUNT_TYPE_LABELS),
            optionLabels: CONTRA_ACCOUNT_TYPE_LABELS,
          },
          voucher_date: { type: "date" },
          from_warehouse: { type: "select" },
          to_warehouse: { type: "select" },
          from_account: {
            type: "select",
            optionLabels: fromAccountLabels,
          },
          to_account: {
            type: "select",
            optionLabels: toAccountLabels,
          },
        }}
        defaultSortKey={null}
        defaultSortDir="desc"
      >
        <ContraListSortSync
          sortKey={sortKey}
          sortDir={sortDir}
          columnFilters={columnFilters}
          onSortChange={handleSortChange}
          onFilterChange={handleFilterChange}
        />
        <ContraListTable
          rows={rows}
          loading={loading}
          total={total}
          branchOptions={branchOptions}
          fromAccountOptions={fromAccountValueOptions}
          toAccountOptions={toAccountValueOptions}
        />
      </AccountsColumnFilterProvider>
    </AccountsTableListing>
  );
}
