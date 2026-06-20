"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Landmark } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { MoneyAmount } from "@/components/accounts/MoneyAmount";
import { StatusBadge } from "@/app/(app)/accounts/components/AccountsUI";
import { formatMoney } from "@/lib/accounts/money-format";
import { formatBankAccountMaster } from "@/lib/accounts/bank-account-display";
import {
  computeBankGroupSummaries,
  loadBankAccounts,
  type BankAccountMaster,
} from "@/lib/accounts/bank-accounts-data";
import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import { computeLedgerCurrentBalance } from "@/app/(app)/accounts/masters/ledgers/ledgers-utils";
import { ensureBankingDemoOnPageLoad } from "@/lib/accounts/banking-demo-seed";

export default function BankAccountsPageClient() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    ensureBankingDemoOnPageLoad();
    loadBankAccounts();
    setRefreshKey((k) => k + 1);
  }, []);

  const groups = useMemo(() => {
    void refreshKey;
    return computeBankGroupSummaries();
  }, [refreshKey]);

  const accounts = useMemo(() => {
    void refreshKey;
    return loadBankAccounts();
  }, [refreshKey]);

  const records = useMemo(() => loadChartOfAccounts(), [refreshKey]);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => {
      if (g.bankName.toLowerCase().includes(q)) return true;
      return accounts.some(
        (a) =>
          a.bankGroupCoaId === g.bankGroupCoaId &&
          (a.accountNickname.toLowerCase().includes(q) ||
            a.accountNumber.includes(q)),
      );
    });
  }, [groups, accounts, search]);

  const accountRows = (groupId: number): (BankAccountMaster & { balance: number })[] => {
    return accounts
      .filter((a) => a.bankGroupCoaId === groupId)
      .map((a) => {
        const ledger = records.find((r) => r.id === a.coaLedgerId);
        const balance = ledger ? computeLedgerCurrentBalance(ledger).amount : a.openingBalance;
        return { ...a, balance };
      });
  };

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Banking", "Bank Accounts")}
      title="Bank Accounts"
      description="Bank-wise grouped accounts linked to Chart of Accounts. Posting happens on account ledgers only."
      actions={
        <Button
          size="sm"
          className="h-8 text-xs bg-brand-600 text-white gap-1"
          onClick={() => router.push("/accounts/banking/bank-accounts/new")}
        >
          <Plus className="w-3.5 h-3.5" /> Add Bank Account
        </Button>
      }
      layout="split"
    >
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-shrink-0 px-4 py-3 border-b border-border/60 bg-muted/10 flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              className="h-8 pl-8 text-xs"
              placeholder="Search bank or account…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {filteredGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              No bank groups yet. Add a bank account to create HDFC, ICICI, or other bank groups automatically.
            </p>
          ) : (
            filteredGroups.map((group) => {
              const rows = accountRows(group.bankGroupCoaId);
              return (
                <div
                  key={group.bankGroupCoaId}
                  className="rounded-xl border border-border/60 bg-white shadow-sm overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() =>
                      router.push(`/accounts/banking/bank-accounts/bank/${group.bankGroupCoaId}`)
                    }
                    className="w-full flex items-center justify-between gap-4 px-4 py-3 bg-slate-50/80 border-b border-border/40 hover:bg-brand-50/30 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
                        <Landmark className="w-4 h-4 text-brand-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{group.bankName}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {group.accountCount} account{group.accountCount !== 1 ? "s" : ""}
                          {group.unreconciledCount > 0
                            ? ` · ${group.unreconciledCount} unreconciled`
                            : ""}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[10px] uppercase text-muted-foreground">Total Balance</p>
                      <p className="text-sm font-semibold tabular-nums">{formatMoney(group.totalBalance)}</p>
                    </div>
                  </button>
                  <table className="w-full text-xs">
                    <thead className="bg-muted/15 border-b border-border/40">
                      <tr>
                        {["Account", "Account No.", "Type", "Balance", "Recon", "Status"].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((a) => (
                        <tr
                          key={a.id}
                          className="border-b border-border/30 hover:bg-brand-50/20 cursor-pointer"
                          onClick={() => router.push(`/accounts/banking/bank-accounts/${a.id}`)}
                        >
                          <td className="px-4 py-2.5 font-medium">{formatBankAccountMaster(a)}</td>
                          <td className="px-4 py-2.5 font-mono">{a.accountNumber || "—"}</td>
                          <td className="px-4 py-2.5">{a.accountType}</td>
                          <td className="px-4 py-2.5">
                            <MoneyAmount amount={a.balance} side="Debit" className="text-xs" />
                          </td>
                          <td className="px-4 py-2.5 capitalize">{a.reconciliationStatus}</td>
                          <td className="px-4 py-2.5">
                            <StatusBadge status={a.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-4 py-2 border-t border-border/30 bg-muted/5 flex justify-end">
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[11px] text-brand-700"
                    >
                      <Link href={`/accounts/banking/bank-accounts/bank/${group.bankGroupCoaId}`}>
                        View all {group.bankName} accounts →
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </AccountsPageShell>
  );
}
