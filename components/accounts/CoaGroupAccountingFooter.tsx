"use client";

import React, { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/accounts/money-format";
import type { CoaGroupAccountingSummary } from "@/lib/accounts/coa-accounting-view";
import { MoneyCell } from "@/components/accounts/MoneyAmount";
import { CoaAccountingTransactionsTable } from "./CoaAccountingTransactionsTable";

function SummaryField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/40 bg-slate-50/40 px-3 py-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-0.5">{label}</p>
      <div className="text-sm text-foreground">{value}</div>
    </div>
  );
}

export function CoaGroupAccountingFooter({
  accounting,
  onSelectLedger,
  extraSummary,
  hideLedgerList,
  showLedgerSearch = false,
}: {
  accounting: CoaGroupAccountingSummary;
  onSelectLedger?: (ledgerId: number) => void;
  extraSummary?: React.ReactNode;
  hideLedgerList?: boolean;
  /** Search bar above ledger table (Chart of Accounts group detail) */
  showLedgerSearch?: boolean;
}) {
  const [ledgerSearch, setLedgerSearch] = useState("");

  const filteredLedgerRows = useMemo(() => {
    const q = ledgerSearch.trim().toLowerCase();
    if (!q) return accounting.ledgerRows;
    return accounting.ledgerRows.filter((r) => r.name.toLowerCase().includes(q));
  }, [accounting.ledgerRows, ledgerSearch]);

  return (
    <div className="flex flex-col border-t border-border/40">
      {extraSummary}

      {showLedgerSearch && (
        <div className="flex-shrink-0 px-4 py-3 border-b border-border/30 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              className="h-9 pl-8 text-sm rounded-lg"
              placeholder="Search ledgers in this group…"
              value={ledgerSearch}
              onChange={(e) => setLedgerSearch(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="px-4 py-3 border-b border-border/30 bg-white">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <SummaryField label="Total Balance" value={formatMoney(accounting.totalBalance)} />
          <SummaryField label="Ledger Count" value={accounting.ledgerCount} />
          <SummaryField label="Current Month Debit" value={formatMoney(accounting.monthDebit)} />
          <SummaryField label="Current Month Credit" value={formatMoney(accounting.monthCredit)} />
        </div>
      </div>

      {!hideLedgerList && (
        <div className="border-b border-border/30">
          {accounting.ledgerRows.length === 0 ? (
            <p className="px-4 py-6 text-sm text-center text-muted-foreground">
              No ledgers under this group yet.
            </p>
          ) : filteredLedgerRows.length === 0 ? (
            <p className="px-4 py-6 text-sm text-center text-muted-foreground">
              No ledgers match your search.
            </p>
          ) : (
            <table className="accounts-table w-full">
              <thead className="border-b border-border/40">
                <tr>
                  {["Ledger", "Opening", "Balance"].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2.5 text-left text-xs font-semibold uppercase text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredLedgerRows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-border/30 hover:bg-orange-50/20 cursor-pointer"
                    onClick={() => onSelectLedger?.(r.id)}
                  >
                    <td className="px-3 py-2.5 text-xs font-medium">{r.name}</td>
                    <MoneyCell amount={r.openingBalance} className="px-3 py-2.5" />
                    <MoneyCell amount={r.balance} className="px-3 py-2.5" />
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className="flex-1 min-h-0">
        <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-white border-b border-border sticky top-0 z-10 shadow-sm">
          Recent Transactions
        </p>
        <CoaAccountingTransactionsTable rows={accounting.recentTransactions} showRunningBalance={false} />
      </div>
    </div>
  );
}
