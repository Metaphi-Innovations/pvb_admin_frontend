"use client";

import React from "react";
import { formatMoney } from "@/lib/accounts/money-format";
import type { CoaGroupAccountingSummary } from "@/lib/accounts/coa-accounting-view";
import { MoneyCell } from "@/components/accounts/MoneyAmount";
import { CoaAccountingTransactionsTable } from "./CoaAccountingTransactionsTable";

function SummaryField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/40 bg-slate-50/40 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-0.5">{label}</p>
      <div className="text-sm text-foreground">{value}</div>
    </div>
  );
}

export function CoaGroupAccountingFooter({
  accounting,
  onSelectLedger,
  extraSummary,
  hideLedgerList,
}: {
  accounting: CoaGroupAccountingSummary;
  onSelectLedger?: (ledgerId: number) => void;
  extraSummary?: React.ReactNode;
  hideLedgerList?: boolean;
}) {
  return (
    <div className="flex flex-col border-t border-border/40">
      {extraSummary}
      <div className="px-4 py-3 border-b border-border/30 bg-white">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <SummaryField label="Total Balance" value={formatMoney(accounting.totalBalance)} />
          <SummaryField label="Ledger Count" value={accounting.ledgerCount} />
          <SummaryField label="Current Month Debit" value={formatMoney(accounting.monthDebit)} />
          <SummaryField label="Current Month Credit" value={formatMoney(accounting.monthCredit)} />
        </div>
      </div>
      {!hideLedgerList && accounting.ledgerRows.length > 0 && (
        <div className="border-b border-border/30">
          <p className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground bg-slate-50/50">
            Ledgers
          </p>
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80 border-b border-border/40">
              <tr>
                {["Ledger", "Opening", "Balance"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {accounting.ledgerRows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-border/30 hover:bg-orange-50/20 cursor-pointer"
                  onClick={() => onSelectLedger?.(r.id)}
                >
                  <td className="px-3 py-2 text-xs font-medium">{r.name}</td>
                  <MoneyCell amount={r.openingBalance} className="px-3 py-2" />
                  <MoneyCell amount={r.balance} className="px-3 py-2" />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex-1 min-h-0">
        <p className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground bg-slate-50/50 sticky top-0">
          Recent Transactions
        </p>
        <CoaAccountingTransactionsTable rows={accounting.recentTransactions} showRunningBalance={false} />
      </div>
    </div>
  );
}
