"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Eye, MoreVertical, Pencil, Plus, Search } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
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

export default function BankAccountsPageClient() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

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
      const balance = ledger ? computeLedgerCurrentBalance(ledger) : { amount: account.openingBalance, balanceType: account.balanceType };
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
      layout="split"
    >
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-shrink-0 px-4 py-3 border-b border-border/60 bg-muted/10 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              className="h-8 pl-8 text-xs"
              placeholder="Search bank, account no., IFSC…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <p className="text-[11px] text-muted-foreground hidden sm:block">
            <span className="font-medium text-foreground">{filtered.length}</span> of{" "}
            <span className="font-medium text-foreground">{rows.length}</span> accounts
            {activeCount !== rows.length && (
              <span> · {activeCount} active</span>
            )}
          </p>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    {[
                      "Bank Name",
                      "Account No.",
                      "IFSC",
                      "Branch",
                      "Account Type",
                      "Opening Balance",
                      "Current Balance",
                      "Status",
                      "",
                    ].map((h) => (
                      <th
                        key={h || "actions"}
                        className="px-4 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-14 text-center">
                        <p className="text-sm font-medium text-foreground">No bank accounts found</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {search ? "Try clearing your search." : "Add your first company bank account."}
                        </p>
                        {!search && (
                          <button
                            type="button"
                            onClick={() => router.push("/accounts/banking/bank-accounts/new")}
                            className="text-xs text-brand-600 hover:underline mt-2"
                          >
                            + Add Bank Account
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((account) => (
                      <tr
                        key={account.id}
                        className="border-b border-border/60 hover:bg-muted/20 transition-colors group"
                      >
                        <td className="px-4 py-2 text-xs font-semibold text-foreground whitespace-nowrap">
                          {account.bankName}
                        </td>
                        <td className="px-4 py-2 text-xs font-mono text-brand-700 whitespace-nowrap">
                          {account.accountNumber || "—"}
                        </td>
                        <td className="px-4 py-2 text-xs font-mono whitespace-nowrap">{account.ifsc || "—"}</td>
                        <td className="px-4 py-2 text-xs whitespace-nowrap">{account.branchName || "—"}</td>
                        <td className="px-4 py-2 text-xs whitespace-nowrap">{account.accountType}</td>
                        <td className="px-4 py-2 text-xs whitespace-nowrap tabular-nums">
                          <MoneyAmount
                            amount={account.openingBalance}
                            side={account.balanceType}
                            className="text-xs"
                          />
                        </td>
                        <td className="px-4 py-2 text-xs whitespace-nowrap tabular-nums">
                          <MoneyAmount
                            amount={account.currentBalance}
                            side={account.balanceType}
                            className="text-xs"
                          />
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <StatusBadge status={account.status} />
                        </td>
                        <td className="px-4 py-2 w-10">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="p-1.5 hover:bg-muted rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="w-4 h-4 text-muted-foreground" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-widest py-1">
                                Actions
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-xs gap-2"
                                onClick={() => router.push(`/accounts/banking/bank-accounts/${account.id}`)}
                              >
                                <Eye className="w-3.5 h-3.5" /> View
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-xs gap-2"
                                onClick={() =>
                                  router.push(`/accounts/banking/bank-accounts/${account.id}/edit`)
                                }
                              >
                                <Pencil className="w-3.5 h-3.5" /> Edit
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {filtered.length > 0 && (
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-muted/20">
                <p className="text-[11px] text-muted-foreground">
                  Showing <span className="font-medium text-foreground">{filtered.length}</span> of{" "}
                  <span className="font-medium text-foreground">{rows.length}</span> bank accounts
                </p>
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  Total current balance:{" "}
                  <span className="font-medium text-foreground">
                    {formatMoney(filtered.reduce((s, r) => s + r.currentBalance, 0))}
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AccountsPageShell>
  );
}
