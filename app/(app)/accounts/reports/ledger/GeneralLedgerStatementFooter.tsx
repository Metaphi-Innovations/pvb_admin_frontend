"use client";

import { formatBalanceAmount, formatMoney } from "@/lib/accounts/money-format";
import type { GeneralLedgerSummary } from "./general-ledger-data";

export function GeneralLedgerStatementFooter({ summary }: { summary: GeneralLedgerSummary }) {
  const items = [
    {
      label: "Opening Balance",
      value: formatBalanceAmount(summary.openingBalance, summary.openingBalanceType),
    },
    { label: "Total Debit", value: formatMoney(summary.totalDebit) },
    { label: "Total Credit", value: formatMoney(summary.totalCredit) },
    {
      label: "Closing Balance",
      value: formatBalanceAmount(summary.closingBalance, summary.closingBalanceType),
    },
    {
      label: "Current Balance",
      value: formatBalanceAmount(summary.currentBalance, summary.currentBalanceType),
    },
  ];

  return (
    <div className="flex-shrink-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 px-3 py-2 border-t border-border bg-muted/15">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col justify-center px-2.5 py-1.5 rounded-md border border-border/50 bg-white min-h-[40px]"
        >
          <p className="text-xs font-medium text-muted-foreground leading-none">{item.label}</p>
          <p className="text-xs font-bold tabular-nums text-foreground mt-0.5 truncate">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
