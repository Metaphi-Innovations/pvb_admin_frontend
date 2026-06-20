"use client";

import React from "react";
import { MoneyCell } from "@/components/accounts/MoneyAmount";
import type { CoaTransactionRow } from "@/lib/accounts/coa-accounting-view";

export function CoaAccountingTransactionsTable({
  rows,
  emptyLabel = "No transactions yet.",
  showRunningBalance = true,
}: {
  rows: CoaTransactionRow[];
  emptyLabel?: string;
  showRunningBalance?: boolean;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center px-4">{emptyLabel}</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-50/80 border-b border-border/40 sticky top-0 z-10">
        <tr>
          {["Date", "Voucher No", "Voucher Type", "Narration", "Debit", "Credit", ...(showRunningBalance ? ["Running Balance"] : [])].map(
            (h) => (
              <th
                key={h}
                className={`px-3 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground whitespace-nowrap ${
                  h === "Debit" || h === "Credit" || h === "Running Balance" ? "text-right" : ""
                }`}
              >
                {h}
              </th>
            ),
          )}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={`${r.voucherNo}-${r.date}-${i}`} className="border-b border-border/30 hover:bg-orange-50/20">
            <td className="px-3 py-2 text-xs whitespace-nowrap">{r.date}</td>
            <td className="px-3 py-2 text-xs font-medium">{r.voucherNo}</td>
            <td className="px-3 py-2 text-xs capitalize">{r.voucherType}</td>
            <td className="px-3 py-2 text-xs text-muted-foreground max-w-[200px] truncate">{r.narration}</td>
            <MoneyCell amount={r.debit} dashIfZero className="px-3 py-2" />
            <MoneyCell amount={r.credit} dashIfZero className="px-3 py-2" />
            {showRunningBalance && <MoneyCell amount={r.runningBalance} className="px-3 py-2" />}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
