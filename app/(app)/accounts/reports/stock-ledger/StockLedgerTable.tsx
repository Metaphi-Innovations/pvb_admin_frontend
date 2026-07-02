"use client";

import Link from "next/link";
import { SortTh } from "@/app/(app)/accounts/components/AccountsUI";
import { formatMoney, MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableFoot,
  AccountsTableHead,
  AccountsTableHeadCell,
  AccountsTableHeadRow,
  AccountsTableRow,
  AccountsTableScroll,
} from "@/components/accounts/AccountsTable";
import {
  formatQty,
  type StockLedgerDisplayRow,
  type StockLedgerSortKey,
  type StockLedgerSummary,
} from "./stock-ledger-data";

export function StockLedgerTable({
  openingRow,
  transactionRows,
  closingRow,
  summary,
  sortKey,
  sortDir,
  onSort,
}: {
  openingRow: StockLedgerDisplayRow;
  transactionRows: StockLedgerDisplayRow[];
  closingRow: StockLedgerDisplayRow;
  summary: StockLedgerSummary;
  sortKey: StockLedgerSortKey;
  sortDir: "asc" | "desc";
  onSort: (key: string) => void;
}) {
  const rows = [openingRow, ...transactionRows, closingRow];

  return (
    <AccountsTableScroll className="flex-1 min-h-0 h-full">
      <AccountsTable minWidth={1100} className="text-xs">
        <AccountsTableHead>
          <AccountsTableHeadRow>
            <SortTh
              label="Date"
              colKey="date"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortTh
              label="Document No."
              colKey="documentNo"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortTh
              label="Transaction Type"
              colKey="transactionType"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortTh
              label="Warehouse"
              colKey="warehouse"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <AccountsTableHeadCell>Batch No.</AccountsTableHeadCell>
            <SortTh
              label="In Qty"
              colKey="inQty"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
              align="right"
            />
            <SortTh
              label="Out Qty"
              colKey="outQty"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
              align="right"
            />
            <AccountsTableHeadCell align="right">Balance Qty</AccountsTableHeadCell>
            <AccountsTableHeadCell>Unit</AccountsTableHeadCell>
            <AccountsTableHeadCell align="right">Cost Price</AccountsTableHeadCell>
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {rows.map((row) => (
            <StockLedgerTableRow key={`${row.kind}-${row.id}`} row={row} />
          ))}
        </AccountsTableBody>
        <AccountsTableFoot>
          <AccountsTableRow>
            <AccountsTableCell colSpan={5} className="font-semibold text-[11px] text-foreground">
              Totals
            </AccountsTableCell>
            <AccountsTableCell align="right" className="font-semibold tabular-nums text-xs">
              {formatQty(summary.totalInQty, true)}
            </AccountsTableCell>
            <AccountsTableCell align="right" className="font-semibold tabular-nums text-xs">
              {formatQty(summary.totalOutQty, true)}
            </AccountsTableCell>
            <AccountsTableCell align="right" className="font-semibold tabular-nums text-xs">
              {formatQty(summary.closingQty, true)} {summary.unit}
            </AccountsTableCell>
            <AccountsTableCell colSpan={2} />
          </AccountsTableRow>
        </AccountsTableFoot>
      </AccountsTable>
    </AccountsTableScroll>
  );
}

function StockLedgerTableRow({ row }: { row: StockLedgerDisplayRow }) {
  const isOpening = row.kind === "opening";
  const isClosing = row.kind === "closing";
  const isSummary = isOpening || isClosing;

  return (
    <AccountsTableRow
      className={cn(
        isSummary && "bg-muted/20 font-medium",
        isClosing && "bg-brand-50/40 border-t-2 border-brand-200",
      )}
    >
      <AccountsTableCell className="whitespace-nowrap py-2">
        {isSummary ? row.date : row.date}
      </AccountsTableCell>
      <AccountsTableCell className="whitespace-nowrap py-2">
        {isSummary ? (
          <span className="text-muted-foreground">—</span>
        ) : row.viewHref ? (
          <Link
            href={row.viewHref}
            className="font-mono text-xs font-semibold text-brand-700 hover:text-brand-800 hover:underline"
          >
            {row.documentNo}
          </Link>
        ) : (
          <span className="font-mono text-xs font-semibold text-brand-700">{row.documentNo}</span>
        )}
      </AccountsTableCell>
      <AccountsTableCell className="py-2">
        <span className={cn(isSummary && "text-xs font-semibold text-foreground")}>
          {row.transactionTypeLabel}
        </span>
      </AccountsTableCell>
      <AccountsTableCell className="py-2">{row.warehouse}</AccountsTableCell>
      <AccountsTableCell mono className="py-2">
        {row.batchNo}
      </AccountsTableCell>
      <AccountsTableCell align="right" className="tabular-nums py-2">
        {isOpening ? (
          <span className="font-semibold">{formatQty(row.inQty, true)}</span>
        ) : isClosing ? (
          "—"
        ) : (
          formatQty(row.inQty)
        )}
      </AccountsTableCell>
      <AccountsTableCell align="right" className="tabular-nums py-2">
        {isClosing ? "—" : formatQty(row.outQty)}
      </AccountsTableCell>
      <AccountsTableCell align="right" className="tabular-nums font-medium py-2">
        {isClosing ? (
          <span className="font-semibold text-brand-700">
            {formatQty(row.balanceQty, true)} {row.unit}
          </span>
        ) : (
          formatQty(row.balanceQty)
        )}
      </AccountsTableCell>
      <AccountsTableCell className="py-2">{row.unit}</AccountsTableCell>
      <AccountsTableCell align="right" money className={cn(MONEY_AMOUNT_CLASS, "py-2")}>
        {isSummary ? "—" : formatMoney(row.costPrice)}
      </AccountsTableCell>
    </AccountsTableRow>
  );
}
