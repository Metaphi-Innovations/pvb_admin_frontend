"use client";

import { useEffect, useMemo, useState } from "react";
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
  AccountsTableHeadCell,
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
import { StatusBadge } from "@/app/(app)/accounts/components/AccountsUI";
import { formatMoney } from "@/lib/accounts/money-format";
import {
  loadBankAccounts,
  type BankAccountMaster,
} from "@/lib/accounts/bank-accounts-data";
import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import { computeLedgerCurrentBalance } from "@/app/(app)/accounts/masters/ledgers/ledgers-utils";
import { ensureBankingDemoOnPageLoad } from "@/lib/accounts/banking-demo-seed";

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

export default function BankAccountsPageClient() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    ensureBankingDemoOnPageLoad();
    loadBankAccounts();
    setRefreshKey((k) => k + 1);
  }, []);

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

  const filtered = useMemo(() => {
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

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const activeCount = rows.filter((r) => r.status === "active").length;

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Banking", "Bank Accounts")}
      title="Bank Accounts"
      description="Company bank ledgers used in Bank Book, fund transfers, vouchers and reconciliation."
      actions={
        <Button
          size="sm"
          className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1"
          onClick={() => router.push("/accounts/banking/bank-accounts/new")}
        >
          <Plus className="w-3.5 h-3.5" /> Add Bank Account
        </Button>
      }
      toolbar={
        <AccountsTableToolbar
          placement="page-header"
          search={{
            value: search,
            onChange: setSearch,
            placeholder: "Search bank, account no., IFSC…",
          }}
          onExcel={() => exportBankAccountsCsv(filtered)}
          onPdf={() => exportBankAccountsCsv(filtered)}
          exportDisabled={filtered.length === 0}
        />
      }
      layout="split"
      className="h-full min-h-0"
    >
      <AccountsTableListing
        summary={
          filtered.length > 0 ? (
            <div className="flex items-center justify-between px-5 py-2 border-b border-border/60 bg-muted/10 text-[11px] text-muted-foreground">
              <span>
                <span className="font-medium text-foreground">{filtered.length}</span> of{" "}
                <span className="font-medium text-foreground">{rows.length}</span> accounts
                {activeCount !== rows.length && <span> · {activeCount} active</span>}
              </span>
              <span className="tabular-nums">
                Total current balance:{" "}
                <span className="font-medium text-foreground">
                  {formatMoney(filtered.reduce((s, r) => s + r.currentBalance, 0))}
                </span>
              </span>
            </div>
          ) : null
        }
        footer={
          filtered.length > 0 ? (
            <AccountsTablePagination
              page={page}
              pageSize={pageSize}
              totalRecords={filtered.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              recordLabel="accounts"
            />
          ) : null
        }
      >
        <AccountsTable minWidth={960}>
          <AccountsTableHead>
            <AccountsTableHeadRow>
              <AccountsTableHeadCell uppercase>Bank Name</AccountsTableHeadCell>
              <AccountsTableHeadCell uppercase>Account No.</AccountsTableHeadCell>
              <AccountsTableHeadCell uppercase>IFSC</AccountsTableHeadCell>
              <AccountsTableHeadCell uppercase>Branch</AccountsTableHeadCell>
              <AccountsTableHeadCell uppercase>Account Type</AccountsTableHeadCell>
              <AccountsTableHeadCell align="right" uppercase>Opening Balance</AccountsTableHeadCell>
              <AccountsTableHeadCell align="right" uppercase>Current Balance</AccountsTableHeadCell>
              <AccountsTableHeadCell uppercase className="accounts-col-status">Status</AccountsTableHeadCell>
              <AccountsTableHeadCell align="right" uppercase className={accountsActionColClass("multi")}>
                Actions
              </AccountsTableHeadCell>
            </AccountsTableHeadRow>
          </AccountsTableHead>
          <AccountsTableBody>
            {filtered.length === 0 ? (
              <AccountsTableEmpty
                colSpan={9}
                message={search ? "No bank accounts match your search." : "No bank accounts found. Add your first company bank account."}
                onClear={search ? () => setSearch("") : undefined}
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
                  <AccountsTableCell>
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
      </AccountsTableListing>
    </AccountsPageShell>
  );
}
