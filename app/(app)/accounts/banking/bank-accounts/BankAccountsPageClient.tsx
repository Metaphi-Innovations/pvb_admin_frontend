"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import "./bank-accounts-dense.css";
import { Button } from "@/components/ui/button";
import {
  AccountsEditAction,
  AccountsTableActionCell,
  AccountsViewAction,
  ACCOUNTS_ACTION_BTN_CLASS,
  ACCOUNTS_ACTION_ICON_CLASS,
  accountsActionColClass,
} from "@/components/accounts/AccountsTableActions";
import { AlertTriangle, ClipboardList, Plus } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { usePermissionsOptional } from "@/lib/auth";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableHead,
  AccountsTableHeadRow,
  AccountsTableRow,
} from "@/components/accounts/AccountsTable";
import {
  AccountsTableEmpty,
  AccountsTableListing,
  AccountsTablePagination,
  AccountsTableToolbar,
} from "@/components/accounts/AccountsTableListing";
import { AccountsListingTableSkeleton } from "@/components/accounts/AccountsListingStates";
import { AccountsToast, useAccountsToast } from "@/components/accounts/AccountsToast";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { MoneyAmount } from "@/components/accounts/MoneyAmount";
import {
  AccountsColumnFilterProvider,
  AccountsColumnHeader,
  SortTh,
  useAccountsColumnFilterContext,
} from "@/app/(app)/accounts/components/AccountsUI";
import { formatMoney } from "@/lib/accounts/money-format";
import type {
  AccountsColumnFilters,
  ColumnValueOption,
} from "@/lib/accounts/column-filter-types";
import {
  ACCOUNT_TYPE_OPTIONS,
  BANK_ACCOUNT_FILTER_FIELD_BY_COLUMN,
  buildBankAccountApiFilters,
  extractBankAccountErrorMessage,
  mapBankAccountFilterOptions,
  mapUiSortToOrdering,
  type BankAccountListRow,
} from "@/services/bank-accounts-list.service";
import {
  useBankAccountFilterOptions,
  useBankAccountsList,
  useExportBankAccounts,
} from "@/hooks/accounts/use-bank-accounts-list";
import { useUpdateBankAccountStatus } from "@/hooks/accounts/use-bank-accounts";
import { getMasterListErrorMessage } from "@/lib/masters/master-query-errors";
import { useLazyFilterColumns } from "@/lib/masters/use-lazy-filter-columns";
import { useDebouncedValue } from "@/app/(app)/accounts/reports/pl/pl-hooks";
import { useFY } from "@/lib/fy-store";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isActiveStatus } from "@/components/listing";
import { BankAccountToggle } from "@/app/(app)/accounts/banking/bank-accounts/components/BankAccountToggle";
import { cn } from "@/lib/utils";

const COL_SPAN = 11;
const DEFAULT_ORDERING = "ledger_name";

const ACCOUNT_TYPE_OPTION_LABELS: Record<string, string> = Object.fromEntries(
  ACCOUNT_TYPE_OPTIONS.map((o) => [o.value, o.label]),
);

const STATUS_OPTION_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  active: "Active",
  inactive: "Inactive",
};

type FilterOptionsByColumn = Partial<Record<string, ColumnValueOption[]>>;
type FilterLoadingByColumn = Partial<Record<string, boolean>>;
type FilterReadyByColumn = Partial<Record<string, boolean>>;


function formatMappedWarehousesCompact(names: string[]): string {
  if (names.length === 0) return "—";
  if (names.length === 1) return names[0]!;
  if (names.length >= 5) return `${names.length} Warehouses`;
  return `${names[0]} +${names.length - 1} more`;
}

function MappedWarehousesCell({ names }: { names: string[] }) {
  if (names.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  const label = formatMappedWarehousesCompact(names);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="bank-accounts-wh-trigger" title={names.join(", ")}>
          {label}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs p-2">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
          Mapped Warehouses ({names.length})
        </p>
        <ul className="space-y-0.5">
          {names.map((name) => (
            <li key={name} className="text-xs text-foreground">
              {name}
            </li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}

function BankAccountsExportToolbar({
  search,
  onSearchChange,
  onExport,
  exportDisabled,
  exporting,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  onExport: () => void;
  exportDisabled: boolean;
  exporting: boolean;
}) {
  return (
    <AccountsTableToolbar
      className="bank-accounts-toolbar"
      search={{
        value: search,
        onChange: onSearchChange,
        placeholder: "Search bank, account no., IFSC…",
      }}
      onExcel={onExport}
      exportDisabled={exportDisabled || exporting}
    />
  );
}

function BankAccountsSummary({
  rows,
  totalRows,
}: {
  rows: BankAccountListRow[];
  totalRows: number;
}) {
  if (rows.length === 0) return null;

  const openingTotal = rows.reduce((s, r) => s + r.openingBalance, 0);
  const activeOnPage = rows.filter((r) => r.status === "active").length;

  return (
    <div className="bank-accounts-summary flex items-center justify-between px-2.5 py-1 border-b border-border/60 bg-muted/10 text-[11px] text-muted-foreground">
      <span className="truncate">
        <span className="font-medium text-foreground">{rows.length}</span> of{" "}
        <span className="font-medium text-foreground">{totalRows}</span> accounts
        {activeOnPage !== rows.length && <span> · {activeOnPage} active</span>}
      </span>
      <span className="tabular-nums whitespace-nowrap flex-shrink-0 ml-2">
        Total opening balance:{" "}
        <span className="font-medium text-foreground">{formatMoney(openingTotal)}</span>
      </span>
    </div>
  );
}

function SortSync({
  onSortChange,
}: {
  onSortChange: (sortKey: string, sortDir: "asc" | "desc") => void;
}) {
  const ctx = useAccountsColumnFilterContext();

  useEffect(() => {
    onSortChange(ctx?.sortKey ?? "", ctx?.sortDir ?? "asc");
  }, [ctx?.sortKey, ctx?.sortDir, onSortChange]);

  return null;
}

function FilterSync({
  onFiltersChange,
}: {
  onFiltersChange: (filters: AccountsColumnFilters) => void;
}) {
  const ctx = useAccountsColumnFilterContext();

  useEffect(() => {
    onFiltersChange(ctx?.columnFilters ?? {});
  }, [ctx?.columnFilters, onFiltersChange]);

  return null;
}

function BankAccountsTable({
  rows,
  loading,
  search,
  onClearSearch,
  onRequestStatusChange,
  statusPendingBankAccountId,
  filterOptionsByColumn,
  filterLoadingByColumn,
  filterReadyByColumn,
  onOpenFilter,
}: {
  rows: BankAccountListRow[];
  loading: boolean;
  search: string;
  onClearSearch: () => void;
  onRequestStatusChange: (account: BankAccountListRow) => void;
  statusPendingBankAccountId: string | null;
  filterOptionsByColumn: FilterOptionsByColumn;
  filterLoadingByColumn: FilterLoadingByColumn;
  filterReadyByColumn: FilterReadyByColumn;
  onOpenFilter: (columnKey: string) => void;
}) {
  const router = useRouter();

  const permissions = usePermissionsOptional();
  const canUpdate =
    !permissions || permissions.isLoading
      ? true
      : permissions.canEdit("accounts", "bank_account");

  const goToAccount = (ledgerId: string, mode: "view" | "edit" | "complete") => {
    if (!ledgerId) return;
    const base = `/accounts/banking/bank-accounts/${ledgerId}`;
    if (mode === "complete") {
      router.push(`${base}/complete`);
      return;
    }
    router.push(mode === "edit" ? `${base}/edit` : base);
  };

  const opts = (colKey: string) => filterOptionsByColumn[colKey] ?? [];
  const loadingOpts = (colKey: string) => Boolean(filterLoadingByColumn[colKey]);
  const readyOpts = (colKey: string) => Boolean(filterReadyByColumn[colKey]);
  const openFilter = (colKey: string) => () => onOpenFilter(colKey);

  return (
    <AccountsTable minWidth={1180}>
      <AccountsTableHead>
        <AccountsTableHeadRow>
          <SortTh
            label="Ledger Name"
            colKey="ledgerName"
            valueOptions={opts("ledgerName")}
            onFilterOpen={openFilter("ledgerName")}
            optionsLoading={loadingOpts("ledgerName")}
            optionsReady={readyOpts("ledgerName")}
          />
          <SortTh
            label="Bank Name"
            colKey="bankName"
            valueOptions={opts("bankName")}
            onFilterOpen={openFilter("bankName")}
            optionsLoading={loadingOpts("bankName")}
            optionsReady={readyOpts("bankName")}
          />
          <SortTh
            label="Account Holder Name"
            colKey="accountHolderName"
            valueOptions={opts("accountHolderName")}
            onFilterOpen={openFilter("accountHolderName")}
            optionsLoading={loadingOpts("accountHolderName")}
            optionsReady={readyOpts("accountHolderName")}
          />
          <SortTh
            label="Account No."
            colKey="accountNumber"
            valueOptions={opts("accountNumber")}
            onFilterOpen={openFilter("accountNumber")}
            optionsLoading={loadingOpts("accountNumber")}
            optionsReady={readyOpts("accountNumber")}
          />
          <SortTh
            label="IFSC Code"
            colKey="ifsc"
            valueOptions={opts("ifsc")}
            onFilterOpen={openFilter("ifsc")}
            optionsLoading={loadingOpts("ifsc")}
            optionsReady={readyOpts("ifsc")}
          />
          <SortTh
            label="Account Type"
            colKey="accountType"
            valueOptions={opts("accountType")}
            onFilterOpen={openFilter("accountType")}
            optionsLoading={loadingOpts("accountType")}
            optionsReady={readyOpts("accountType")}
          />
          <SortTh
            label="Opening Balance"
            colKey="openingBalance"
            filterType="amount"
            align="right"
            valueOptions={opts("openingBalance")}
            onFilterOpen={openFilter("openingBalance")}
            optionsLoading={loadingOpts("openingBalance")}
            optionsReady={readyOpts("openingBalance")}
          />
          <AccountsColumnHeader
            label="Current Balance"
            colKey="currentBalance"
            filterType="amount"
            align="right"
            sortable={false}
            filterable={false}
          />
          <SortTh
            label="Mapped Warehouse"
            colKey="mappedWarehousesLabel"
            filterType="text"
            valueOptions={opts("mappedWarehousesLabel")}
            onFilterOpen={openFilter("mappedWarehousesLabel")}
            optionsLoading={loadingOpts("mappedWarehousesLabel")}
            optionsReady={readyOpts("mappedWarehousesLabel")}
          />
          <SortTh
            label="Status"
            colKey="status"
            filterType="status"
            valueOptions={opts("status")}
            onFilterOpen={openFilter("status")}
            optionsLoading={loadingOpts("status")}
            optionsReady={readyOpts("status")}
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
          <AccountsListingTableSkeleton colSpan={COL_SPAN} rows={5} />
        ) : rows.length === 0 ? (
          <AccountsTableEmpty
            colSpan={COL_SPAN}
            message={
              search
                ? "No bank accounts match your search."
                : "No bank accounts found. Add your first company bank account."
            }
            onClear={search ? onClearSearch : undefined}
          />
        ) : (
          rows.map((account, index) => {
            // Match CSS zebra: index 0 = odd/white, index 1 = even/muted
            const isEvenRow = index % 2 === 1;
            const rowBgClass = isEvenRow
              ? "!bg-muted/20 group-hover:!bg-muted/30"
              : "!bg-background group-hover:!bg-muted/25";
            const titleParts = [
              account.ledgerName,
              account.ledgerCode ? `(${account.ledgerCode})` : "",
              account.alias && account.alias !== account.ledgerName
                ? `· ${account.alias}`
                : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <AccountsTableRow
                key={account.ledgerId || account.bankAccountId || account.ledgerCode}
                className={cn(
                  "group",
                  isEvenRow ? "!bg-muted/20 hover:!bg-muted/30" : "!bg-background hover:!bg-muted/25",
                )}
                onClick={() => goToAccount(account.ledgerId, "view")}
              >
                <AccountsTableCell className={cn(rowBgClass, "font-semibold whitespace-nowrap max-w-[11rem]")}>
                  <div className="min-w-0">
                    <span className="block truncate" title={titleParts}>
                      {account.ledgerName || account.accountNickname || "—"}
                    </span>
                    {account.ledgerCode ? (
                      <span className="block mt-0.5 font-mono text-[10px] font-semibold text-brand-700 truncate">
                        {account.ledgerCode}
                      </span>
                    ) : null}
                  </div>
                </AccountsTableCell>
                <AccountsTableCell className={cn(rowBgClass, "whitespace-nowrap max-w-[8rem]")}>
                  <span className="block truncate" title={account.bankName || undefined}>
                    {account.bankName || "—"}
                  </span>
                </AccountsTableCell>
                <AccountsTableCell className={cn(rowBgClass, "whitespace-nowrap max-w-[10rem]")}>
                  <span
                    className="block truncate"
                    title={account.accountHolderName || undefined}
                  >
                    {account.accountHolderName || "—"}
                  </span>
                </AccountsTableCell>
                <AccountsTableCell mono className={cn(rowBgClass, "font-semibold text-brand-700 whitespace-nowrap")}>
                  {account.accountNumber || "—"}
                </AccountsTableCell>
                <AccountsTableCell mono className={cn(rowBgClass, "whitespace-nowrap")}>
                  {account.ifsc || "—"}
                </AccountsTableCell>
                <AccountsTableCell className={cn(rowBgClass, "whitespace-nowrap")}>
                  {account.accountType && account.accountType !== "—"
                    ? account.accountType
                    : "—"}
                </AccountsTableCell>
                <AccountsTableCell align="right" className={cn(rowBgClass, "whitespace-nowrap")}>
                  <MoneyAmount
                    amount={account.openingBalance}
                    side={account.balanceType}
                    className="text-xs"
                  />
                </AccountsTableCell>
                <AccountsTableCell align="right" className={cn(rowBgClass, "whitespace-nowrap")}>
                  {account.currentBalance != null ? (
                    <MoneyAmount
                      amount={account.currentBalance}
                      side={account.currentBalanceType}
                      className="text-xs"
                    />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </AccountsTableCell>
                <AccountsTableCell className={cn(rowBgClass, "bank-accounts-wh-cell", "whitespace-nowrap")}>
                  <MappedWarehousesCell names={account.mappedWarehouseNames} />
                </AccountsTableCell>
                <AccountsTableCell className={cn(rowBgClass, "bank-accounts-status-cell", "whitespace-nowrap")}>
                  <div
                    className="inline-flex items-center"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <BankAccountToggle
                      checked={isActiveStatus(account.status)}
                      disabled={
                        !canUpdate ||
                        !account.bankAccountId ||
                        statusPendingBankAccountId === account.bankAccountId
                      }
                      onCheckedChange={() => onRequestStatusChange(account)}
                      showLabel={false}
                    />
                  </div>
                </AccountsTableCell>
                <AccountsTableCell
                  align="right"
                  className={cn(accountsActionColClass("multi"), rowBgClass)}
                >
                  <AccountsTableActionCell className="!w-auto !min-w-0">
                    <AccountsViewAction
                      title="View"
                      onClick={(e) => {
                        e.stopPropagation();
                        goToAccount(account.ledgerId, "view");
                      }}
                    />
                    {account.bankDetailsStatus === "PENDING" ? (
                      canUpdate ? (
                        <button
                          type="button"
                          title="Complete details"
                          className={ACCOUNTS_ACTION_BTN_CLASS}
                          onClick={(e) => {
                            e.stopPropagation();
                            goToAccount(account.ledgerId, "complete");
                          }}
                        >
                          <ClipboardList className={ACCOUNTS_ACTION_ICON_CLASS} />
                        </button>
                      ) : null
                    ) : canUpdate ? (
                      <AccountsEditAction
                        title="Edit"
                        onClick={(e) => {
                          e.stopPropagation();
                          goToAccount(account.ledgerId, "edit");
                        }}
                      />
                    ) : null}
                  </AccountsTableActionCell>
                </AccountsTableCell>
              </AccountsTableRow>
            );
          })
        )}
      </AccountsTableBody>
    </AccountsTable>
  );
}

export default function BankAccountsPageClient() {
  const router = useRouter();
  const { selectedFY } = useFY();
  const financialYearId = selectedFY?.id ?? null;
  const permissions = usePermissionsOptional();
  const canCreate =
    !permissions || permissions.isLoading
      ? true
      : permissions.canCreate("accounts", "bank_account");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [uiSortKey, setUiSortKey] = useState("ledgerName");
  const [uiSortDir, setUiSortDir] = useState<"asc" | "desc">("asc");
  const [columnFilters, setColumnFilters] = useState<AccountsColumnFilters>({});
  const [statusTarget, setStatusTarget] = useState<BankAccountListRow | null>(null);
  const { toast, showToast, dismissToast } = useAccountsToast();
  const updateStatusMutation = useUpdateBankAccountStatus();
  const exportMutation = useExportBankAccounts();

  const ordering = useMemo(() => {
    const mapped = mapUiSortToOrdering(uiSortKey, uiSortDir);
    return mapped ?? DEFAULT_ORDERING;
  }, [uiSortKey, uiSortDir]);

  const apiFilters = useMemo(
    () => buildBankAccountApiFilters(columnFilters),
    [columnFilters],
  );

  const apiFiltersKey = useMemo(() => JSON.stringify(apiFilters), [apiFilters]);

  const { handleOpenFilter, isFilterOpen } = useLazyFilterColumns();

  const ledgerNameFilter = useBankAccountFilterOptions(
    BANK_ACCOUNT_FILTER_FIELD_BY_COLUMN.ledgerName,
    isFilterOpen("ledgerName"),
  );
  const bankNameFilter = useBankAccountFilterOptions(
    BANK_ACCOUNT_FILTER_FIELD_BY_COLUMN.bankName,
    isFilterOpen("bankName"),
  );
  const holderFilter = useBankAccountFilterOptions(
    BANK_ACCOUNT_FILTER_FIELD_BY_COLUMN.accountHolderName,
    isFilterOpen("accountHolderName"),
  );
  const accountNumberFilter = useBankAccountFilterOptions(
    BANK_ACCOUNT_FILTER_FIELD_BY_COLUMN.accountNumber,
    isFilterOpen("accountNumber"),
  );
  const ifscFilter = useBankAccountFilterOptions(
    BANK_ACCOUNT_FILTER_FIELD_BY_COLUMN.ifsc,
    isFilterOpen("ifsc"),
  );
  const accountTypeFilter = useBankAccountFilterOptions(
    BANK_ACCOUNT_FILTER_FIELD_BY_COLUMN.accountType,
    isFilterOpen("accountType"),
  );
  const warehouseFilter = useBankAccountFilterOptions(
    BANK_ACCOUNT_FILTER_FIELD_BY_COLUMN.mappedWarehousesLabel,
    isFilterOpen("mappedWarehousesLabel"),
  );
  const openingBalanceFilter = useBankAccountFilterOptions(
    BANK_ACCOUNT_FILTER_FIELD_BY_COLUMN.openingBalance,
    isFilterOpen("openingBalance"),
  );
  const statusFilter = useBankAccountFilterOptions(
    BANK_ACCOUNT_FILTER_FIELD_BY_COLUMN.status,
    isFilterOpen("status"),
  );

  const filterOptionsByColumn = useMemo((): FilterOptionsByColumn => {
    const map = (
      data: unknown[] | undefined,
      field: string,
    ): ColumnValueOption[] => mapBankAccountFilterOptions(data ?? [], field);

    return {
      ledgerName: map(ledgerNameFilter.data, BANK_ACCOUNT_FILTER_FIELD_BY_COLUMN.ledgerName),
      bankName: map(bankNameFilter.data, BANK_ACCOUNT_FILTER_FIELD_BY_COLUMN.bankName),
      accountHolderName: map(
        holderFilter.data,
        BANK_ACCOUNT_FILTER_FIELD_BY_COLUMN.accountHolderName,
      ),
      accountNumber: map(
        accountNumberFilter.data,
        BANK_ACCOUNT_FILTER_FIELD_BY_COLUMN.accountNumber,
      ),
      ifsc: map(ifscFilter.data, BANK_ACCOUNT_FILTER_FIELD_BY_COLUMN.ifsc),
      accountType: map(accountTypeFilter.data, BANK_ACCOUNT_FILTER_FIELD_BY_COLUMN.accountType),
      mappedWarehousesLabel: map(
        warehouseFilter.data,
        BANK_ACCOUNT_FILTER_FIELD_BY_COLUMN.mappedWarehousesLabel,
      ),
      openingBalance: map(
        openingBalanceFilter.data,
        BANK_ACCOUNT_FILTER_FIELD_BY_COLUMN.openingBalance,
      ),
      status: map(statusFilter.data, BANK_ACCOUNT_FILTER_FIELD_BY_COLUMN.status),
    };
  }, [
    ledgerNameFilter.data,
    bankNameFilter.data,
    holderFilter.data,
    accountNumberFilter.data,
    ifscFilter.data,
    accountTypeFilter.data,
    warehouseFilter.data,
    openingBalanceFilter.data,
    statusFilter.data,
  ]);

  const filterLoadingByColumn = useMemo((): FilterLoadingByColumn => {
    const loading = (opened: boolean, query: { isFetching: boolean; data?: unknown }) =>
      opened && query.isFetching && query.data === undefined;

    return {
      ledgerName: loading(isFilterOpen("ledgerName"), ledgerNameFilter),
      bankName: loading(isFilterOpen("bankName"), bankNameFilter),
      accountHolderName: loading(isFilterOpen("accountHolderName"), holderFilter),
      accountNumber: loading(isFilterOpen("accountNumber"), accountNumberFilter),
      ifsc: loading(isFilterOpen("ifsc"), ifscFilter),
      accountType: loading(isFilterOpen("accountType"), accountTypeFilter),
      mappedWarehousesLabel: loading(isFilterOpen("mappedWarehousesLabel"), warehouseFilter),
      openingBalance: loading(isFilterOpen("openingBalance"), openingBalanceFilter),
      status: loading(isFilterOpen("status"), statusFilter),
    };
  }, [
    isFilterOpen,
    ledgerNameFilter.isFetching,
    ledgerNameFilter.data,
    bankNameFilter.isFetching,
    bankNameFilter.data,
    holderFilter.isFetching,
    holderFilter.data,
    accountNumberFilter.isFetching,
    accountNumberFilter.data,
    ifscFilter.isFetching,
    ifscFilter.data,
    accountTypeFilter.isFetching,
    accountTypeFilter.data,
    warehouseFilter.isFetching,
    warehouseFilter.data,
    openingBalanceFilter.isFetching,
    openingBalanceFilter.data,
    statusFilter.isFetching,
    statusFilter.data,
  ]);

  const filterReadyByColumn = useMemo(
    (): FilterReadyByColumn => ({
      ledgerName: isFilterOpen("ledgerName"),
      bankName: isFilterOpen("bankName"),
      accountHolderName: isFilterOpen("accountHolderName"),
      accountNumber: isFilterOpen("accountNumber"),
      ifsc: isFilterOpen("ifsc"),
      accountType: isFilterOpen("accountType"),
      mappedWarehousesLabel: isFilterOpen("mappedWarehousesLabel"),
      openingBalance: isFilterOpen("openingBalance"),
      status: isFilterOpen("status"),
    }),
    [isFilterOpen],
  );

  const listQuery = useBankAccountsList({
    page,
    pageSize,
    search: debouncedSearch,
    ordering,
    apiFilters,
    financialYearId,
  });

  const rows = listQuery.data?.items ?? [];
  const totalRecords = listQuery.data?.total ?? 0;
  const loading = listQuery.isLoading || (listQuery.isFetching && !listQuery.data);
  const listError = listQuery.isError
    ? getMasterListErrorMessage(listQuery.error, {
        resource: "Bank accounts",
        notFoundMessage: "Bank accounts list endpoint not found.",
        serverMessage: "Server error while loading bank accounts.",
      })
    : null;

  const handleSortChange = useCallback((sortKey: string, sortDir: "asc" | "desc") => {
    setUiSortKey(sortKey || "ledgerName");
    setUiSortDir(sortDir);
  }, []);

  const handleFiltersChange = useCallback((filters: AccountsColumnFilters) => {
    setColumnFilters(filters);
  }, []);

  const getCellValue = useCallback((row: BankAccountListRow, key: string) => {
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, pageSize, ordering, apiFiltersKey]);

  const handleExport = async () => {
    try {
      const result = await exportMutation.mutateAsync({
        search: debouncedSearch,
        ordering,
        apiFilters,
        financialYearId,
      });
      if (result === "empty") {
        showToast("No records found to export.", "error");
        return;
      }
      showToast("Export downloaded successfully.");
    } catch (error) {
      showToast(
        extractBankAccountErrorMessage(error, "Failed to export bank accounts."),
        "error",
      );
    }
  };

  const confirmStatusChange = () => {
    if (!statusTarget?.bankAccountId) {
      showToast(
        statusTarget?.bankDetailsStatus === "PENDING"
          ? "Complete bank details before changing status."
          : "Bank account id missing. Unable to update status.",
        "error",
      );
      setStatusTarget(null);
      return;
    }

    const nextStatus = statusTarget.status === "active" ? "INACTIVE" : "ACTIVE";
    updateStatusMutation.mutate(
      {
        bankAccountId: statusTarget.bankAccountId,
        status: nextStatus,
        ledgerId: statusTarget.ledgerId,
      },
      {
        onSuccess: () => {
          showToast(
            `Bank account status updated to ${nextStatus === "ACTIVE" ? "Active" : "Inactive"}`,
          );
        },
        onError: (error) => {
          showToast(
            extractBankAccountErrorMessage(error, "Failed to update bank account status."),
            "error",
          );
        },
        onSettled: () => {
          setStatusTarget(null);
        },
      },
    );
  };

  return (
    <TooltipProvider delayDuration={200}>
      <AccountsColumnFilterProvider
        rows={rows}
        getCellValue={getCellValue}
        columnConfig={{
          ledgerName: { type: "text" },
          bankName: { type: "text" },
          accountHolderName: { type: "text" },
          accountNumber: { type: "text" },
          ifsc: { type: "text" },
          accountType: {
            type: "text",
            optionLabels: ACCOUNT_TYPE_OPTION_LABELS,
          },
          openingBalance: { type: "amount" },
          mappedWarehousesLabel: { type: "text" },
          status: {
            type: "status",
            optionLabels: STATUS_OPTION_LABELS,
          },
        }}
        defaultSortKey="ledgerName"
        defaultSortDir="asc"
      >
        <SortSync onSortChange={handleSortChange} />
        <FilterSync onFiltersChange={handleFiltersChange} />
        <div className="bank-accounts-dense h-full min-h-0 flex flex-col">
          <AccountsPageShell
            breadcrumbs={accountsBreadcrumb("Banking", "Bank Accounts")}
            title="Bank Accounts"
            description="Company bank ledgers used in Bank Book, vouchers and reconciliation."
            hideDescription
            actions={
              canCreate ? (
                <Button
                  size="sm"
                  className="h-8 text-xs font-medium bg-brand-600 hover:bg-brand-700 text-white gap-1.5"
                  onClick={() => router.push("/accounts/banking/bank-accounts/new")}
                >
                  <Plus className="w-3.5 h-3.5" /> Add Bank Account
                </Button>
              ) : null
            }
            layout="split"
            className="h-full min-h-0"
          >
            {listError ? (
              <p className="mb-2 px-1 text-xs text-red-600">{listError}</p>
            ) : null}
            <AccountsTableListing
              toolbar={
                <BankAccountsExportToolbar
                  search={search}
                  onSearchChange={setSearch}
                  onExport={handleExport}
                  exportDisabled={totalRecords === 0 && rows.length === 0}
                  exporting={exportMutation.isPending}
                />
              }
              summary={
                !loading && !listError ? (
                  <BankAccountsSummary rows={rows} totalRows={totalRecords} />
                ) : null
              }
              footer={
                !loading && totalRecords > 0 ? (
                  <AccountsTablePagination
                    page={page}
                    pageSize={pageSize}
                    totalRecords={totalRecords}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                    recordLabel="accounts"
                  />
                ) : null
              }
            >
              <BankAccountsTable
                rows={rows}
                loading={loading}
                search={debouncedSearch}
                onClearSearch={() => setSearch("")}
                onRequestStatusChange={setStatusTarget}
                statusPendingBankAccountId={
                  updateStatusMutation.isPending
                    ? statusTarget?.bankAccountId ?? null
                    : null
                }
                filterOptionsByColumn={filterOptionsByColumn}
                filterLoadingByColumn={filterLoadingByColumn}
                filterReadyByColumn={filterReadyByColumn}
                onOpenFilter={handleOpenFilter}
              />
            </AccountsTableListing>
          </AccountsPageShell>
        </div>

        <Dialog open={!!statusTarget} onOpenChange={(o) => !o && setStatusTarget(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-amber-50 border border-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                </div>
                {statusTarget?.status === "active"
                  ? "Deactivate Bank Account?"
                  : "Activate Bank Account?"}
              </DialogTitle>
              <DialogDescription className="text-xs pt-1">
                {statusTarget && (
                  <>
                    <strong className="text-foreground">
                      {statusTarget.ledgerName || statusTarget.accountNickname}
                    </strong>{" "}
                    will be marked as{" "}
                    {statusTarget.status === "active" ? "inactive" : "active"}.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setStatusTarget(null)}
                disabled={updateStatusMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs text-white bg-brand-600 hover:bg-brand-700"
                onClick={confirmStatusChange}
                disabled={updateStatusMutation.isPending}
              >
                {updateStatusMutation.isPending ? "Updating…" : "Confirm"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <AccountsToast toast={toast} onDismiss={dismissToast} />
      </AccountsColumnFilterProvider>
    </TooltipProvider>
  );
}
