"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { MoneyAmount } from "@/components/accounts/MoneyAmount";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { StatusBadge } from "@/app/(app)/accounts/components/AccountsUI";
import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import { getLedgersUnderSubGroupName } from "@/lib/accounts/coa-hierarchy";
import { computeLedgerCurrentBalance } from "@/app/(app)/accounts/masters/ledgers/ledgers-utils";
import { resolveLedgerType } from "@/lib/accounts/ledger-detail-utils";

export default function InventoryLedgerPageClient() {
  const router = useRouter();
  const records = useMemo(() => loadChartOfAccounts(), []);
  const ledgers = useMemo(
    () => getLedgersUnderSubGroupName("Inventory / Stock-in-Hand", records),
    [records],
  );

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Inventory", "Inventory Ledger")}
      title="Inventory Ledger"
      description="View stock-related ledgers under Chart of Accounts. Create items from Inventory → Items."
      actions={
        <Button asChild variant="outline" size="sm" className="h-8 text-xs">
          <Link href="/accounts/masters/chart-of-accounts">View in Chart of Accounts</Link>
        </Button>
      }
      layout="standard"
    >
      <div className="rounded-xl border border-border/50 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/20 border-b border-border/60">
            <tr>
              {["Ledger Code", "Ledger Name", "Type", "Opening Balance", "Current Balance", "Status"].map((h) => (
                <th
                  key={h}
                  className={`px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground ${
                    h.includes("Balance") ? "text-right" : "text-left"
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ledgers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  No inventory ledgers yet. Stock postings will appear here when items and stock opening are configured.
                </td>
              </tr>
            ) : (
              ledgers.map((l) => {
                const bal = computeLedgerCurrentBalance(l);
                return (
                  <tr
                    key={l.id}
                    className="border-b border-border/40 hover:bg-brand-50/30 cursor-pointer"
                    onClick={() => router.push(`/accounts/masters/ledgers/${l.id}`)}
                  >
                    <td className="px-4 py-3 text-xs font-mono">{l.accountCode}</td>
                    <td className="px-4 py-3 text-sm font-medium">{l.accountName}</td>
                    <td className="px-4 py-3 text-xs">{resolveLedgerType(l, records)}</td>
                    <td className="px-4 py-3 text-right">
                      <MoneyAmount amount={l.openingBalance} side={l.balanceType} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <MoneyAmount amount={bal.amount} side={bal.balanceType} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={l.status} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </AccountsPageShell>
  );
}
