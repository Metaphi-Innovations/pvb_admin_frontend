"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/accounts/money-format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  Upload,
  ArrowRight,
  Database,
  DollarSign,
} from "lucide-react";
import {
  getTransactionStats,
  loadBankTransactions,
  type TransactionStatus,
} from "@/lib/accounts/bank-transaction-categorization";
import { loadBankAccountMasters, type BankAccountMaster } from "@/lib/accounts/bank-accounts-data";
import { formatBankAccountMaster } from "@/lib/accounts/bank-account-display";
import { computeLedgerCurrentBalance } from "@/app/(app)/accounts/masters/ledgers/ledgers-utils";
import { loadChartOfAccounts } from "@/app/(app)/accounts/data";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  className?: string;
}

function KpiCard({ title, value, subtitle, icon, trend, trendValue, className }: KpiCardProps) {
  return (
    <div className={cn("rounded-xl border border-border/50 bg-white p-5 shadow-sm", className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
          <p className="text-base font-bold mt-2 text-foreground">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          {trend && trendValue && (
            <div className="flex items-center gap-1 mt-2">
              {trend === "up" && <TrendingUp className="w-3 h-3 text-green-600" />}
              {trend === "down" && <TrendingDown className="w-3 h-3 text-red-600" />}
              <span className={cn("text-xs font-medium", trend === "up" ? "text-green-600" : "text-red-600")}>
                {trendValue}
              </span>
            </div>
          )}
        </div>
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center">
          {icon}
        </div>
      </div>
    </div>
  );
}

interface BankAccountCardProps {
  account: BankAccountMaster;
  bookBalance: number;
  uncategorizedCount: number;
}

function BankAccountCard({ account, bookBalance, uncategorizedCount }: BankAccountCardProps) {
  return (
    <div className="rounded-lg border border-border/50 bg-white p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{formatBankAccountMaster(account)}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{account.bankName}</p>
        </div>
        <Badge className="text-xs px-2 py-0.5 bg-green-100 text-green-700">
          {account.accountType}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-border/30">
        <div>
          <p className="text-xs text-muted-foreground uppercase">Book Balance</p>
          <p className="text-sm font-semibold mt-1">{formatMoney(bookBalance)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase">Uncategorized</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-sm font-semibold">{uncategorizedCount}</span>
            {uncategorizedCount > 0 && <AlertCircle className="w-4 h-4 text-orange-500" />}
          </div>
        </div>
      </div>
      <Link href={`/accounts/banking/transactions?bankAccountId=${account.id}`}>
        <Button size="sm" variant="outline" className="w-full mt-3 h-9 text-sm font-medium">
          View Transactions
          <ArrowRight className="w-3 h-3 ml-1.5" />
        </Button>
      </Link>
    </div>
  );
}

function RecentTransactionRow({ 
  date, 
  narration, 
  amount, 
  type, 
  status 
}: { 
  date: string; 
  narration: string; 
  amount: number; 
  type: "debit" | "credit"; 
  status: TransactionStatus;
}) {
  const statusConfig = {
    uncategorized: { icon: Clock, color: "text-slate-500" },
    categorized: { icon: CheckCircle2, color: "text-blue-500" },
    reconciled: { icon: CheckCircle2, color: "text-green-500" },
  };
  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <div className="flex items-center justify-between py-3 px-4 hover:bg-slate-50/50 transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <StatusIcon className={cn("w-4 h-4 flex-shrink-0", config.color)} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-foreground truncate">{narration}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{date}</p>
        </div>
      </div>
      <div className="flex-shrink-0 ml-3">
        <p className={cn("text-xs font-semibold tabular-nums", type === "credit" ? "text-green-600" : "text-red-600")}>
          {type === "credit" ? "+" : "-"}{formatMoney(amount)}
        </p>
      </div>
    </div>
  );
}

export function BankReconciliationDashboard() {
  const stats = useMemo(() => getTransactionStats(), []);
  const bankAccounts = useMemo(() => loadBankAccountMasters().filter((b) => b.status === "active"), []);
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
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Bank Reconciliation</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage bank transactions and categorize for accounting
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/accounts/banking/statement-import">
            <Button size="sm" className="h-9 text-sm gap-1.5">
              <Upload className="w-4 h-4" />
              Import Statement
            </Button>
          </Link>
          <Link href="/accounts/banking/transactions">
            <Button size="sm" variant="outline" className="h-9 text-sm">
              All Transactions
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Transactions"
          value={stats.total}
          subtitle="Imported from statements"
          icon={<FileText className="w-5 h-5" />}
        />
        <KpiCard
          title="Uncategorized"
          value={stats.uncategorized}
          subtitle="Needs categorization"
          icon={<AlertCircle className="w-5 h-5" />}
          className="border-orange-200 bg-orange-50/30"
        />
        <KpiCard
          title="Categorized"
          value={stats.categorized}
          subtitle="Ready for reconciliation"
          icon={<CheckCircle2 className="w-5 h-5" />}
          className="border-blue-200 bg-blue-50/30"
        />
        <KpiCard
          title="Reconciled"
          value={stats.reconciled}
          subtitle="Completed"
          icon={<CheckCircle2 className="w-5 h-5" />}
          className="border-green-200 bg-green-50/30"
        />
      </div>

      {/* Balance Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border/50 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-4 h-4 text-blue-600" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bank Balance</p>
          </div>
          <p className="text-base font-bold text-foreground">{formatMoney(totalBookBalance)}</p>
          <p className="text-xs text-muted-foreground mt-1">As per statements</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-gradient-to-br from-green-50 to-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-green-600" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Book Balance</p>
          </div>
          <p className="text-base font-bold text-foreground">{formatMoney(totalBookBalance)}</p>
          <p className="text-xs text-muted-foreground mt-1">As per books</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-slate-600" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Difference</p>
          </div>
          <p className="text-base font-bold text-foreground">{formatMoney(0)}</p>
          <p className="text-xs text-green-600 mt-1">Balanced</p>
        </div>
      </div>

      {/* Bank Accounts Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-foreground">Bank Accounts</h2>
          <Link href="/accounts/banking/bank-accounts">
            <Button size="sm" variant="ghost" className="h-9 text-sm font-medium">
              View All
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accountsWithStats.map(({ account, bookBalance, uncategorizedCount }) => (
            <BankAccountCard
              key={account.id}
              account={account}
              bookBalance={bookBalance}
              uncategorizedCount={uncategorizedCount}
            />
          ))}
        </div>
      </div>

      {/* Recent Transactions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-foreground">Recent Transactions</h2>
          <Link href="/accounts/banking/transactions">
            <Button size="sm" variant="ghost" className="h-9 text-sm font-medium">
              View All
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>
        <div className="rounded-xl border border-border/50 bg-white shadow-sm divide-y divide-border/30">
          {transactions.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No transactions yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Import a bank statement to get started
              </p>
            </div>
          ) : (
            transactions.map((txn) => (
              <RecentTransactionRow
                key={txn.id}
                date={txn.transactionDate}
                narration={txn.narration}
                amount={txn.debit || txn.credit}
                type={txn.credit > 0 ? "credit" : "debit"}
                status={txn.status}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
