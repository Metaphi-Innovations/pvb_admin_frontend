"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatMoneyNumber, MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
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
import {
  buildPandLLedgerHref,
  type PandLDrillDownFilters,
  type PandLSideDisplayRow,
  type PandLStatement,
} from "./pl-data";

function formatAmount(amount: number, isReturn?: boolean): string {
  if (isReturn) return `(${formatMoneyNumber(amount)})`;
  return formatMoneyNumber(amount);
}

function isBoldRow(row: PandLSideDisplayRow): boolean {
  return (
    row.rowType === "group" ||
    row.rowType === "carried" ||
    row.rowType === "section_total" ||
    row.rowType === "net" ||
    row.rowType === "grand_total"
  );
}

function ParticularLabel({
  row,
  drillDownFilters,
}: {
  row: PandLSideDisplayRow;
  drillDownFilters: PandLDrillDownFilters;
}) {
  const bold = isBoldRow(row);
  const labelClass = cn(
    "text-xs truncate",
    bold ? "font-bold text-foreground" : "font-normal text-foreground",
    row.ledgerId && "text-brand-700 hover:text-brand-800 hover:underline",
  );

  if (row.ledgerId) {
    return (
      <Link
        href={buildPandLLedgerHref(row.ledgerId, drillDownFilters)}
        className={labelClass}
        title={`View ${row.particular} ledger`}
      >
        {row.particular}
      </Link>
    );
  }

  return (
    <span className={labelClass} title={row.particular}>
      {row.particular}
    </span>
  );
}

function DualAmountCell({ row }: { row: PandLSideDisplayRow }) {
  const bold = isBoldRow(row);

  if (row.rowType === "ledger") {
    return (
      <div className="grid grid-cols-[1fr_1fr] w-full items-center gap-2">
        <span className={cn("text-left tabular-nums", MONEY_AMOUNT_CLASS)}>
          {row.ledgerAmount != null ? formatAmount(row.ledgerAmount, row.isReturn) : ""}
        </span>
        <span />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[1fr_1fr] w-full items-center gap-2">
      <span />
      <span className={cn("text-right tabular-nums", MONEY_AMOUNT_CLASS, bold && "font-bold")}>
        {row.groupTotal != null ? formatAmount(row.groupTotal, row.isReturn) : ""}
      </span>
    </div>
  );
}

function zipRows(statement: PandLStatement) {
  const debitBody = statement.debitRows.filter((r) => r.rowType !== "grand_total");
  const creditBody = statement.creditRows.filter((r) => r.rowType !== "grand_total");
  const rowCount = Math.max(debitBody.length, creditBody.length);

  const bodyRows = Array.from({ length: rowCount }, (_, i) => ({
    debit: debitBody[i] ?? null,
    credit: creditBody[i] ?? null,
  }));

  const grandDebit: PandLSideDisplayRow =
    statement.debitRows.find((r) => r.rowType === "grand_total") ?? {
      id: "pl-grand-dr",
      particular: "Total",
      rowType: "grand_total",
      groupTotal: statement.finalDebitTotal,
    };

  const grandCredit: PandLSideDisplayRow =
    statement.creditRows.find((r) => r.rowType === "grand_total") ?? {
      id: "pl-grand-cr",
      particular: "Total",
      rowType: "grand_total",
      groupTotal: statement.finalCreditTotal,
    };

  return { bodyRows, grandDebit, grandCredit };
}

function sectionTotalRowClass(row: PandLSideDisplayRow | null): string | undefined {
  if (row?.rowType === "section_total") return "border-t-2 border-foreground/20 bg-muted/20";
  if (row?.rowType === "group" || row?.rowType === "carried") return "bg-muted/10";
  return undefined;
}

export const ProfitLossHorizontalView = memo(function ProfitLossHorizontalView({
  statement,
  drillDownFilters,
}: {
  statement: PandLStatement;
  drillDownFilters: PandLDrillDownFilters;
}) {
  const { bodyRows, grandDebit, grandCredit } = useMemo(
    () => zipRows(statement),
    [statement],
  );

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
                sectionTotalRowClass(pair.debit) ?? sectionTotalRowClass(pair.credit),
              )}
            >
              <AccountsTableCell className="border-r border-border/60 align-top">
                {pair.debit ? (
                  <ParticularLabel row={pair.debit} drillDownFilters={drillDownFilters} />
                ) : null}
              </AccountsTableCell>
              <AccountsTableCell
                align="right"
                money
                className="border-r-2 border-border align-top"
              >
                {pair.debit ? <DualAmountCell row={pair.debit} /> : null}
              </AccountsTableCell>
              <AccountsTableCell className="border-r border-border/60 align-top">
                {pair.credit ? (
                  <ParticularLabel row={pair.credit} drillDownFilters={drillDownFilters} />
                ) : null}
              </AccountsTableCell>
              <AccountsTableCell align="right" money className="align-top">
                {pair.credit ? <DualAmountCell row={pair.credit} /> : null}
              </AccountsTableCell>
            </AccountsTableRow>
          ))}
        </AccountsTableBody>

        <AccountsTableFoot>
          <AccountsTableRow className="border-t-2 border-foreground/20 bg-brand-50/60">
            <AccountsTableCell className="border-r border-border/60 font-bold text-xs text-foreground">
              {grandDebit.particular}
            </AccountsTableCell>
            <AccountsTableCell
              align="right"
              money
              className="border-r-2 border-border font-bold"
            >
              <DualAmountCell row={grandDebit} />
            </AccountsTableCell>
            <AccountsTableCell className="border-r border-border/60 font-bold text-xs text-foreground">
              {grandCredit.particular}
            </AccountsTableCell>
            <AccountsTableCell align="right" money className="font-bold">
              <DualAmountCell row={grandCredit} />
            </AccountsTableCell>
          </AccountsTableRow>
        </AccountsTableFoot>
      </AccountsTable>
    </div>
  );
});
