"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatBalanceAmount, formatMoney } from "@/lib/accounts/money-format";
import { MoneyAmount, MoneyCell } from "@/components/accounts/MoneyAmount";
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
import { SortTh } from "@/app/(app)/accounts/components/AccountsUI";
import type { BankBookDisplayRow, BankBookSortKey, BankBookSummary } from "./bank-book-data";
import { formatBankBookDate } from "./bank-book-data";

export function BankBookTable({
  openingRow,
  transactionRows,
  summary,
  sortKey,
  sortDir,
  onSort,
}: {
  openingRow: BankBookDisplayRow;
  transactionRows: BankBookDisplayRow[];
  summary: BankBookSummary;
  sortKey: BankBookSortKey;
  sortDir: "asc" | "desc";
  onSort: (key: string) => void;
}) {
  const rows = [openingRow, ...transactionRows];

  return (
    <AccountsTableScroll className="flex-1 min-h-0 h-full">
      <AccountsTable minWidth={1080} className="text-xs">
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
              label="Voucher No."
              colKey="voucherNo"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortTh
              label="Voucher Type"
              colKey="voucherType"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <AccountsTableHeadCell sticky>Particular</AccountsTableHeadCell>
            <AccountsTableHeadCell sticky>Narration</AccountsTableHeadCell>
            <SortTh
              label="Receipt"
              colKey="receipt"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
              align="right"
            />
            <SortTh
              label="Payment"
              colKey="payment"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
              align="right"
            />
            <AccountsTableHeadCell align="right" sticky>
              Running Balance
            </AccountsTableHeadCell>
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {rows.map((row, index) => (
            <BankBookTableRow key={`${row.rowKey}-${index}`} row={row} />
          ))}
        </AccountsTableBody>
        <AccountsTableFoot>
          <AccountsTableRow className="bg-muted/20 font-semibold">
            <AccountsTableCell colSpan={5} className="text-xs text-foreground py-2">
              Total
            </AccountsTableCell>
            <AccountsTableCell align="right" money className="py-2">
              {formatMoney(summary.totalReceipts)}
            </AccountsTableCell>
            <AccountsTableCell align="right" money className="py-2">
              {formatMoney(summary.totalPayments)}
            </AccountsTableCell>
            <AccountsTableCell align="right" className="tabular-nums whitespace-nowrap py-2">
              <MoneyAmount
                amount={summary.closingBalance}
                side={summary.closingBalanceType}
                sideBadge
                className="text-xs justify-end font-semibold"
              />
            </AccountsTableCell>
          </AccountsTableRow>
        </AccountsTableFoot>
      </AccountsTable>
    </AccountsTableScroll>
  );
}

function BankBookTableRow({ row }: { row: BankBookDisplayRow }) {
  const isOpening = row.kind === "opening";

  return (
    <AccountsTableRow
      className={cn(
        isOpening && "bg-muted/20 font-medium",
      )}
    >
      <AccountsTableCell className="whitespace-nowrap py-2">
        {formatBankBookDate(row.date)}
      </AccountsTableCell>
      <AccountsTableCell className="whitespace-nowrap py-2">
        {row.voucherNo === "—" ? (
          <span className="text-muted-foreground">—</span>
        ) : row.voucherHref ? (
          <Link
            href={row.voucherHref}
            className="font-mono text-xs font-semibold text-brand-700 hover:underline"
          >
            {row.voucherNo}
          </Link>
        ) : (
          <span className="font-mono text-xs font-semibold text-brand-700">{row.voucherNo}</span>
        )}
      </AccountsTableCell>
      <AccountsTableCell className="whitespace-nowrap py-2">{row.voucherType}</AccountsTableCell>
      <AccountsTableCell
        className={cn("py-2 max-w-[180px] truncate", isOpening && "text-muted-foreground")}
        title={row.particular}
      >
        {row.particular}
      </AccountsTableCell>
      <AccountsTableCell
        className="py-2 max-w-[220px] truncate text-muted-foreground"
        title={row.narration}
      >
        {row.narration}
      </AccountsTableCell>
      <MoneyCell amount={row.receipt} dashIfZero className="accounts-table-td py-2" />
      <MoneyCell amount={row.payment} dashIfZero className="accounts-table-td py-2" />
      <AccountsTableCell align="right" className="tabular-nums font-medium whitespace-nowrap py-2">
        {isOpening ? (
          <span className="text-xs">
            {formatBalanceAmount(row.runningBalance, row.runningBalanceType)}
          </span>
        ) : (
          <MoneyAmount
            amount={row.runningBalance}
            side={row.runningBalanceType}
            sideBadge
            className="text-xs justify-end"
          />
        )}
      </AccountsTableCell>
    </AccountsTableRow>
  );
}
