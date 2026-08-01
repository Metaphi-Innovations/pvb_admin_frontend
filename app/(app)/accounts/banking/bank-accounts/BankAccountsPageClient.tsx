"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { ClipboardList, Plus } from "lucide-react";
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
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { MoneyAmount } from "@/components/accounts/MoneyAmount";
import {
  AccountsColumnFilterProvider,
  AccountsColumnHeader,
  SortTh,
  StatusBadge,
  useAccountsColumnFilterContext,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
import { formatMoney } from "@/lib/accounts/money-format";
import {
  mapUiSortToApi,
  type BankAccountListRow,
  type BankAccountsListSortBy,
  type BankAccountsListSortOrder,
} from "@/services/bank-accounts-list.service";
import { useBankAccountsList } from "@/hooks/accounts/use-bank-accounts-list";
import { getMasterListErrorMessage } from "@/lib/masters/master-query-errors";
import { useDebouncedValue } from "@/app/(app)/accounts/reports/pl/pl-hooks";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const DEFAULT_API_SORT: {
  sortBy: BankAccountsListSortBy;
  sortOrder: BankAccountsListSortOrder;
} = { sortBy: "ledgerName", sortOrder: "asc" };

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

function DetailsStatusBadge({ status }: { status: "PENDING" | "COMPLETE" }) {
  if (status === "PENDING") {
    return <StatusBadge status="pending" />;
  }
  return <StatusBadge status="completed" />;
}

function exportBankAccountsCsv(rows: BankAccountListRow[]) {
  const headers = [
    "Account Name",
    "Ledger Code",
    "Bank Name",
    "Account No.",
    "IFSC",
    "Branch",
    "Account Type",
    "Opening Balance",
    "Mapped Warehouses",
    "Details Status",
    "Status",
  ];
  const lines = rows.map((r) =>
    [
      r.ledgerName || r.accountNickname,
      r.ledgerCode,
      r.bankName,
      r.maskedAccountNumber,
      r.ifsc,
      r.branchName,
      r.accountType,
      r.openingBalance,
      r.mappedWarehouseNames.join("; "),
      r.bankDetailsStatus,
      r.status,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );
  const blob = new Blob([[headers.join(","), ...lines].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "bank-accounts.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function BankAccountsExportToolbar({
  search,
  onSearchChange,
}: {
  search: string;
  onSearchChange: (v: string) => void;
}) {
  const visible = useAccountsFilteredRows<BankAccountListRow>([]);

  return (
    <AccountsTableToolbar
      className="bank-accounts-toolbar"
      search={{
        value: search,
        onChange: onSearchChange,
        placeholder: "Search bank, account no., IFSC…",
      }}
      onExcel={() => exportBankAccountsCsv(visible)}
      exportDisabled={visible.length === 0}
    />
  );
}

function BankAccountsSummary({ totalRows }: { totalRows: number }) {
  const visible = useAccountsFilteredRows<BankAccountListRow>([]);

  if (visible.length === 0) return null;

  const openingTotal = visible.reduce((s, r) => s + r.openingBalance, 0);
  const activeOnPage = visible.filter((r) => r.status === "active").length;

  return (
    <div className="bank-accounts-summary flex items-center justify-between px-2.5 py-1 border-b border-border/60 bg-muted/10 text-[11px] text-muted-foreground">
      <span className="truncate">
        <span className="font-medium text-foreground">{visible.length}</span> of{" "}
        <span className="font-medium text-foreground">{totalRows}</span> accounts
        {activeOnPage !== visible.length && <span> · {activeOnPage} active</span>}
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
    if (!ctx?.sortKey) return;
    onSortChange(ctx.sortKey, ctx.sortDir ?? "asc");
  }, [ctx?.sortKey, ctx?.sortDir, onSortChange]);

  return null;
}

function BankAccountsTable({
  page,
  pageSize,
  totalRecords,
  loading,
  onPageChange,
  onPageSizeChange,
  search,
  onClearSearch,
}: {
  page: number;
  pageSize: number;
  totalRecords: number;
  loading: boolean;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  search: string;
  onClearSearch: () => void;
}) {
  const router = useRouter();
  const ctx = useAccountsColumnFilterContext();
  const visible = useAccountsFilteredRows<BankAccountListRow>([]);

  // Server already paginates — Excel filters only narrow the current page.
  const pagedRows = visible;

  useEffect(() => {
    onPageChange(1);
  }, [ctx?.columnFilters, onPageChange]);

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

  return (
    <>
      <AccountsTable minWidth={1080}>
        <AccountsTableHead>
          <AccountsTableHeadRow>
            <SortTh label="Account Name" colKey="accountNickname" />
            <SortTh label="Bank Name" colKey="bankName" />
            <SortTh label="Account No." colKey="accountNumber" />
            <SortTh label="IFSC" colKey="ifsc" />
            <SortTh label="Branch" colKey="branchName" />
            <SortTh label="Account Type" colKey="accountType" />
            <SortTh label="Opening Balance" colKey="openingBalance" filterType="amount" align="right" />
            <SortTh label="Current Balance" colKey="currentBalance" filterType="amount" align="right" />
            <SortTh label="Mapped Warehouses" colKey="mappedWarehousesLabel" filterType="text" />
            <SortTh label="Status" colKey="status" filterType="text" />
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
            <AccountsListingTableSkeleton colSpan={11} rows={5} />
          ) : visible.length === 0 ? (
            <AccountsTableEmpty
              colSpan={11}
              message={
                search
                  ? "No bank accounts match your search."
                  : "No bank accounts found. Add your first company bank account."
              }
              onClear={search ? onClearSearch : undefined}
            />
          ) : (
            pagedRows.map((account) => {
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
                  onClick={() => goToAccount(account.ledgerId, "view")}
                >
                  <AccountsTableCell className="font-semibold whitespace-nowrap max-w-[11rem]">
                    <div className="min-w-0">
                      <span className="block truncate" title={titleParts}>
                        {account.ledgerName || account.accountNickname || "—"}
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                        {account.ledgerCode ? (
                          <span className="font-mono text-[10px] font-semibold text-brand-700 truncate">
                            {account.ledgerCode}
                          </span>
                        ) : null}
                        <DetailsStatusBadge status={account.bankDetailsStatus} />
                      </div>
                    </div>
                  </AccountsTableCell>
                  <AccountsTableCell className="whitespace-nowrap max-w-[8rem]">
                    <span className="block truncate" title={account.bankName || undefined}>
                      {account.bankName || "—"}
                    </span>
                  </AccountsTableCell>
                  <AccountsTableCell mono className="font-semibold text-brand-700 whitespace-nowrap">
                    {account.maskedAccountNumber || "—"}
                  </AccountsTableCell>
                  <AccountsTableCell mono className="whitespace-nowrap">
                    {account.ifsc || "—"}
                  </AccountsTableCell>
                  <AccountsTableCell className="whitespace-nowrap max-w-[7rem]">
                    <span className="block truncate" title={account.branchName || undefined}>
                      {account.branchName || "—"}
                    </span>
                  </AccountsTableCell>
                  <AccountsTableCell className="whitespace-nowrap">
                    {account.accountType && account.accountType !== "—"
                      ? account.accountType
                      : "—"}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" className="whitespace-nowrap">
                    <MoneyAmount
                      amount={account.openingBalance}
                      side={account.balanceType}
                      className="text-xs"
                    />
                  </AccountsTableCell>
                  <AccountsTableCell align="right" className="whitespace-nowrap">
                    <span className="text-muted-foreground">—</span>
                  </AccountsTableCell>
                  <AccountsTableCell className={cn("bank-accounts-wh-cell", "whitespace-nowrap")}>
                    <MappedWarehousesCell names={account.mappedWarehouseNames} />
                  </AccountsTableCell>
                  <AccountsTableCell className="whitespace-nowrap">
                    <StatusBadge status={account.status} />
                  </AccountsTableCell>
                  <AccountsTableCell align="right" className={accountsActionColClass("multi")}>
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
      {!loading && totalRecords > 0 ? (
        <AccountsTablePagination
          page={page}
          pageSize={pageSize}
          totalRecords={totalRecords}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          recordLabel="accounts"
        />
      ) : null}
    </>
  );
}

export default function BankAccountsPageClient() {
  const router = useRouter();
  const permissions = usePermissionsOptional();
  const canCreate =
    !permissions || permissions.isLoading
      ? true
      : permissions.canCreate("accounts", "bank_account");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [uiSortKey, setUiSortKey] = useState("accountNickname");
  const [uiSortDir, setUiSortDir] = useState<"asc" | "desc">("asc");
  const lastServerSortRef = useRef(DEFAULT_API_SORT);

  const apiSort = useMemo(() => {
    const mapped = mapUiSortToApi(uiSortKey, uiSortDir);
    if (mapped) {
      lastServerSortRef.current = mapped;
      return mapped;
    }
    return lastServerSortRef.current;
  }, [uiSortKey, uiSortDir]);

  const listQuery = useBankAccountsList({
    page,
    limit: pageSize,
    search: debouncedSearch,
    sortBy: apiSort.sortBy,
    sortOrder: apiSort.sortOrder,
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
    setUiSortKey(sortKey);
    setUiSortDir(sortDir);
  }, []);

  const getCellValue = useCallback((row: BankAccountListRow, key: string) => {
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, pageSize, apiSort.sortBy, apiSort.sortOrder]);

  return (
    <TooltipProvider delayDuration={200}>
      <AccountsColumnFilterProvider
        rows={rows}
        getCellValue={getCellValue}
        columnConfig={{
          accountNickname: { type: "text" },
          bankName: { type: "text" },
          accountNumber: { type: "text" },
          ifsc: { type: "text" },
          branchName: { type: "text" },
          accountType: { type: "text" },
          openingBalance: { type: "amount" },
          currentBalance: { type: "amount" },
          mappedWarehousesLabel: { type: "text" },
          status: { type: "text" },
        }}
        defaultSortKey="accountNickname"
        defaultSortDir="asc"
      >
        <SortSync onSortChange={handleSortChange} />
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
              toolbar={<BankAccountsExportToolbar search={search} onSearchChange={setSearch} />}
              summary={
                !loading && !listError ? (
                  <BankAccountsSummary totalRows={totalRecords} />
                ) : null
              }
            >
              <BankAccountsTable
                page={page}
                pageSize={pageSize}
                totalRecords={totalRecords}
                loading={loading}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                search={debouncedSearch}
                onClearSearch={() => setSearch("")}
              />
            </AccountsTableListing>
          </AccountsPageShell>
        </div>
      </AccountsColumnFilterProvider>
    </TooltipProvider>
  );
}
