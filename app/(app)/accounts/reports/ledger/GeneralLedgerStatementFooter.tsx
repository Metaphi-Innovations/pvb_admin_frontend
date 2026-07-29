"use client";

import { formatBalanceAmount, formatMoney } from "@/lib/accounts/money-format";
import type { GeneralLedgerSummary } from "./general-ledger-data";
import {
  ACCOUNTS_REPORT_KPI_GRID_CLASS,
  ACCOUNTS_SUMMARY_LABEL_CLASS,
  ACCOUNTS_SUMMARY_VALUE_CLASS,
} from "@/lib/accounts/accounts-typography";
import { cn } from "@/lib/utils";

export function GeneralLedgerStatementFooter({ summary }: { summary: GeneralLedgerSummary }) {
  const balanced = summary.grandTotalDebit === summary.grandTotalCredit;
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
    { label: "Grand Total Debit", value: formatMoney(summary.grandTotalDebit), warn: !balanced },
    { label: "Grand Total Credit", value: formatMoney(summary.grandTotalCredit), warn: !balanced },
  ];

  return (
    <div
      className={cn(
        "flex-shrink-0 px-3 py-2 border-t border-border bg-muted/15",
        ACCOUNTS_REPORT_KPI_GRID_CLASS,
      )}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col justify-center px-2.5 py-1.5 rounded-md border border-border/50 bg-white min-h-[44px] min-w-0"
        >
          <p className={ACCOUNTS_SUMMARY_LABEL_CLASS}>{item.label}</p>
          <p className={cn(ACCOUNTS_SUMMARY_VALUE_CLASS, item.warn && "text-red-600")}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}
