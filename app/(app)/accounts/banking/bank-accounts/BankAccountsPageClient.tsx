"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import "./bank-accounts-dense.css";
import { Button } from "@/components/ui/button";
import {
  AccountsEditAction,
  AccountsTableActionCell,
  AccountsViewAction,
  accountsActionColClass,
} from "@/components/accounts/AccountsTableActions";
import { Plus } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
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
import { maskBankAccountLast4 } from "@/lib/accounts/bank-account-display";
import {
  ensureBankAccountsReady,
  getMappedWarehouseLabels,
  loadBankAccountMasters,
  type BankAccountMaster,
} from "@/lib/accounts/bank-accounts-data";
import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import { computeLedgerCurrentBalance } from "@/app/(app)/accounts/masters/ledgers/ledgers-utils";
import { useAccountsSectionRefresh } from "@/lib/accounts/use-accounts-section-refresh";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type BankAccountRow = BankAccountMaster & {
  currentBalance: number;
  balanceType: "Debit" | "Credit";
  mappedWarehousesLabel: string;
  mappedWarehouseNames: string[];
};

function formatBankReconciledDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d} ${months[parseInt(m, 10) - 1]} ${y}`;
}

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

function exportBankAccountsCsv(rows: BankAccountRow[]) {
  const headers = [
    "Account Name",
    "Bank Name",
    "Account No.",
    "IFSC",
    "Branch",
    "Account Type",
    "Opening Balance",
    "Current Balance",
    "Reconciliation",
    "Mapped Warehouses",
    "Status",
  ];
  const lines = rows.map((r) =>
    [
      r.accountNickname,
      r.bankName,
      maskBankAccountLast4(r.accountNumber),
      r.ifsc,
      r.branchName,
      r.accountType,
      r.openingBalance,
      r.currentBalance,
      r.reconciliationEnabled ? "Yes" : "No",
      getMappedWarehouseLabels(r).join("; "),
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
  const visible = useAccountsFilteredRows<BankAccountRow>([]);

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

function BankAccountsSummary({ totalRows, activeCount }: { totalRows: number; activeCount: number }) {
  const visible = useAccountsFilteredRows<BankAccountRow>([]);

  if (visible.length === 0) return null;

  return (
    <div className="bank-accounts-summary flex items-center justify-between px-2.5 py-1 border-b border-border/60 bg-muted/10 text-[11px] text-muted-foreground">
      <span className="truncate">
        <span className="font-medium text-foreground">{visible.length}</span> of{" "}
        <span className="font-medium text-foreground">{totalRows}</span> accounts
        {activeCount !== totalRows && <span> · {activeCount} active</span>}
      </span>
      <span className="tabular-nums whitespace-nowrap flex-shrink-0 ml-2">
        Total current balance:{" "}
        <span className="font-medium text-foreground">
          {formatMoney(visible.reduce((s, r) => s + r.currentBalance, 0))}
        </span>
      </span>
    </div>
  );
}

function BankAccountsTable({
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  search,
  onClearSearch,
}: {
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  search: string;
  onClearSearch: () => void;
}) {
  const router = useRouter();
  const ctx = useAccountsColumnFilterContext();
  const visible = useAccountsFilteredRows<BankAccountRow>([]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return visible.slice(start, start + pageSize);
  }, [visible, page, pageSize]);

  useEffect(() => {
    onPageChange(1);
  }, [ctx?.columnFilters, ctx?.sortKey, ctx?.sortDir, onPageChange]);

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
            <SortTh label="Reconciliation" colKey="reconciliationEnabled" filterType="text" />
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
          {visible.length === 0 ? (
            <AccountsTableEmpty
              colSpan={12}
              message={
                search
                  ? "No bank accounts match your search."
                  : "No bank accounts found. Add your first company bank account."
              }
              onClear={search ? onClearSearch : undefined}
            />
          ) : (
            pagedRows.map((account) => (
              <AccountsTableRow key={account.id}>
                <AccountsTableCell className="font-semibold whitespace-nowrap max-w-[9rem]">
                  <span className="block truncate" title={account.accountNickname}>
                    {account.accountNickname}
                  </span>
                </AccountsTableCell>
                <AccountsTableCell className="whitespace-nowrap max-w-[8rem]">
                  <span className="block truncate" title={account.bankName}>
                    {account.bankName}
                  </span>
                </AccountsTableCell>
                <AccountsTableCell mono className="font-semibold text-brand-700 whitespace-nowrap">
                  {account.accountNumber ? maskBankAccountLast4(account.accountNumber) : "—"}
                </AccountsTableCell>
                <AccountsTableCell mono className="whitespace-nowrap">
                  {account.ifsc || "—"}
                </AccountsTableCell>
                <AccountsTableCell className="whitespace-nowrap max-w-[7rem]">
                  <span className="block truncate" title={account.branchName || undefined}>
                    {account.branchName || "—"}
                  </span>
                </AccountsTableCell>
                <AccountsTableCell className="whitespace-nowrap">{account.accountType}</AccountsTableCell>
                <AccountsTableCell align="right" className="whitespace-nowrap">
                  <MoneyAmount amount={account.openingBalance} side={account.balanceType} className="text-xs" />
                </AccountsTableCell>
                <AccountsTableCell align="right" className="whitespace-nowrap">
                  <MoneyAmount amount={account.currentBalance} side={account.balanceType} className="text-xs" />
                </AccountsTableCell>
                <AccountsTableCell className="bank-accounts-recon-cell whitespace-nowrap text-xs">
                  {account.reconciliationEnabled ? (
                    <span className="text-emerald-700 font-medium">Yes</span>
                  ) : (
                    <span className="text-muted-foreground">No</span>
                  )}
                  {account.lastReconciledDate ? (
                    <span
                      className="text-muted-foreground ml-1"
                      title={`Last reconciled ${formatBankReconciledDate(account.lastReconciledDate)}`}
                    >
                      · {formatBankReconciledDate(account.lastReconciledDate)}
                    </span>
                  ) : null}
                </AccountsTableCell>
                <AccountsTableCell className={cn("bank-accounts-wh-cell", "whitespace-nowrap")}>
                  <MappedWarehousesCell names={account.mappedWarehouseNames} />
                </AccountsTableCell>
                <AccountsTableCell className="whitespace-nowrap">
                  <StatusBadge status={account.status} />
                </AccountsTableCell>
                <AccountsTableCell align="right" className={accountsActionColClass("multi")}>
                  <AccountsTableActionCell>
                    <AccountsViewAction
                      title="View"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/accounts/banking/bank-accounts/${account.id}`);
                      }}
                    />
                    <AccountsEditAction
                      title="Edit"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/accounts/banking/bank-accounts/${account.id}/edit`);
                      }}
                    />
                  </AccountsTableActionCell>
                </AccountsTableCell>
              </AccountsTableRow>
            ))
          )}
        </AccountsTableBody>
      </AccountsTable>
      {visible.length > 0 ? (
        <AccountsTablePagination
          page={page}
          pageSize={pageSize}
          totalRecords={visible.length}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          recordLabel="accounts"
        />
      ) : null}
    </>
  );
}

function buildBankAccountRows(): BankAccountRow[] {
  const accounts = loadBankAccountMasters();
  const records = loadChartOfAccounts();
  return accounts.map((account) => {
    const ledger = records.find((r) => r.id === account.coaLedgerId);
    const balance = ledger
      ? computeLedgerCurrentBalance(ledger)
      : { amount: account.openingBalance, balanceType: account.balanceType };
    const mappedWarehouseNames = getMappedWarehouseLabels(account);
    return {
      ...account,
      currentBalance: balance.amount,
      balanceType: balance.balanceType,
      mappedWarehouseNames,
      mappedWarehousesLabel: mappedWarehouseNames.join(", "),
    };
  });
}

export default function BankAccountsPageClient() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<BankAccountRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const sectionRefresh = useAccountsSectionRefresh();

  useEffect(() => {
    ensureBankAccountsReady();
    setRows(buildBankAccountRows());
  }, [sectionRefresh]);

  const toolbarFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.bankName.toLowerCase().includes(q) ||
        r.accountNickname.toLowerCase().includes(q) ||
        r.accountNumber.toLowerCase().includes(q) ||
        r.ifsc.toLowerCase().includes(q) ||
        r.branchName.toLowerCase().includes(q) ||
        r.accountType.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const getCellValue = useCallback(
    (row: BankAccountRow, key: string) => {
      if (key === "reconciliationEnabled") {
        return row.reconciliationEnabled ? "Yes" : "No";
      }
      return (row as unknown as Record<string, unknown>)[key];
    },
    [],
  );

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  const activeCount = rows.filter((r) => r.status === "active").length;

  return (
    <TooltipProvider delayDuration={200}>
      <AccountsColumnFilterProvider
        rows={toolbarFiltered}
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
          reconciliationEnabled: { type: "text" },
          mappedWarehousesLabel: { type: "text" },
          status: { type: "text" },
        }}
        defaultSortKey="bankName"
        defaultSortDir="asc"
      >
        <div className="bank-accounts-dense h-full min-h-0 flex flex-col">
          <AccountsPageShell
            breadcrumbs={accountsBreadcrumb("Banking", "Bank Accounts")}
            title="Bank Accounts"
            description="Company bank ledgers used in Bank Book, vouchers and reconciliation."
            hideDescription
            actions={
              <Button
                size="sm"
                className="h-8 text-xs font-medium bg-brand-600 hover:bg-brand-700 text-white gap-1.5"
                onClick={() => router.push("/accounts/banking/bank-accounts/new")}
              >
                <Plus className="w-3.5 h-3.5" /> Add Bank Account
              </Button>
            }
            layout="split"
            className="h-full min-h-0"
          >
            <AccountsTableListing
              toolbar={<BankAccountsExportToolbar search={search} onSearchChange={setSearch} />}
              summary={<BankAccountsSummary totalRows={rows.length} activeCount={activeCount} />}
            >
              <BankAccountsTable
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                search={search}
                onClearSearch={() => setSearch("")}
              />
            </AccountsTableListing>
          </AccountsPageShell>
        </div>
      </AccountsColumnFilterProvider>
    </TooltipProvider>
  );
}
