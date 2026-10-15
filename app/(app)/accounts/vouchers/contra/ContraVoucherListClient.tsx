"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { XCircle } from "lucide-react";
import {
  AccountsEditAction,
  AccountsMoreActions,
  AccountsTableActionCell,
  AccountsViewAction,
  accountsActionColClass,
} from "@/components/accounts/AccountsTableActions";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { MoneyAmount } from "@/components/accounts/MoneyAmount";
import { showToast } from "@/lib/toast";
import { ContraReasonDialog } from "./components/ContraReasonDialog";
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
  SortTh,
  AccountsColumnHeader,
  useAccountsColumnFilterContext,
} from "../../components/AccountsUI";
import type {
  AccountsColumnFilterState,
  AccountsColumnFilters,
} from "@/lib/accounts/column-filter-types";
import { ContraVoucherService } from "@/services/contra-voucher.service";
import { useAccountsSectionRefresh } from "@/lib/accounts/use-accounts-section-refresh";
import { formatDisplayDate, toIsoDateOnly } from "@/lib/accounts/date-display";
import { WarehouseService } from "@/services/warehouse.service";
import {
  CONTRA_ACCOUNT_TYPE_LABELS,
  CONTRA_STATUS_FILTER_LABELS,
  CONTRA_STATUS_FILTER_VALUES,
  CONTRA_STATUS_LABELS,
  type ContraAccountType,
  type ContraVoucherListItem,
  type ContraVoucherListQuery,
  type ContraVoucherListSortBy,
  type ContraVoucherStatus,
} from "@/types/contra-voucher.types";
import {
  canCancelStatus,
  contraEditPath,
  contraViewPath,
  formatSrNo,
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
): "active" | "pending" | "approved" | "rejected" | "draft" | "inactive" | "closed" | "partial" {
  switch (status) {
    case "POSTED":
    case "APPROVED":
      return "approved";
    case "PENDING_APPROVAL":
      return "pending";
    case "REJECTED":
    case "CANCELLED":
      return "rejected";
    case "REVERSED":
      return "partial";
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

function csvSelected(filter?: AccountsColumnFilterState): string | undefined {
  const values = selectedValues(filter);
  return values.length > 0 ? values.join(",") : undefined;
}

function toValueOptions(values: string[]): { value: string; count: number }[] {
  return [...new Set(values.filter(Boolean))].map((value) => ({ value, count: 0 }));
}

function sameAccountOptions(
  a: AccountFilterOption[],
  b: AccountFilterOption[],
): boolean {
  if (a.length !== b.length) return false;
  return a.every(
    (o, i) =>
      o.id === b[i]?.id &&
      o.label === b[i]?.label &&
      o.accountType === b[i]?.accountType,
  );
}

function sameStringOptions(
  a: { value: string; count: number }[],
  b: { value: string; count: number }[],
): boolean {
  if (a.length !== b.length) return false;
  return a.every((o, i) => o.value === b[i]?.value);
}

function filterAccountOptionsByType(
  options: AccountFilterOption[],
  accountTypes?: ContraAccountType[],
): AccountFilterOption[] {
  if (!accountTypes || accountTypes.length === 0) return options;
  const allowed = new Set(accountTypes);
  return options.filter((o) => allowed.has(o.accountType));
}

/** Build Transfer From/To filter options from loaded list rows (no warehouse gate). */
function listRowsToAccountOptions(
  rows: ContraVoucherListItem[],
  side: "from" | "to",
  accountTypeFilter?: ContraAccountType,
): AccountFilterOption[] {
  const map = new Map<string, AccountFilterOption>();
  for (const row of rows) {
    const accountType = side === "from" ? row.from_account_type : row.to_account_type;
    if (accountTypeFilter && accountType !== accountTypeFilter) continue;

    const label =
      (side === "from" ? row.from_ledger?.ledger_name : row.to_ledger?.ledger_name)?.trim() ||
      "";
    if (!label) continue;

    let id = "";
    if (accountType === "CASH") {
      id =
        (side === "from" ? row.from_cash_ledger_id : row.to_cash_ledger_id) ||
        (side === "from" ? row.from_ledger_id : row.to_ledger_id) ||
        "";
    } else {
      id =
        (side === "from" ? row.from_bank_account_id : row.to_bank_account_id) ||
        "";
      // Fallback when bank account id is missing from older payloads
      if (!id) {
        id = (side === "from" ? row.from_ledger_id : row.to_ledger_id) || "";
      }
    }
    if (!id || map.has(id)) continue;
    map.set(id, { id, label, accountType });
  }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
}

type ContraListingFacets = {
  fromBranches: { value: string; count: number }[];
  toBranches: { value: string; count: number }[];
  fromAccounts: AccountFilterOption[];
  toAccounts: AccountFilterOption[];
  statuses: { value: string; count: number }[];
  fromTypes: { value: string; count: number }[];
  toTypes: { value: string; count: number }[];
};

const EMPTY_LISTING_FACETS: ContraListingFacets = {
  fromBranches: [],
  toBranches: [],
  fromAccounts: [],
  toAccounts: [],
  statuses: [],
  fromTypes: [],
  toTypes: [],
};

/** Facet values taken only from Contra listing rows (not master catalogs). */
function buildListingFacets(rows: ContraVoucherListItem[]): ContraListingFacets {
  const fromBranches = new Set<string>();
  const toBranches = new Set<string>();
  const statuses = new Set<string>();
  const fromTypes = new Set<string>();
  const toTypes = new Set<string>();
  const statusAllow = new Set<string>(CONTRA_STATUS_FILTER_VALUES);

  for (const row of rows) {
    const fromWh = row.from_warehouse?.warehouse_name?.trim();
    const toWh = row.to_warehouse?.warehouse_name?.trim();
    if (fromWh) fromBranches.add(fromWh);
    if (toWh) toBranches.add(toWh);
    if (row.status && statusAllow.has(row.status)) statuses.add(row.status);
    if (row.from_account_type) fromTypes.add(row.from_account_type);
    if (row.to_account_type) toTypes.add(row.to_account_type);
  }

  return {
    fromBranches: toValueOptions([...fromBranches]),
    toBranches: toValueOptions([...toBranches]),
    fromAccounts: listRowsToAccountOptions(rows, "from"),
    toAccounts: listRowsToAccountOptions(rows, "to"),
    statuses: toValueOptions([...statuses]),
    fromTypes: toValueOptions([...fromTypes]),
    toTypes: toValueOptions([...toTypes]),
  };
}

function sameListingFacets(
  a: ContraListingFacets,
  b: ContraListingFacets,
): boolean {
  return (
    sameStringOptions(a.fromBranches, b.fromBranches) &&
    sameStringOptions(a.toBranches, b.toBranches) &&
    sameAccountOptions(a.fromAccounts, b.fromAccounts) &&
    sameAccountOptions(a.toAccounts, b.toAccounts) &&
    sameStringOptions(a.statuses, b.statuses) &&
    sameStringOptions(a.fromTypes, b.fromTypes) &&
    sameStringOptions(a.toTypes, b.toTypes)
  );
}

function accountFilterIdFromRow(
  row: ContraVoucherListItem,
  side: "from" | "to",
): string {
  const accountType = side === "from" ? row.from_account_type : row.to_account_type;
  if (accountType === "CASH") {
    return (
      (side === "from" ? row.from_cash_ledger_id : row.to_cash_ledger_id) ||
      (side === "from" ? row.from_ledger_id : row.to_ledger_id) ||
      ""
    );
  }
  return (
    (side === "from" ? row.from_bank_account_id : row.to_bank_account_id) ||
    (side === "from" ? row.from_ledger_id : row.to_ledger_id) ||
    ""
  );
}

function ContraListSortSync({
  sortKey,
  sortDir,
  columnFilters,
  accountFilterResetKey,
  onSortChange,
  onFilterChange,
}: {
  sortKey: string;
  sortDir: "asc" | "desc";
  columnFilters: AccountsColumnFilters;
  /** Changes when From/To branch or account type changes — clears Transfer account filters. */
  accountFilterResetKey: string;
  onSortChange: (sortKey: string, sortDir: "asc" | "desc") => void;
  onFilterChange: (filters: AccountsColumnFilters) => void;
}) {
  const ctx = useAccountsColumnFilterContext();
  const prevAccountResetKey = useRef(accountFilterResetKey);

  useEffect(() => {
    if (!ctx) return;
    const nextKey = ctx.sortKey || "";
    const nextDir = ctx.sortDir ?? "asc";
    if (nextKey !== sortKey || (nextKey !== "" && nextDir !== sortDir)) {
      onSortChange(nextKey, nextDir);
    }
  }, [ctx?.sortKey, ctx?.sortDir, sortKey, sortDir, onSortChange]);

  // Match Receipt/Payment: always push provider filters → parent (do not treat
  // "key missing in parent" as a clear — that wiped brand-new column filters).
  useEffect(() => {
    if (!ctx) return;
    const ctxFiltersStr = JSON.stringify(ctx.columnFilters || {});
    const propFiltersStr = JSON.stringify(columnFilters || {});
    if (ctxFiltersStr !== propFiltersStr) {
      onFilterChange(ctx.columnFilters || {});
    }
  }, [ctx?.columnFilters, columnFilters, onFilterChange]);

  // When branch / account-type context changes, drop Transfer From/To account
  // filters in the provider; the push-to-parent effect above syncs parent state.
  useEffect(() => {
    if (!ctx?.setColumnFilter) return;
    if (prevAccountResetKey.current === accountFilterResetKey) return;
    prevAccountResetKey.current = accountFilterResetKey;
    ctx.setColumnFilter("from_account", undefined);
    ctx.setColumnFilter("to_account", undefined);
  }, [accountFilterResetKey, ctx?.setColumnFilter]);

  return null;
}

function ContraListTable({
  rows,
  loading,
  total,
  fromBranchOptions,
  toBranchOptions,
  fromAccountOptions,
  toAccountOptions,
  fromTypeOptions,
  toTypeOptions,
  statusOptions,
  onCancel,
  actionBusy,
}: {
  rows: ContraVoucherListItem[];
  loading: boolean;
  total: number;
  fromBranchOptions: { value: string; count: number }[];
  toBranchOptions: { value: string; count: number }[];
  fromAccountOptions: { value: string; count: number }[];
  toAccountOptions: { value: string; count: number }[];
  fromTypeOptions: { value: string; count: number }[];
  toTypeOptions: { value: string; count: number }[];
  statusOptions: { value: string; count: number }[];
  onCancel: (row: ContraVoucherListItem) => void;
  actionBusy?: boolean;
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
            valueOptions={fromBranchOptions}
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
            valueOptions={fromTypeOptions}
            statusOptions={fromTypeOptions.map((o) => o.value)}
          />
          <SortTh
            label="To Branch"
            colKey="to_warehouse"
            filterType="select"
            valueOptions={toBranchOptions}
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
            valueOptions={toTypeOptions}
            statusOptions={toTypeOptions.map((o) => o.value)}
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
            valueOptions={statusOptions}
            statusOptions={statusOptions.map((o) => o.value)}
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
          <AccountsTableLoading colSpan={12} message="Loading contra vouchers…" />
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
            const canCancelRow =
              canCancelStatus(row.status) || row.status === "POSTED";
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
                  {formatDisplayDate(row.voucher_date)}
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
                    {canCancelRow ? (
                      <AccountsMoreActions contentClassName="w-44">
                        <DropdownMenuItem
                          className="text-xs gap-2 text-red-600"
                          disabled={actionBusy}
                          onClick={() => onCancel(row)}
                        >
                          <XCircle className="w-4 h-4" /> Cancel
                        </DropdownMenuItem>
                      </AccountsMoreActions>
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
    useReportDateRange("this_year");
  const [search, setSearch] = useState("");
  const refreshTick = useAccountsSectionRefresh("contra-vouchers", { apiListing: true });
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
  const [cancelTarget, setCancelTarget] = useState<ContraVoucherListItem | null>(
    null,
  );
  const [cancelReason, setCancelReason] = useState("");
  const [reverseDate, setReverseDate] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [listRefreshKey, setListRefreshKey] = useState(0);

  const [listingFacets, setListingFacets] =
    useState<ContraListingFacets>(EMPTY_LISTING_FACETS);

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

  const fromTypes = useMemo(
    () =>
      selectedValues(columnFilters.from_account_type) as ContraAccountType[],
    [columnFilters.from_account_type],
  );
  const toTypes = useMemo(
    () => selectedValues(columnFilters.to_account_type) as ContraAccountType[],
    [columnFilters.to_account_type],
  );
  const fromTypesKey = fromTypes.join(",");
  const toTypesKey = toTypes.join(",");

  const accountFilterResetKey = useMemo(
    () =>
      [
        fromWarehouseId || "",
        firstSelected(columnFilters.from_warehouse) || "",
        fromTypesKey,
        toWarehouseId || "",
        firstSelected(columnFilters.to_warehouse) || "",
        toTypesKey,
      ].join("|"),
    [
      fromWarehouseId,
      columnFilters.from_warehouse,
      fromTypesKey,
      toWarehouseId,
      columnFilters.to_warehouse,
      toTypesKey,
    ],
  );

  // Facets from listing data only (toolbar-scoped, no column filters) so the
  // dropdown stays selectable and does not shrink after applying a filter.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await ContraVoucherService.list({
          page: 1,
          page_size: 100,
          search: debouncedSearch.trim() || undefined,
          status: statusFilter || undefined,
          from_warehouse_id: fromWarehouseId || undefined,
          to_warehouse_id: toWarehouseId || undefined,
          from_date: dateFrom || undefined,
          to_date: dateTo || undefined,
        });
        if (cancelled) return;
        const next = buildListingFacets(res.data ?? []);
        setListingFacets((prev) =>
          sameListingFacets(prev, next) ? prev : next,
        );
      } catch {
        /* facet load failures are non-fatal */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    debouncedSearch,
    statusFilter,
    fromWarehouseId,
    toWarehouseId,
    dateFrom,
    dateTo,
    listRefreshKey,
  ]);

  const fromAccountOpts = useMemo(
    () => filterAccountOptionsByType(listingFacets.fromAccounts, fromTypes),
    [listingFacets.fromAccounts, fromTypes],
  );

  const toAccountOpts = useMemo(
    () => filterAccountOptionsByType(listingFacets.toAccounts, toTypes),
    [listingFacets.toAccounts, toTypes],
  );

  const fromAccountTypeById = useMemo(() => {
    const map: Record<string, ContraAccountType> = {};
    for (const o of listingFacets.fromAccounts) map[o.id] = o.accountType;
    return map;
  }, [listingFacets.fromAccounts]);

  const toAccountTypeById = useMemo(() => {
    const map: Record<string, ContraAccountType> = {};
    for (const o of listingFacets.toAccounts) map[o.id] = o.accountType;
    return map;
  }, [listingFacets.toAccounts]);

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

  const fromAccountIds = useMemo(
    () => selectedValues(columnFilters.from_account),
    [columnFilters.from_account],
  );
  const toAccountIds = useMemo(
    () => selectedValues(columnFilters.to_account),
    [columnFilters.to_account],
  );

  const listQuery = useMemo((): ContraVoucherListQuery => {
    const dateFilter = columnFilters.voucher_date;
    const from = dateFilter?.dateFrom || dateFrom || undefined;
    const to = dateFilter?.dateTo || dateTo || undefined;

    const colStatus = csvSelected(columnFilters.status);
    const toolbarStatus = statusFilter || undefined;
    const fromWarehouseNames = csvSelected(columnFilters.from_warehouse);
    const toWarehouseNames = csvSelected(columnFilters.to_warehouse);

    const apiSort = SORT_KEY_TO_API[sortKey];

    const fromCashIds = fromAccountIds.filter(
      (id) => fromAccountTypeById[id] === "CASH",
    );
    const fromBankIds = fromAccountIds.filter(
      (id) => fromAccountTypeById[id] === "BANK",
    );
    const toCashIds = toAccountIds.filter(
      (id) => toAccountTypeById[id] === "CASH",
    );
    const toBankIds = toAccountIds.filter(
      (id) => toAccountTypeById[id] === "BANK",
    );

    const query: ContraVoucherListQuery = {
      page,
      page_size: pageSize,
      search: debouncedSearch.trim() || undefined,
      status: colStatus || toolbarStatus,
      from_account_type: csvSelected(columnFilters.from_account_type),
      to_account_type: csvSelected(columnFilters.to_account_type),
      from_date: from || undefined,
      to_date: to || undefined,
      sort_by: apiSort,
      sort_dir: apiSort ? sortDir : undefined,
    };

    if (fromWarehouseNames) {
      query.from_warehouse_names = fromWarehouseNames;
    } else if (fromWarehouseId) {
      query.from_warehouse_id = fromWarehouseId;
    }

    if (toWarehouseNames) {
      query.to_warehouse_names = toWarehouseNames;
    } else if (toWarehouseId) {
      query.to_warehouse_id = toWarehouseId;
    }

    if (fromCashIds.length > 0) {
      query.from_cash_ledger_ids = fromCashIds.join(",");
    }
    if (fromBankIds.length > 0) {
      query.from_bank_account_ids = fromBankIds.join(",");
    }
    if (toCashIds.length > 0) {
      query.to_cash_ledger_ids = toCashIds.join(",");
    }
    if (toBankIds.length > 0) {
      query.to_bank_account_ids = toBankIds.join(",");
    }

    return query;
  }, [
    page,
    pageSize,
    debouncedSearch,
    statusFilter,
    fromWarehouseId,
    toWarehouseId,
    dateFrom,
    dateTo,
    sortKey,
    sortDir,
    columnFilters,
    fromAccountIds,
    toAccountIds,
    fromAccountTypeById,
    toAccountTypeById,
    refreshTick,
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
  }, [listQuery, listRefreshKey]);

  const closeCancelDialog = useCallback(() => {
    if (actionBusy) return;
    setCancelTarget(null);
    setCancelReason("");
    setReverseDate("");
  }, [actionBusy]);

  const openCancelDialog = useCallback((row: ContraVoucherListItem) => {
    setCancelReason("");
    setReverseDate(toIsoDateOnly(row.voucher_date));
    setCancelTarget(row);
  }, []);

  const confirmCancelOrReverse = useCallback(async () => {
    if (!cancelTarget || actionBusy) return;
    const id = cancelTarget.contra_voucher_id;
    const isPosted = cancelTarget.status === "POSTED";
    const reason = cancelReason.trim();
    if (!reason) return;

    setActionBusy(true);
    try {
      if (isPosted) {
        const resolvedDate =
          reverseDate.trim() ||
          toIsoDateOnly(cancelTarget.voucher_date) ||
          null;
        await ContraVoucherService.reverse(id, {
          reason,
          reversal_date: resolvedDate,
        });
        showToast("Contra reversed.", "success");
      } else {
        await ContraVoucherService.cancel(id, { reason });
        showToast("Contra cancelled.", "success");
      }
      setCancelTarget(null);
      setCancelReason("");
      setReverseDate("");
      setListRefreshKey((k) => k + 1);
    } catch (e) {
      showToast(
        e instanceof Error
          ? e.message
          : isPosted
            ? "Failed to reverse Contra Voucher."
            : "Failed to cancel Contra Voucher.",
        "error",
      );
    } finally {
      setActionBusy(false);
    }
  }, [cancelTarget, cancelReason, reverseDate, actionBusy]);

  const isPostedCancelTarget = cancelTarget?.status === "POSTED";

  const getCellValue = useCallback((row: ContraVoucherListItem, key: string) => {
    switch (key) {
      case "sr_no":
        return formatSrNo(row.sr_no);
      case "voucher_date":
        return toIsoDateOnly(row.voucher_date);
      case "from_warehouse":
        return row.from_warehouse?.warehouse_name || "";
      case "to_warehouse":
        return row.to_warehouse?.warehouse_name || "";
      case "from_account":
        // Must match filter option values (cash ledger / bank account ids).
        return accountFilterIdFromRow(row, "from");
      case "to_account":
        return accountFilterIdFromRow(row, "to");
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
    <>
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
                    {CONTRA_STATUS_FILTER_VALUES.map((status) => (
                      <SelectItem key={status} value={status} className="text-xs">
                        {CONTRA_STATUS_FILTER_LABELS[status]}
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
            options: listingFacets.statuses.map((o) => o.value),
            optionLabels: CONTRA_STATUS_FILTER_LABELS,
          },
          from_account_type: {
            type: "status",
            options: listingFacets.fromTypes.map((o) => o.value),
            optionLabels: CONTRA_ACCOUNT_TYPE_LABELS,
          },
          to_account_type: {
            type: "status",
            options: listingFacets.toTypes.map((o) => o.value),
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
          accountFilterResetKey={accountFilterResetKey}
          onSortChange={handleSortChange}
          onFilterChange={handleFilterChange}
        />
        <ContraListTable
          rows={rows}
          loading={loading}
          total={total}
          fromBranchOptions={listingFacets.fromBranches}
          toBranchOptions={listingFacets.toBranches}
          fromAccountOptions={fromAccountValueOptions}
          toAccountOptions={toAccountValueOptions}
          fromTypeOptions={listingFacets.fromTypes}
          toTypeOptions={listingFacets.toTypes}
          statusOptions={listingFacets.statuses}
          onCancel={openCancelDialog}
          actionBusy={actionBusy}
        />
      </AccountsColumnFilterProvider>
    </AccountsTableListing>

    <ContraReasonDialog
      open={!!cancelTarget}
      onOpenChange={(open) => {
        if (!open) closeCancelDialog();
      }}
      title={isPostedCancelTarget ? "Reverse Voucher" : "Discard Voucher"}
      description={
        isPostedCancelTarget
          ? "This voucher has already been posted. Continuing will create reversal entries for the ledgers impacted by this voucher. Do you want to continue?"
          : "Are you sure you want to discard this voucher entry?"
      }
      reason={cancelReason}
      onReasonChange={setCancelReason}
      showDate={isPostedCancelTarget}
      dateValue={reverseDate}
      onDateChange={setReverseDate}
      confirmLabel={
        isPostedCancelTarget ? "Continue / Reverse Voucher" : "Discard Voucher"
      }
      destructive
      busy={actionBusy}
      onConfirm={() => {
        void confirmCancelOrReverse();
      }}
    />
    </>
  );
}
