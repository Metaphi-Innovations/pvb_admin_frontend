"use client";

import { memo } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  formatMoneyString,
  formatMoneyStringOrDash,
  MONEY_AMOUNT_CLASS,
} from "@/lib/accounts/money-format";
import { buildGeneralLedgerHref } from "@/lib/accounts/general-ledger-href";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableFoot,
  AccountsTableHead,
  AccountsTableHeadCell,
  AccountsTableHeadRow,
  AccountsTableRow,
} from "@/components/accounts/AccountsTable";
import type { PlScreenModel, PlScreenPair, PlScreenRow } from "./profit-loss-api-display";
import { plRowIndentPx } from "./pl-display";

export interface PlDrillDownScope {
  dateFrom: string;
  dateTo: string;
  financialYearId: string;
  warehouseId?: string;
}

function displayAmount(row: PlScreenRow): string {
  if (row.emphasis === "detail") return formatMoneyStringOrDash(row.amount);
  return formatMoneyString(row.amount);
}

function ParticularLabel({
  row,
  scope,
}: {
  row: PlScreenRow;
  scope: PlDrillDownScope;
}) {
  const bold = row.emphasis !== "detail";
  const navigable = Boolean(row.ledgerId || row.groupId);
  const labelClass = cn(
    "text-xs truncate",
    bold ? "font-bold text-foreground" : "font-normal text-foreground",
    navigable && "text-brand-700 hover:text-brand-800 hover:underline",
  );

  const label = (
    <span className={labelClass} title={row.particular} style={{ paddingLeft: plRowIndentPx(row.depth) }}>
      {row.particular}
    </span>
  );

  if (!navigable) return label;

  return (
    <Link
      href={buildGeneralLedgerHref({
        ledgerId: row.ledgerId ?? undefined,
        groupId: row.ledgerId ? undefined : row.groupId ?? undefined,
        fromDate: scope.dateFrom,
        toDate: scope.dateTo,
        financialYearId: scope.financialYearId,
        warehouse: scope.warehouseId,
        source: "profit-loss",
      })}
      className={labelClass}
      style={{ paddingLeft: plRowIndentPx(row.depth) }}
      title={row.ledgerId ? `View ${row.particular} ledger` : `View ${row.particular} in General Ledger`}
    >
      {row.particular}
    </Link>
  );
}

function AmountCell({ row }: { row: PlScreenRow }) {
  const bold = row.emphasis !== "detail";
  return (
    <span className={cn("text-right tabular-nums", MONEY_AMOUNT_CLASS, bold && "font-bold")}>
      {displayAmount(row)}
    </span>
  );
}

function sectionClass(pair: PlScreenPair): string | undefined {
  const emphasis = [pair.debit?.emphasis, pair.credit?.emphasis];
  if (emphasis.includes("section")) return "border-t-2 border-foreground/20 bg-muted/20";
  if (emphasis.includes("category") || emphasis.includes("presentation")) return "bg-muted/10";
  return undefined;
}

export const ProfitLossHorizontalView = memo(function ProfitLossHorizontalView({
  model,
  scope,
}: {
  model: PlScreenModel;
  scope: PlDrillDownScope;
}) {
  const bodyRows = model.pairs;

  return (
    <div className="w-full">
      <AccountsTable minWidth={720}>
        <AccountsTableHead>
          <AccountsTableHeadRow>
            <AccountsTableHeadCell className="min-w-[200px] border-r border-border">
              Particulars
            </AccountsTableHeadCell>
            <AccountsTableHeadCell align="right" className="min-w-[140px] border-r-2 border-border">
              Amount
            </AccountsTableHeadCell>
            <AccountsTableHeadCell className="min-w-[200px] border-r border-border">
              Particulars
            </AccountsTableHeadCell>
            <AccountsTableHeadCell align="right" className="min-w-[140px]">
              Amount
            </AccountsTableHeadCell>
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {bodyRows.map((pair, index) => (
            <AccountsTableRow
              key={`pl-row-${index}`}
              className={cn(
                "hover:bg-muted/30 transition-colors",
                sectionClass(pair),
              )}
            >
              <AccountsTableCell className="border-r border-border/60 align-top">
                {pair.debit ? <ParticularLabel row={pair.debit} scope={scope} /> : null}
              </AccountsTableCell>
              <AccountsTableCell align="right" money className="border-r-2 border-border align-top">
                {pair.debit ? <AmountCell row={pair.debit} /> : null}
              </AccountsTableCell>
              <AccountsTableCell className="border-r border-border/60 align-top">
                {pair.credit ? <ParticularLabel row={pair.credit} scope={scope} /> : null}
              </AccountsTableCell>
              <AccountsTableCell align="right" money className="align-top">
                {pair.credit ? <AmountCell row={pair.credit} /> : null}
              </AccountsTableCell>
            </AccountsTableRow>
          ))}
        </AccountsTableBody>
        <AccountsTableFoot>
          <AccountsTableRow className="border-t-2 border-foreground/20 bg-brand-50/60">
            <AccountsTableCell className="border-r border-border/60 font-bold text-xs text-foreground">
              Total
            </AccountsTableCell>
            <AccountsTableCell align="right" money className="border-r-2 border-border font-bold">
              <span className={cn(MONEY_AMOUNT_CLASS, "font-bold")}>
                {formatMoneyString(model.debitTotal)}
              </span>
            </AccountsTableCell>
            <AccountsTableCell className="border-r border-border/60 font-bold text-xs text-foreground">
              Total
            </AccountsTableCell>
            <AccountsTableCell align="right" money className="font-bold">
              <span className={cn(MONEY_AMOUNT_CLASS, "font-bold")}>
                {formatMoneyString(model.creditTotal)}
              </span>
            </AccountsTableCell>
          </AccountsTableRow>
        </AccountsTableFoot>
      </AccountsTable>
    </div>
  );
});
