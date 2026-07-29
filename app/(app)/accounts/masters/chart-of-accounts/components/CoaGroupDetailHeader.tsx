"use client";

import React from "react";
import { formatBalanceAmount } from "@/lib/accounts/money-format";
import type { CoaGroupDetailSummary } from "../coa-listing-data";

export function CoaGroupDetailHeader({ summary }: { summary: CoaGroupDetailSummary }) {
  const { group, parentGroupName, childGroupCount, ledgerCount, closingAmount, closingSide } =
    summary;

  return (
    <div className="flex-shrink-0 px-3 py-2.5 border-b border-border/60 bg-muted/10">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-x-4 gap-y-2 text-xs">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Group Name
          </span>
          <p className="font-semibold text-foreground mt-0.5">{group.accountName}</p>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Parent Group
          </span>
          <p className="text-foreground mt-0.5 truncate" title={parentGroupName}>
            {parentGroupName}
          </p>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Total Balance
          </span>
          <p className="font-semibold tabular-nums text-foreground mt-0.5">
            {closingAmount > 0 ? formatBalanceAmount(closingAmount, closingSide) : "—"}
          </p>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Child Groups
          </span>
          <p className="font-semibold tabular-nums text-foreground mt-0.5">{childGroupCount}</p>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Ledgers
          </span>
          <p className="font-semibold tabular-nums text-foreground mt-0.5">{ledgerCount}</p>
        </div>
      </div>
    </div>
  );
}
