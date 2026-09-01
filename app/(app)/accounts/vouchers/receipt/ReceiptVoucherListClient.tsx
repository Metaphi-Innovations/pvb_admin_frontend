"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
} from "@/lib/accounts/column-filter-types";
import { ReceiptVoucherService } from "@/services/receipt-voucher.service";
import { useAccountsSectionRefresh } from "@/lib/accounts/use-accounts-section-refresh";
import { WarehouseService } from "@/services/warehouse.service";
import { CustomerListService } from "@/services/customer-list.service";
import { SupplierListService } from "@/services/supplier-list.service";
import { BankAccountsListService } from "@/services/bank-accounts-list.service";
import { LedgerService } from "@/services/ledger.service";
import {
  BANK_TRANSACTION_MODE_LABELS,
  RECEIPT_PARTY_KIND_LABELS,
  RECEIPT_STATUS_LABELS,
  type ReceiptVoucherListItem,
  type ReceiptVoucherListQuery,
  type ReceiptVoucherStatus,
} from "@/types/receipt-voucher.types";
import {
  formatSrNo,
  isDraftEditable,
  partyDisplayName,
  receiptEditPath,
  receiptViewPath,
  toMoneyNumber,
} from "./receipt-voucher-utils";

const SORT_KEY_TO_API: Record<string, NonNullable<ReceiptVoucherListQuery["sort_by"]>> = {
  sr_no: "sr_no",
  voucher_date: "voucher_date",
  party_kind: "party_kind",
  transaction_mode: "transaction_mode",
  status: "status",
  gross_party_amount: "gross_party_amount",
  net_bank_amount: "net_bank_amount",
};

function statusKey(
  status: ReceiptVoucherStatus,
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

const STATUS_FILTER_OPTIONS = toValueOptions(Object.keys(RECEIPT_STATUS_LABELS));
const PARTY_KIND_FILTER_OPTIONS = toValueOptions(Object.keys(RECEIPT_PARTY_KIND_LABELS));
const MODE_FILTER_OPTIONS = toValueOptions(Object.keys(BANK_TRANSACTION_MODE_LABELS));

function ReceiptListSortSync({
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

function ReceiptListTable({
  rows,
  loading,
  total,
  branchOptions,
  partyOptions,
  cashBankOptions,
}: {
  rows: ReceiptVoucherListItem[];
  loading: boolean;
  total: number;
  branchOptions: { value: string; count: number }[];
  partyOptions: { value: string; count: number }[];
  cashBankOptions: { value: string; count: number }[];
}) {
  const router = useRouter();

  return (
    <AccountsTable minWidth={1200}>
      <AccountsTableHead>
        <AccountsTableHeadRow>
          <SortTh label="Draft No." colKey="sr_no" filterable={false} />
          <SortTh label="Date" colKey="voucher_date" filterType="date" />
          <SortTh
            label="Branch"
            colKey="warehouse"
            sortable={false}
            filterType="select"
            valueOptions={branchOptions}
          />
          <SortTh
            label="Received From Type"
            colKey="party_kind"
            filterType="status"
            valueOptions={PARTY_KIND_FILTER_OPTIONS}
            statusOptions={Object.keys(RECEIPT_PARTY_KIND_LABELS)}
          />
          <SortTh
            label="Party / Ledger"
            colKey="party"
            sortable={false}
            filterType="select"
            valueOptions={partyOptions}
          />
          <SortTh
            label="Mode"
            colKey="transaction_mode"
            filterType="status"
            valueOptions={MODE_FILTER_OPTIONS}
            statusOptions={Object.keys(BANK_TRANSACTION_MODE_LABELS)}
          />
          <SortTh
            label="Cash / Bank"
            colKey="cash_bank"
            sortable={false}
            filterType="select"
            valueOptions={cashBankOptions}
          />
          <SortTh
            label="Gross"
            colKey="gross_party_amount"
            filterable={false}
            align="right"
          />
          <SortTh
            label="Net Bank"
            colKey="net_bank_amount"
            filterable={false}
            align="right"
          />
          <SortTh
            label="Status"
            colKey="status"
            filterType="status"
            valueOptions={STATUS_FILTER_OPTIONS}
            statusOptions={Object.keys(RECEIPT_STATUS_LABELS)}
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
          <AccountsTableLoading colSpan={11} message="Loading receipts…" />
        ) : rows.length === 0 ? (
          <AccountsTableRow>
            <AccountsTableCell colSpan={11} className="accounts-table-empty">
              No receipt vouchers found.
            </AccountsTableCell>
          </AccountsTableRow>
        ) : (
          rows.map((row) => {
            const id = row.receipt_voucher_id;
            const canEdit = isDraftEditable(row.status);
            return (
              <AccountsTableRow key={id} className="group">
                <AccountsTableCell mono>
                  <Link
                    href={receiptViewPath(id)}
                    className="text-brand-700 hover:underline font-mono text-xs font-semibold"
                  >
                    {formatSrNo(row.sr_no)}
                  </Link>
                </AccountsTableCell>
                <AccountsTableCell className="tabular-nums text-xs">
                  {String(row.voucher_date).slice(0, 10)}
                </AccountsTableCell>
                <AccountsTableCell className="text-xs">
                  {row.warehouse?.warehouse_name || "—"}
                </AccountsTableCell>
                <AccountsTableCell className="text-xs">
                  {RECEIPT_PARTY_KIND_LABELS[row.party_kind] || row.party_kind}
                </AccountsTableCell>
                <AccountsTableCell className="text-xs max-w-[180px] truncate">
                  {partyDisplayName(row)}
                </AccountsTableCell>
                <AccountsTableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {BANK_TRANSACTION_MODE_LABELS[row.transaction_mode] ||
                    row.transaction_mode}
                </AccountsTableCell>
                <AccountsTableCell className="text-xs max-w-[160px] truncate">
                  {row.cash_bank_ledger?.ledger_name || "—"}
                </AccountsTableCell>
                <AccountsTableCell align="right" money>
                  <MoneyAmount amount={toMoneyNumber(row.gross_party_amount)} />
                </AccountsTableCell>
                <AccountsTableCell align="right" money>
                  <MoneyAmount amount={toMoneyNumber(row.net_bank_amount)} />
                </AccountsTableCell>
                <AccountsTableCell>
                  <StatusBadge
                    status={statusKey(row.status)}
                    label={RECEIPT_STATUS_LABELS[row.status] || row.status}
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
                      onClick={() => router.push(receiptViewPath(id))}
                    />
                    {canEdit ? (
                      <AccountsEditAction
                        title="Edit"
                        onClick={() => router.push(receiptEditPath(id))}
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
            <AccountsTableCell colSpan={11} className="text-xs text-muted-foreground">
              Showing {rows.length} of {total} receipts
            </AccountsTableCell>
          </AccountsTableRow>
        </AccountsTableFoot>
      ) : null}
    </AccountsTable>
  );
}

export function ReceiptVoucherListClient() {
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } =
    useReportDateRange("this_year");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(ACCOUNTS_DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ReceiptVoucherListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [sortKey, setSortKey] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [columnFilters, setColumnFilters] = useState<AccountsColumnFilters>({});
  const [branchOptions, setBranchOptions] = useState<{ value: string; count: number }[]>([]);
  const [partyOptions, setPartyOptions] = useState<{ value: string; count: number }[]>([]);
  const [cashBankOptions, setCashBankOptions] = useState<{ value: string; count: number }[]>([]);
  const refreshTick = useAccountsSectionRefresh("receipt-vouchers", { apiListing: true });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [wh, cust, supp, banks, ledgers] = await Promise.all([
          WarehouseService.dropdown().catch(() => []),
          CustomerListService.dropdown().catch(() => []),
          SupplierListService.dropdown().catch(() => []),
          BankAccountsListService.list({ page: 1, pageSize: 500 }).catch(() => ({
            items: [],
            total: 0,
          })),
          LedgerService.getDropdown({ status: "ACTIVE", allowManualPosting: true }).catch(
            () => ({ tree: [], ledgers: [] }),
          ),
        ]);
        if (cancelled) return;

        setBranchOptions(toValueOptions(wh.map((w) => w.warehouse_name)));

        const parties = [
          ...cust.map((c) => c.customer_name),
          ...supp.map((s) => s.supplierName),
          ...(ledgers.ledgers ?? []).map((l) => l.ledgerName),
        ];
        setPartyOptions(toValueOptions(parties));

        const bankNames = banks.items
          .filter((b) => b.status === "active")
          .map((b) => b.ledgerName || "")
          .filter(Boolean);
        const cashNames = (ledgers.ledgers ?? [])
          .filter(
            (l) =>
              /cash/i.test(l.ledgerName || "") ||
              /cash/i.test(l.ledgerCode || "") ||
              /petty/i.test(l.ledgerName || ""),
          )
          .map((l) => l.ledgerName);
        setCashBankOptions(toValueOptions([...bankNames, ...cashNames]));
      } catch {
        /* facet load failures are non-fatal */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSortChange = useCallback((key: string, dir: "asc" | "desc") => {
    setSortKey(key);
    setSortDir(dir);
    setPage(1);
  }, []);

  const handleFilterChange = useCallback((filters: AccountsColumnFilters) => {
    setColumnFilters(filters);
    setPage(1);
  }, []);

  const onPresetChange = useCallback((p: typeof preset) => {
    setPreset(p);
    setPage(1);
  }, [setPreset]);

  const onDateFromChange = useCallback((v: string) => {
    setDateFrom(v);
    setPage(1);
  }, [setDateFrom]);

  const onDateToChange = useCallback((v: string) => {
    setDateTo(v);
    setPage(1);
  }, [setDateTo]);

  const onSearchChange = useCallback((v: string) => {
    setSearch(v);
    setPage(1);
  }, []);

  const listQuery = useMemo((): ReceiptVoucherListQuery => {
    const dateFilter = columnFilters.voucher_date;
    const from = dateFilter?.dateFrom || dateFrom || undefined;
    const to = dateFilter?.dateTo || dateTo || undefined;
    const apiSort = SORT_KEY_TO_API[sortKey];

    const colStatus = csvSelected(columnFilters.status);
    const toolbarStatus = statusFilter || undefined;

    return {
      page,
      page_size: pageSize,
      search: debouncedSearch.trim() || undefined,
      status: colStatus || toolbarStatus,
      party_kind: csvSelected(columnFilters.party_kind),
      transaction_mode: csvSelected(columnFilters.transaction_mode),
      warehouse_names: csvSelected(columnFilters.warehouse),
      party_names: csvSelected(columnFilters.party),
      cash_bank_names: csvSelected(columnFilters.cash_bank),
      from_date: from || undefined,
      to_date: to || undefined,
      sort_by: apiSort,
      sort_dir: apiSort ? sortDir : undefined,
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
        const res = await ReceiptVoucherService.list(listQuery);
        if (ac.signal.aborted) return;
        setRows(res.data ?? []);
        setTotal(res.pagination?.total ?? 0);
      } catch (e) {
        if (ac.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Failed to load receipts.");
        setRows([]);
        setTotal(0);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [listQuery]);

  const getCellValue = useCallback((row: ReceiptVoucherListItem, key: string) => {
    switch (key) {
      case "sr_no":
        return formatSrNo(row.sr_no);
      case "voucher_date":
        return String(row.voucher_date).slice(0, 10);
      case "warehouse":
        return row.warehouse?.warehouse_name || "";
      case "party_kind":
        return row.party_kind;
      case "party":
        return partyDisplayName(row);
      case "transaction_mode":
        return row.transaction_mode;
      case "cash_bank":
        return row.cash_bank_ledger?.ledger_name || "";
      case "gross_party_amount":
        return toMoneyNumber(row.gross_party_amount);
      case "net_bank_amount":
        return toMoneyNumber(row.net_bank_amount);
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
            placeholder: "Search draft no., customer, UTR…",
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
                    {Object.entries(RECEIPT_STATUS_LABELS).map(([k, v]) => (
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
          recordLabel="receipts"
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
            options: Object.keys(RECEIPT_STATUS_LABELS),
            optionLabels: RECEIPT_STATUS_LABELS,
          },
          party_kind: {
            type: "status",
            options: Object.keys(RECEIPT_PARTY_KIND_LABELS),
            optionLabels: RECEIPT_PARTY_KIND_LABELS,
          },
          transaction_mode: {
            type: "status",
            options: Object.keys(BANK_TRANSACTION_MODE_LABELS),
            optionLabels: BANK_TRANSACTION_MODE_LABELS,
          },
          voucher_date: { type: "date" },
          warehouse: { type: "select" },
          party: { type: "select" },
          cash_bank: { type: "select" },
        }}
        defaultSortKey={null}
        defaultSortDir="desc"
      >
        <ReceiptListSortSync
          sortKey={sortKey}
          sortDir={sortDir}
          columnFilters={columnFilters}
          onSortChange={handleSortChange}
          onFilterChange={handleFilterChange}
        />
        <ReceiptListTable
          rows={rows}
          loading={loading}
          total={total}
          branchOptions={branchOptions}
          partyOptions={partyOptions}
          cashBankOptions={cashBankOptions}
        />
      </AccountsColumnFilterProvider>
    </AccountsTableListing>
  );
}
