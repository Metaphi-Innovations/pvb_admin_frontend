"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  useAccountsColumnFilterContext,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
import { formatMoney } from "@/lib/accounts/money-format";
import {
  loadBankAccounts,
  type BankAccountMaster,
} from "@/lib/accounts/bank-accounts-data";
import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import { computeLedgerCurrentBalance } from "@/app/(app)/accounts/masters/ledgers/ledgers-utils";
import { useAccountsSectionRefresh } from "@/lib/accounts/use-accounts-section-refresh";

type BankAccountRow = BankAccountMaster & {
  currentBalance: number;
  balanceType: "Debit" | "Credit";
};

function exportBankAccountsCsv(rows: BankAccountRow[]) {
  const headers = [
    "Bank Name",
    "Account No.",
    "IFSC",
    "Branch",
    "Account Type",
    "Opening Balance",
    "Current Balance",
    "Status",
  ];
  const lines = rows.map((r) =>
    [
      r.bankName,
      r.accountNumber,
      r.ifsc,
      r.branchName,
      r.accountType,
      r.openingBalance,
      r.currentBalance,
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
    <div className="flex items-center justify-between px-5 py-2 border-b border-border/60 bg-muted/10 text-xs text-muted-foreground">
      <span>
        <span className="font-medium text-foreground">{visible.length}</span> of{" "}
        <span className="font-medium text-foreground">{totalRows}</span> accounts
        {activeCount !== totalRows && <span> · {activeCount} active</span>}
      </span>
      <span className="tabular-nums">
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
      <AccountsTable minWidth={960}>
        <AccountsTableHead>
          <AccountsTableHeadRow>
            <SortTh label="Bank Name" colKey="bankName" />
            <SortTh label="Account No." colKey="accountNumber" />
            <SortTh label="IFSC" colKey="ifsc" />
            <SortTh label="Branch" colKey="branchName" />
            <SortTh label="Account Type" colKey="accountType" />
            <SortTh label="Opening Balance" colKey="openingBalance" filterType="amount" align="right" />
            <SortTh label="Current Balance" colKey="currentBalance" filterType="amount" align="right" />
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
              colSpan={8}
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
                <AccountsTableCell className="font-semibold whitespace-nowrap">{account.bankName}</AccountsTableCell>
                <AccountsTableCell mono className="font-semibold text-brand-700 whitespace-nowrap">
                  {account.accountNumber || "—"}
                </AccountsTableCell>
                <AccountsTableCell mono className="whitespace-nowrap">{account.ifsc || "—"}</AccountsTableCell>
                <AccountsTableCell className="whitespace-nowrap">{account.branchName || "—"}</AccountsTableCell>
                <AccountsTableCell className="whitespace-nowrap">{account.accountType}</AccountsTableCell>
                <AccountsTableCell align="right" className="whitespace-nowrap">
                  <MoneyAmount amount={account.openingBalance} side={account.balanceType} className="text-xs" />
                </AccountsTableCell>
                <AccountsTableCell align="right" className="whitespace-nowrap">
                  <MoneyAmount amount={account.currentBalance} side={account.balanceType} className="text-xs" />
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

export default function BankAccountsPageClient() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const sectionRefresh = useAccountsSectionRefresh();

  useEffect(() => {
    setRefreshKey((k) => k + 1);
  }, [sectionRefresh]);

  const rows = useMemo((): BankAccountRow[] => {
    void refreshKey;
    const accounts = loadBankAccounts();
    const records = loadChartOfAccounts();
    return accounts.map((account) => {
      const ledger = records.find((r) => r.id === account.coaLedgerId);
      const balance = ledger
        ? computeLedgerCurrentBalance(ledger)
        : { amount: account.openingBalance, balanceType: account.balanceType };
      return {
        ...account,
        currentBalance: balance.amount,
        balanceType: balance.balanceType,
      };
    });
  }, [refreshKey]);

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
    (row: BankAccountRow, key: string) => (row as unknown as Record<string, unknown>)[key],
    [],
  );

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  const activeCount = rows.filter((r) => r.status === "active").length;

  return (
    <AccountsColumnFilterProvider
      rows={toolbarFiltered}
      getCellValue={getCellValue}
      columnConfig={{
        bankName: { type: "text" },
        accountNumber: { type: "text" },
        ifsc: { type: "text" },
        branchName: { type: "text" },
        accountType: { type: "text" },
        openingBalance: { type: "amount" },
        currentBalance: { type: "amount" },
      }}
      defaultSortKey="bankName"
      defaultSortDir="asc"
    >
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Banking", "Bank Accounts")}
        title="Bank Accounts"
        description="Company bank ledgers used in Bank Book, vouchers and reconciliation."
        hideDescription
        actions={
          <Button
            size="sm"
            className="h-9 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white gap-1"
            onClick={() => router.push("/accounts/banking/bank-accounts/new")}
          >
            <Plus className="w-4 h-4" /> Add Bank Account
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
    </AccountsColumnFilterProvider>
  );
}
