"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
import { AccountsTablePagination } from "@/components/accounts/AccountsTableListing";
import {
  AccountsColumnHeader,
  SortTh,
  useAccountsColumnFilterContext,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
import type { BankBookDisplayRow, BankBookSummary } from "./bank-book-data";
import { formatBankBookDate } from "./bank-book-data";

export function BankBookTable({
  openingRow,
  transactionRows,
  summary,
}: {
  openingRow: BankBookDisplayRow;
  transactionRows: BankBookDisplayRow[];
  summary: BankBookSummary;
}) {
  const ctx = useAccountsColumnFilterContext();
  const columnFilteredRows = useAccountsFilteredRows(transactionRows);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const filteredTotals = useMemo(
    () => ({
      totalReceipts: columnFilteredRows.reduce((s, r) => s + r.receipt, 0),
      totalPayments: columnFilteredRows.reduce((s, r) => s + r.payment, 0),
    }),
    [columnFilteredRows],
  );

  const paginatedTransactions = useMemo(() => {
    const start = (page - 1) * pageSize;
    return columnFilteredRows.slice(start, start + pageSize);
  }, [columnFilteredRows, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [ctx?.columnFilters, ctx?.sortKey, ctx?.sortDir]);

  return (
    <>
      <AccountsTableScroll className="flex-1 min-h-0 h-full">
        <AccountsTable minWidth={1080} className="text-xs">
          <AccountsTableHead>
            <AccountsTableHeadRow>
              <SortTh label="Date" colKey="date" filterType="date" />
              <SortTh label="Voucher No." colKey="voucherNo" />
              <SortTh label="Voucher Type" colKey="voucherType" />
              <SortTh label="Particular" colKey="particular" />
              <SortTh label="Narration" colKey="narration" />
              <SortTh label="Receipt" colKey="receipt" filterType="amount" align="right" />
              <SortTh label="Payment" colKey="payment" filterType="amount" align="right" />
              <AccountsColumnHeader
                label="Running Balance"
                colKey="runningBalance"
                sortable={false}
                filterable={false}
                align="right"
              />
            </AccountsTableHeadRow>
          </AccountsTableHead>
          <AccountsTableBody>
            <BankBookTableRow row={openingRow} />
            {transactionRows.length > 0 && columnFilteredRows.length === 0 ? (
              <AccountsTableRow>
                <AccountsTableCell colSpan={8} className="accounts-table-empty">
                  No records match the column filters.
                </AccountsTableCell>
              </AccountsTableRow>
            ) : (
              paginatedTransactions.map((row, index) => (
                <BankBookTableRow key={`${row.rowKey}-${index}`} row={row} />
              ))
            )}
          </AccountsTableBody>
          <AccountsTableFoot>
            <AccountsTableRow className="bg-muted/20 font-semibold">
              <AccountsTableCell colSpan={5} className="text-xs text-foreground py-2">
                Total
              </AccountsTableCell>
              <AccountsTableCell align="right" money className="py-2">
                {formatMoney(filteredTotals.totalReceipts)}
              </AccountsTableCell>
              <AccountsTableCell align="right" money className="py-2">
                {formatMoney(filteredTotals.totalPayments)}
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
      {columnFilteredRows.length > 0 && (
        <div className="flex-shrink-0 border-t border-border">
          <AccountsTablePagination
            page={page}
            pageSize={pageSize}
            totalRecords={columnFilteredRows.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            recordLabel="transactions"
          />
        </div>
      )}
    </>
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
