"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { SectionTabs, StatusBadge } from "@/app/(app)/accounts/components/AccountsUI";
import { MoneyAmount, MoneyCell } from "@/components/accounts/MoneyAmount";
import { formatMoney } from "@/lib/accounts/money-format";
import { getBankAccountById } from "@/lib/accounts/bank-accounts-data";
import { formatBankAccountMaster } from "@/lib/accounts/bank-account-display";
import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import { computeLedgerCurrentBalance } from "@/app/(app)/accounts/masters/ledgers/ledgers-utils";
import {
  buildLedgerStatement,
  collectLedgerTransactions,
} from "@/lib/accounts/ledger-detail-utils";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "transactions", label: "Transactions" },
  { id: "bankbook", label: "Bank Book" },
  { id: "reconciliation", label: "Reconciliation" },
  { id: "statement", label: "Ledger Statement" },
];

export default function BankAccountDetailClient({ accountId }: { accountId: number }) {
  const router = useRouter();
  const [tab, setTab] = useState("overview");

  const account = useMemo(() => getBankAccountById(accountId), [accountId]);
  const ledger = useMemo(() => {
    if (!account) return null;
    return loadChartOfAccounts().find((r) => r.id === account.coaLedgerId) ?? null;
  }, [account]);

  const balance = useMemo(
    () => (ledger ? computeLedgerCurrentBalance(ledger) : { amount: 0, balanceType: "Debit" as const }),
    [ledger],
  );

  const transactions = useMemo(
    () => (ledger ? collectLedgerTransactions(ledger.id) : []),
    [ledger],
  );

  const statement = useMemo(
    () => (ledger ? buildLedgerStatement(ledger, transactions) : []),
    [ledger, transactions],
  );

  if (!account || !ledger) {
    return (
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Banking", "Bank Accounts", "/accounts/banking/bank-accounts")}
        title="Account not found"
        description="This bank account may have been removed."
      >
        <div className="p-8 text-center text-sm text-muted-foreground">
          <Link href="/accounts/banking/bank-accounts" className="text-brand-600 hover:underline">
            Back to Bank Accounts
          </Link>
        </div>
      </AccountsPageShell>
    );
  }

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Banking", "Bank Accounts", "/accounts/banking/bank-accounts")}
      title={formatBankAccountMaster(account)}
      description={account.bankName}
      actions={
        <button
          type="button"
          onClick={() =>
            router.push(`/accounts/masters/chart-of-accounts?node=${ledger.id}`)
          }
          className="h-8 px-3 text-xs border border-border rounded-lg hover:bg-muted/40"
        >
          Open in COA
        </button>
      }
      layout="split"
    >
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 border-b border-border/60 bg-muted/10">
          <div className="rounded-lg border border-border/40 bg-white px-3 py-2">
            <p className="text-[10px] uppercase text-muted-foreground">Current Balance</p>
            <MoneyAmount amount={balance.amount} side={balance.balanceType} className="text-sm font-semibold mt-1" />
          </div>
          <div className="rounded-lg border border-border/40 bg-white px-3 py-2">
            <p className="text-[10px] uppercase text-muted-foreground">Opening Balance</p>
            <p className="text-sm font-semibold mt-1 tabular-nums">{formatMoney(account.openingBalance)}</p>
          </div>
          <div className="rounded-lg border border-border/40 bg-white px-3 py-2">
            <p className="text-[10px] uppercase text-muted-foreground">Reconciliation</p>
            <p className="text-sm font-semibold mt-1 capitalize">{account.reconciliationStatus}</p>
          </div>
          <div className="rounded-lg border border-border/40 bg-white px-3 py-2">
            <p className="text-[10px] uppercase text-muted-foreground">Status</p>
            <div className="mt-1"><StatusBadge status={account.status} /></div>
          </div>
        </div>
        <div className="flex-shrink-0 px-4 border-b border-border/60">
          <SectionTabs tabs={TABS} active={tab} onChange={setTab} />
        </div>
        <div className="flex-1 overflow-auto min-h-0">
          {tab === "overview" && (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl">
              {[
                ["Bank Name", account.bankName],
                ["Account Nickname", account.accountNickname],
                ["Account Number", account.accountNumber],
                ["IFSC", account.ifsc || "—"],
                ["Branch", account.branchName || "—"],
                ["Account Type", account.accountType],
                ["COA Ledger", ledger.accountName],
                ["Reconciliation Enabled", account.reconciliationEnabled ? "Yes" : "No"],
                ["Default Receipts", account.defaultForReceipts ? "Yes" : "No"],
                ["Default Payments", account.defaultForPayments ? "Yes" : "No"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-border/40 bg-slate-50/40 px-3 py-2.5">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                  <p className="text-sm mt-1">{value}</p>
                </div>
              ))}
            </div>
          )}
          {(tab === "transactions" || tab === "bankbook") && (
            <table className="accounts-table w-full text-xs min-w-[720px]">
              <thead className="border-b">
                <tr>
                  {["Date", "Voucher Type", "Voucher No", "Particulars", "Debit", "Credit"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase text-[10px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map((row) => (
                  <tr key={row.id} className="border-b border-border/30 hover:bg-brand-50/20">
                    <td className="px-3 py-2">{row.date}</td>
                    <td className="px-3 py-2">{row.voucherType}</td>
                    <td className="px-3 py-2">{row.voucherNo}</td>
                    <td className="px-3 py-2">{row.particulars}</td>
                    <MoneyCell amount={row.debit} dashIfZero className="px-3 py-2" />
                    <MoneyCell amount={row.credit} dashIfZero className="px-3 py-2" />
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {tab === "reconciliation" && (
            <div className="p-6 space-y-3">
              <p className="text-sm text-muted-foreground">
                Reconciliation status: <span className="font-medium capitalize text-foreground">{account.reconciliationStatus}</span>
              </p>
              {account.reconciliationEnabled ? (
                <Link
                  href="/accounts/banking/reconciliation"
                  className="inline-flex h-8 items-center px-3 text-xs border border-border rounded-lg hover:bg-muted/40 text-brand-700"
                >
                  Open Bank Reconciliation →
                </Link>
              ) : (
                <p className="text-xs text-muted-foreground">Reconciliation is disabled for this account.</p>
              )}
            </div>
          )}
          {tab === "statement" && (
            <table className="accounts-table w-full text-xs min-w-[800px]">
              <thead className="border-b">
                <tr>
                  {["Date", "Voucher Type", "Voucher No", "Particulars", "Debit", "Credit", "Running Balance"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase text-[10px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {statement.map((row, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="px-3 py-2">{row.date}</td>
                    <td className="px-3 py-2">{row.voucherType}</td>
                    <td className="px-3 py-2">{row.voucherNo}</td>
                    <td className="px-3 py-2">{row.particulars}</td>
                    <MoneyCell amount={row.debit} dashIfZero className="px-3 py-2" />
                    <MoneyCell amount={row.credit} dashIfZero className="px-3 py-2" />
                    <td className="px-3 py-2 text-right font-medium">
                      {formatMoney(row.runningBalance)} {row.balanceType === "Debit" ? "Dr" : "Cr"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AccountsPageShell>
  );
}
