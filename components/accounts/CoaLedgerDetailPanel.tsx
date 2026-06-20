"use client";

import React, { useMemo } from "react";
import { formatMoney } from "@/lib/accounts/money-format";
import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { buildLedgerAccountingSummary } from "@/lib/accounts/coa-accounting-view";
import { MoneyAmount } from "@/components/accounts/MoneyAmount";
import { CoaAccountingTransactionsTable } from "./CoaAccountingTransactionsTable";
import { CoaMasterLinkActions } from "./CoaMasterLinkPanel";
import type { CoaMasterLink } from "@/lib/accounts/coa-master-link";

function Kpi({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/40 bg-slate-50/40 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-0.5">{label}</p>
      <div className="text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

export function CoaLedgerDetailPanel({
  ledger,
  records,
  masterLink,
  topSlot,
}: {
  ledger: ChartOfAccount;
  records: ChartOfAccount[];
  masterLink?: CoaMasterLink | null;
  topSlot?: React.ReactNode;
}) {
  const summary = useMemo(() => buildLedgerAccountingSummary(ledger, records), [ledger, records]);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {topSlot}
      <div className="flex-shrink-0 px-4 py-3 border-b border-border/40 bg-brand-50/10">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <Kpi label="Opening Balance" value={formatMoney(summary.openingBalance)} />
          <Kpi
            label="Current Balance"
            value={<MoneyAmount amount={summary.currentBalance} side={summary.balanceType} className="text-sm" />}
          />
          <Kpi label="Total Debit" value={formatMoney(summary.totalDebit)} />
          <Kpi label="Total Credit" value={formatMoney(summary.totalCredit)} />
          {masterLink && (
            <div className="flex items-end">
              <CoaMasterLinkActions ledgerId={ledger.id} link={masterLink} />
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-auto min-h-0">
        <CoaAccountingTransactionsTable rows={summary.transactions} />
      </div>
    </div>
  );
}
