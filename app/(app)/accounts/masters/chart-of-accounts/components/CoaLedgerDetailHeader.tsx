"use client";

import React from "react";
import { formatBalanceAmount } from "@/lib/accounts/money-format";
import type { ChartOfAccount } from "../../../data";
import { getAncestorPath } from "../chart-of-accounts-data";

export function CoaLedgerDetailHeader({
  ledger,
  records,
  openingAmount,
  openingSide,
  closingAmount,
  closingSide,
}: {
  ledger: ChartOfAccount;
  records: ChartOfAccount[];
  openingAmount: number;
  openingSide: "Debit" | "Credit";
  closingAmount: number;
  closingSide: "Debit" | "Credit";
}) {
  const path = getAncestorPath(records, ledger.id);
  const parentGroup =
    [...path].reverse().find((n) => n.nodeLevel === "account_group")?.accountName ??
    ledger.parentAccount ??
    "—";

  return (
    <div className="flex-shrink-0 px-3 py-2 border-b border-border/60 bg-muted/10">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-1 text-xs">
        <div>
          <span className="text-xs font-medium uppercase text-muted-foreground">Ledger Name</span>
          <p className="font-semibold text-foreground mt-0.5">{ledger.accountName}</p>
        </div>
        <div>
          <span className="text-xs font-medium uppercase text-muted-foreground">Ledger Code</span>
          <p className="font-mono font-semibold text-brand-700 mt-0.5">{ledger.accountCode}</p>
        </div>
        <div>
          <span className="text-xs font-medium uppercase text-muted-foreground">Parent Group</span>
          <p className="text-foreground mt-0.5 truncate" title={parentGroup}>
            {parentGroup}
          </p>
        </div>
        <div className="flex gap-4 sm:col-span-2 lg:col-span-1 lg:justify-end">
          <div>
            <span className="text-xs font-medium uppercase text-muted-foreground">Opening Balance</span>
            <p className="font-semibold tabular-nums text-foreground mt-0.5">
              {formatBalanceAmount(openingAmount, openingSide)}
            </p>
          </div>
          <div>
            <span className="text-xs font-medium uppercase text-muted-foreground">Closing Balance</span>
            <p className="font-semibold tabular-nums text-foreground mt-0.5">
              {formatBalanceAmount(closingAmount, closingSide)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
