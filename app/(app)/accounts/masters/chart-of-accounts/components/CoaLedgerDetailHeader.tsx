"use client";

import React from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBalanceAmount } from "@/lib/accounts/money-format";
import { requestCoaEditLedger } from "@/app/(app)/accounts/masters/chart-of-accounts/coa-edit-ledger-bridge";
import { BillWiseOutstandingButton } from "@/components/accounts/BillWiseOutstandingButton";
import { canEditLedger } from "../chart-of-accounts-data";
import type { ChartOfAccount } from "../../../data";
import { getAncestorPath } from "../chart-of-accounts-data";

export function CoaLedgerDetailHeader({
  ledger,
  records,
  openingAmount,
  openingSide,
  closingAmount,
  closingSide,
  canEdit = false,
}: {
  ledger: ChartOfAccount;
  records: ChartOfAccount[];
  openingAmount: number;
  openingSide: "Debit" | "Credit";
  closingAmount: number;
  closingSide: "Debit" | "Credit";
  canEdit?: boolean;
}) {
  const path = getAncestorPath(records, ledger.id);
  const parentGroup =
    [...path].reverse().find((n) => n.nodeLevel === "account_group")?.accountName ??
    ledger.parentAccount ??
    "—";
  const showEdit = canEdit && canEditLedger(ledger, records);

  return (
    <div className="flex-shrink-0 px-3 py-2 border-b border-border/60 bg-muted/10">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1 text-xs">
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
        </div>
        <div className="flex flex-wrap items-center gap-1.5 flex-shrink-0">
          <BillWiseOutstandingButton ledger={ledger} records={records} from="coa" />
          {showEdit ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => requestCoaEditLedger(ledger.id)}
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit Ledger
            </Button>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-4 text-xs">
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
  );
}
