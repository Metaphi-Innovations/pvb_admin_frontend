"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/accounts/money-format";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Upload, ArrowRight } from "lucide-react";
import {
  getTransactionStats,
  loadBankTransactions,
  type TransactionStatus,
} from "@/lib/accounts/bank-transaction-categorization";
import { loadBankAccountMasters } from "@/lib/accounts/bank-accounts-data";
import { formatBankAccountMaster } from "@/lib/accounts/bank-account-display";
import { computeLedgerCurrentBalance } from "@/app/(app)/accounts/masters/ledgers/ledgers-utils";
import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsListingTableCard } from "@/components/accounts/AccountsListingHeader";
import { AccountsSummaryCards } from "@/components/accounts/AccountsSummaryCards";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableHead,
  AccountsTableHeadRow,
  AccountsTableRow,
  AccountsTableScroll,
} from "@/components/accounts/AccountsTable";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { ACCOUNTS_ACTION_BUTTON_CLASS } from "@/lib/accounts/accounts-typography";

const STATUS_LABEL: Record<TransactionStatus, string> = {
  uncategorized: "Uncategorized",
  categorized: "Categorized",
  reconciled: "Reconciled",
};

export function BankReconciliationDashboard() {
  const stats = useMemo(() => getTransactionStats(), []);
  const bankAccounts = useMemo(
    () => loadBankAccountMasters().filter((b) => b.status === "active"),
    [],
  );
  const transactions = useMemo(() => loadBankTransactions().slice(0, 10), []);
  const coaRecords = useMemo(() => loadChartOfAccounts(), []);

  const accountsWithStats = useMemo(() => {
    return bankAccounts.map((account) => {
      const ledger = coaRecords.find((r) => r.id === account.coaLedgerId);
      const bookBalance = ledger ? computeLedgerCurrentBalance(ledger).amount : 0;
      const accountStats = getTransactionStats(account.id);
      return {
        account,
        bookBalance,
        uncategorizedCount: accountStats.uncategorized,
      };
    });
  }, [bankAccounts, coaRecords]);

  const totalBookBalance = accountsWithStats.reduce((sum, a) => sum + a.bookBalance, 0);

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Banking", "Bank Reconciliation", "/accounts/banking/reconciliation")}
      title="Bank Reconciliation"
      description="Manage bank transactions and categorize for accounting."
      layout="split"
      className="h-full min-h-0"
      actions={
        <div className="flex items-center gap-1.5">
          <Button asChild size="sm" className={cn(ACCOUNTS_ACTION_BUTTON_CLASS, "bg-brand-600 hover:bg-brand-700 text-white border-0")}>
            <Link href="/accounts/banking/statement-import">
              <Upload className="w-3.5 h-3.5" />
              Import Statement
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className={ACCOUNTS_ACTION_BUTTON_CLASS}>
            <Link href="/accounts/banking/transactions">All Transactions</Link>
          </Button>
        </div>
      }
    >
      <AccountsListingTableCard className="flex-1 min-h-0">
        <AccountsSummaryCards
          items={[
            { label: "Total Transactions", value: String(stats.total) },
            {
              label: "Uncategorized",
              value: String(stats.uncategorized),
              warn: stats.uncategorized > 0,
            },
            { label: "Categorized", value: String(stats.categorized) },
            { label: "Reconciled", value: String(stats.reconciled) },
            { label: "Book Balance", value: formatMoney(totalBookBalance) },
            { label: "Difference", value: formatMoney(0) },
          ]}
        />

        <div className="flex-shrink-0 px-3 py-1.5 border-b border-[#E5E7EB] flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-foreground">Bank Accounts</p>
          <Button asChild size="sm" variant="ghost" className={cn(ACCOUNTS_ACTION_BUTTON_CLASS, "h-7 px-2")}>
            <Link href="/accounts/banking/bank-accounts">
              View All
              <ArrowRight className="w-3 h-3" />
            </Link>
          </Button>
        </div>

        <AccountsTableScroll className="max-h-[220px] flex-none">
          <AccountsTable minWidth={720}>
            <AccountsTableHead>
              <AccountsTableHeadRow>
                <th>Account</th>
                <th>Bank</th>
                <th>Type</th>
                <th className="text-right">Book Balance</th>
                <th className="text-right">Uncategorized</th>
                <th className="text-right">Action</th>
              </AccountsTableHeadRow>
            </AccountsTableHead>
            <AccountsTableBody>
              {accountsWithStats.length === 0 ? (
                <AccountsTableRow>
                  <AccountsTableCell colSpan={6} className="accounts-table-empty">
                    No active bank accounts.
                  </AccountsTableCell>
                </AccountsTableRow>
              ) : (
                accountsWithStats.map(({ account, bookBalance, uncategorizedCount }) => (
                  <AccountsTableRow key={account.id}>
                    <AccountsTableCell>
                      <span className="text-xs font-medium">{formatBankAccountMaster(account)}</span>
                    </AccountsTableCell>
                    <AccountsTableCell>
                      <span className="text-xs text-muted-foreground">{account.bankName}</span>
                    </AccountsTableCell>
                    <AccountsTableCell>
                      <span className="text-xs">{account.accountType}</span>
                    </AccountsTableCell>
                    <AccountsTableCell align="right">
                      <span className="tabular-nums text-xs">{formatMoney(bookBalance)}</span>
                    </AccountsTableCell>
                    <AccountsTableCell align="right">
                      <span
                        className={cn(
                          "tabular-nums text-xs",
                          uncategorizedCount > 0 && "text-amber-700 font-semibold",
                        )}
                      >
                        {uncategorizedCount}
                      </span>
                    </AccountsTableCell>
                    <AccountsTableCell align="right">
                      <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs text-brand-700">
                        <Link href={`/accounts/banking/transactions?bankAccountId=${account.id}`}>
                          View
                        </Link>
                      </Button>
                    </AccountsTableCell>
                  </AccountsTableRow>
                ))
              )}
            </AccountsTableBody>
          </AccountsTable>
        </AccountsTableScroll>

        <div className="flex-shrink-0 px-3 py-1.5 border-y border-[#E5E7EB] flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-foreground">Recent Transactions</p>
          <Button asChild size="sm" variant="ghost" className={cn(ACCOUNTS_ACTION_BUTTON_CLASS, "h-7 px-2")}>
            <Link href="/accounts/banking/transactions">
              View All
              <ArrowRight className="w-3 h-3" />
            </Link>
          </Button>
        </div>

        <AccountsTableScroll className="flex-1 min-h-0">
          <AccountsTable minWidth={640}>
            <AccountsTableHead>
              <AccountsTableHeadRow>
                <th>Date</th>
                <th>Narration</th>
                <th>Status</th>
                <th className="text-right">Amount</th>
              </AccountsTableHeadRow>
            </AccountsTableHead>
            <AccountsTableBody>
              {transactions.length === 0 ? (
                <AccountsTableRow>
                  <AccountsTableCell colSpan={4} className="accounts-table-empty">
                    No transactions yet. Import a bank statement to get started.
                  </AccountsTableCell>
                </AccountsTableRow>
              ) : (
                transactions.map((txn) => {
                  const type = txn.credit > 0 ? "credit" : "debit";
                  const amount = txn.debit || txn.credit;
                  return (
                    <AccountsTableRow key={txn.id}>
                      <AccountsTableCell>
                        <span className="text-xs tabular-nums">{txn.transactionDate}</span>
                      </AccountsTableCell>
                      <AccountsTableCell>
                        <span className="text-xs truncate max-w-[280px] inline-block align-bottom">
                          {txn.narration}
                        </span>
                      </AccountsTableCell>
                      <AccountsTableCell>
                        <span className="text-xs text-muted-foreground">
                          {STATUS_LABEL[txn.status]}
                        </span>
                      </AccountsTableCell>
                      <AccountsTableCell align="right">
                        <span
                          className={cn(
                            "text-xs font-semibold tabular-nums",
                            type === "credit" ? "text-emerald-600" : "text-red-600",
                          )}
                        >
                          {type === "credit" ? "+" : "-"}
                          {formatMoney(amount)}
                        </span>
                      </AccountsTableCell>
                    </AccountsTableRow>
                  );
                })
              )}
            </AccountsTableBody>
          </AccountsTable>
        </AccountsTableScroll>
      </AccountsListingTableCard>
    </AccountsPageShell>
  );
}
