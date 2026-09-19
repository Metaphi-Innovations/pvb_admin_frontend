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
  formatCashFlowDisplayAmount,
  type CashFlowLineItem,
  type CashFlowStatement,
} from "./cash-flow-api-display";

const LINE_INDENT_PX = 24;
const BASE_INDENT_PX = 8;

function indentPx(depth: number): number {
  return BASE_INDENT_PX + depth * LINE_INDENT_PX;
}

function AmountCell({
  amount,
  drillDownHref,
  particular,
  signed,
  className,
}: {
  amount: string | null;
  drillDownHref?: string;
  particular?: string;
  signed?: boolean;
  className?: string;
}) {
  const formatted = formatCashFlowDisplayAmount(amount, { signed });

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

function CashFlowStatementRow({ line }: { line: CashFlowLineItem }) {
  if (line.kind === "divider") {
    return (
      <AccountsTableRow className="pointer-events-none">
        <AccountsTableCell
          colSpan={2}
          className="py-0 px-0 h-2 border-t-2 border-border/80 bg-muted/10"
        />
      </AccountsTableRow>
    );
  }

  if (line.kind === "title") {
    return (
      <AccountsTableRow className="bg-white hover:bg-white">
        <AccountsTableCell
          colSpan={2}
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
          colSpan={2}
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
        <AccountsTableCell align="right" money className="py-2">
          <AmountCell amount={line.amount} signed className="font-bold" />
        </AccountsTableCell>
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
        <AccountsTableCell align="right" money className="py-2">
          <AmountCell
            amount={line.amount}
            drillDownHref={line.drillDownHref}
            particular={line.particular}
            signed
            className="font-bold"
          />
        </AccountsTableCell>
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
      <AccountsTableCell align="right" money>
        <AmountCell
          amount={line.amount}
          drillDownHref={line.drillDownHref}
          particular={line.particular}
        />
      </AccountsTableCell>
    </AccountsTableRow>
  );
}

export function CashFlowStatementView({
  statement,
}: {
  statement: CashFlowStatement;
}) {
  const rows = statement.lines;

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full w-full">
      <AccountsTableScroll className="flex-1 min-h-0">
        <AccountsTable minWidth={560} className="financial-report">
          <AccountsTableHead>
            <AccountsTableHeadRow>
              <FinancialReportHeadCell className="min-w-[300px]">
                Particulars
              </FinancialReportHeadCell>
              <FinancialReportHeadCell align="right" className="min-w-[140px]">
                Amount (₹)
              </FinancialReportHeadCell>
            </AccountsTableHeadRow>
          </AccountsTableHead>

          <AccountsTableBody>
            {rows.length === 0 ? (
              <AccountsTableRow>
                <AccountsTableCell
                  colSpan={2}
                  className="py-8 text-center text-xs text-muted-foreground"
                >
                  No entries
                </AccountsTableCell>
              </AccountsTableRow>
            ) : (
              rows.map((line) => (
                <CashFlowStatementRow key={line.id} line={line} />
              ))
            )}
          </AccountsTableBody>
        </AccountsTable>
      </AccountsTableScroll>
    </div>
  );
}
