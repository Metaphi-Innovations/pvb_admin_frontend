"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
import { FinancialReportHeadCell } from "@/components/accounts/FinancialReportTableHead";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableHead,
  AccountsTableHeadRow,
  AccountsTableRow,
  AccountsTableScroll,
} from "@/components/accounts/AccountsTable";
import {
  formatSignedCashFlowAmount,
  type CashFlowLineItem,
  type CashFlowStatement,
} from "./cash-flow-data";

const LINE_INDENT_PX = 24;
const BASE_INDENT_PX = 8;

function indentPx(depth: number): number {
  return BASE_INDENT_PX + depth * LINE_INDENT_PX;
}

function PeriodAmountHeader({
  periodLabel,
  className,
}: {
  periodLabel: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-end leading-tight", className)}>
      <span className="text-[11px] font-semibold text-foreground text-right whitespace-normal">
        {periodLabel}
      </span>
      <span className="text-[10px] font-medium text-muted-foreground mt-0.5">(₹)</span>
    </div>
  );
}

function PeriodAmountCell({
  amount,
  drillDownHref,
  particular,
  className,
}: {
  amount: number | null;
  drillDownHref?: string;
  particular?: string;
  className?: string;
}) {
  const formatted = formatSignedCashFlowAmount(amount);

  if (drillDownHref && amount != null) {
    return (
      <Link
        href={drillDownHref}
        className={cn(
          "block text-right tabular-nums hover:text-brand-700 hover:underline",
          MONEY_AMOUNT_CLASS,
          className,
        )}
        title={particular ? `View ledger for ${particular}` : "View in General Ledger"}
      >
        {formatted}
      </Link>
    );
  }

  return (
    <span className={cn("tabular-nums", MONEY_AMOUNT_CLASS, className)}>
      {formatted}
    </span>
  );
}

function CashFlowAmountCells({
  line,
  comparePreviousPeriod,
  bold,
}: {
  line: CashFlowLineItem;
  comparePreviousPeriod: boolean;
  bold?: boolean;
}) {
  if (comparePreviousPeriod) {
    return (
      <>
        <AccountsTableCell align="right" money className={bold ? "py-2" : undefined}>
          <PeriodAmountCell
            amount={line.amount}
            drillDownHref={line.drillDownHref}
            particular={line.particular}
            className={bold ? "font-bold" : undefined}
          />
        </AccountsTableCell>
        <AccountsTableCell align="right" money className={bold ? "py-2" : undefined}>
          <PeriodAmountCell
            amount={line.previousAmount ?? null}
            drillDownHref={line.previousDrillDownHref}
            particular={line.particular}
            className={bold ? "font-bold" : undefined}
          />
        </AccountsTableCell>
      </>
    );
  }

  return (
    <AccountsTableCell align="right" money className={bold ? "py-2" : undefined}>
      <PeriodAmountCell
        amount={line.amount}
        drillDownHref={line.drillDownHref}
        particular={line.particular}
        className={bold ? "font-bold" : undefined}
      />
    </AccountsTableCell>
  );
}

function CashFlowStatementRow({
  line,
  comparePreviousPeriod,
}: {
  line: CashFlowLineItem;
  comparePreviousPeriod: boolean;
}) {
  const fullColSpan = comparePreviousPeriod ? 3 : 2;

  if (line.kind === "divider") {
    return (
      <AccountsTableRow className="pointer-events-none">
        <AccountsTableCell
          colSpan={fullColSpan}
          className="py-0 px-0 h-2 border-t-2 border-border/80 bg-muted/10"
        />
      </AccountsTableRow>
    );
  }

  if (line.kind === "title") {
    return (
      <AccountsTableRow className="bg-white hover:bg-white">
        <AccountsTableCell
          colSpan={fullColSpan}
          className="text-sm font-bold text-navy-700 py-2.5"
          style={{ paddingLeft: indentPx(0) }}
        >
          {line.particular}
        </AccountsTableCell>
      </AccountsTableRow>
    );
  }

  if (line.kind === "section") {
    return (
      <AccountsTableRow className="bg-muted/25 hover:bg-muted/25">
        <AccountsTableCell
          colSpan={fullColSpan}
          className="text-xs font-bold text-navy-700 py-1.5"
          style={{ paddingLeft: indentPx(0) }}
        >
          {line.particular}
        </AccountsTableCell>
      </AccountsTableRow>
    );
  }

  if (line.kind === "total") {
    return (
      <AccountsTableRow className="bg-brand-50/50 border-t-2 border-border hover:bg-brand-50/50">
        <AccountsTableCell
          className="font-bold text-foreground text-xs py-2"
          style={{ paddingLeft: indentPx(0) }}
        >
          {line.particular}
        </AccountsTableCell>
        <CashFlowAmountCells line={line} comparePreviousPeriod={comparePreviousPeriod} bold />
      </AccountsTableRow>
    );
  }

  if (line.kind === "summary") {
    const isClosing = line.id === "closing-balance";
    const labelClass = cn(
      "font-bold text-xs",
      isClosing ? "text-brand-800 uppercase tracking-wide" : "text-foreground",
    );

    const labelContent = line.drillDownHref ? (
      <Link
        href={line.drillDownHref}
        className={cn(labelClass, "hover:text-brand-700 hover:underline")}
      >
        {line.particular}
      </Link>
    ) : (
      <span className={labelClass}>{line.particular}</span>
    );

    return (
      <AccountsTableRow
        className={cn(
          "border-t border-border",
          isClosing ? "bg-brand-50 border-t-2 border-brand-300" : "bg-muted/25",
        )}
      >
        <AccountsTableCell style={{ paddingLeft: indentPx(0) }}>
          {labelContent}
        </AccountsTableCell>
        <CashFlowAmountCells
          line={line}
          comparePreviousPeriod={comparePreviousPeriod}
          bold
        />
      </AccountsTableRow>
    );
  }

  const particularContent = line.drillDownHref ? (
    <Link
      href={line.drillDownHref}
      className="text-xs text-foreground hover:text-brand-700 hover:underline"
      title={`View ${line.particular} in General Ledger`}
    >
      {line.particular}
    </Link>
  ) : (
    <span className="text-xs text-foreground">{line.particular}</span>
  );

  return (
    <AccountsTableRow className="hover:bg-muted/15 transition-colors">
      <AccountsTableCell style={{ paddingLeft: indentPx(line.indent) }}>
        {particularContent}
      </AccountsTableCell>
      <CashFlowAmountCells line={line} comparePreviousPeriod={comparePreviousPeriod} />
    </AccountsTableRow>
  );
}

export function CashFlowStatementView({
  statement,
}: {
  statement: CashFlowStatement;
}) {
  const rows = statement.lines;
  const comparePreviousPeriod = Boolean(statement.comparePreviousPeriod);
  const emptyColSpan = comparePreviousPeriod ? 3 : 2;
  const tableMinWidth = comparePreviousPeriod ? 760 : 560;

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full w-full">
      <AccountsTableScroll className="flex-1 min-h-0">
        <AccountsTable minWidth={tableMinWidth} className="financial-report">
          <AccountsTableHead>
            <AccountsTableHeadRow>
              <FinancialReportHeadCell className="min-w-[300px]">
                Particulars
              </FinancialReportHeadCell>
              {comparePreviousPeriod ? (
                <>
                  <FinancialReportHeadCell align="right" className="min-w-[180px]">
                    <PeriodAmountHeader periodLabel={statement.currentPeriodLabel ?? ""} />
                  </FinancialReportHeadCell>
                  <FinancialReportHeadCell align="right" className="min-w-[180px]">
                    <PeriodAmountHeader periodLabel={statement.previousPeriodLabel ?? ""} />
                  </FinancialReportHeadCell>
                </>
              ) : (
                <FinancialReportHeadCell align="right" className="min-w-[140px]">
                  Amount (₹)
                </FinancialReportHeadCell>
              )}
            </AccountsTableHeadRow>
          </AccountsTableHead>

          <AccountsTableBody>
            {rows.length === 0 ? (
              <AccountsTableRow>
                <AccountsTableCell
                  colSpan={emptyColSpan}
                  className="py-8 text-center text-xs text-muted-foreground"
                >
                  No entries
                </AccountsTableCell>
              </AccountsTableRow>
            ) : (
              rows.map((line) => (
                <CashFlowStatementRow
                  key={line.id}
                  line={line}
                  comparePreviousPeriod={comparePreviousPeriod}
                />
              ))
            )}
          </AccountsTableBody>
        </AccountsTable>
      </AccountsTableScroll>
    </div>
  );
}
