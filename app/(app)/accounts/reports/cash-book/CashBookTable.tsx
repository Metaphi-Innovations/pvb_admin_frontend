"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AccountsColumnHeader,
  SortTh,
  StatusBadge,
  useAccountsColumnFilterContext,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
import { formatBalanceAmount, formatMoney } from "@/lib/accounts/money-format";
import { MoneyAmount, MoneyCell } from "@/components/accounts/MoneyAmount";
import { cn } from "@/lib/utils";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableFoot,
  AccountsTableHead,
  AccountsTableHeadRow,
  AccountsTableRow,
  AccountsTableScroll,
} from "@/components/accounts/AccountsTable";
import { AccountsTablePagination } from "@/components/accounts/AccountsTableListing";
import type { CashBookDisplayRow, CashBookSummary } from "./cash-book-data";

export function CashBookTable({
  openingRow,
  transactionRows,
  summary,
}: {
  openingRow: CashBookDisplayRow;
  transactionRows: CashBookDisplayRow[];
  summary: CashBookSummary;
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
        <AccountsTable minWidth={1160} className="text-xs">
          <AccountsTableHead>
            <AccountsTableHeadRow>
              <SortTh label="Date" colKey="date" filterType="date" />
              <SortTh label="Voucher Type" colKey="voucherType" />
              <SortTh label="Voucher No." colKey="voucherNo" />
              <SortTh label="Particular" colKey="particular" />
              <SortTh label="Reference" colKey="reference" />
              <SortTh label="Receipt" colKey="receipt" filterType="amount" align="right" />
              <SortTh label="Payment" colKey="payment" filterType="amount" align="right" />
              <AccountsColumnHeader
                label="Running Balance"
                colKey="runningBalance"
                sortable={false}
                filterable={false}
                align="right"
              />
              <AccountsColumnHeader
                label="Status"
                colKey="status"
                sortable={false}
                filterable={false}
              />
            </AccountsTableHeadRow>
          </AccountsTableHead>
          <AccountsTableBody>
            <CashBookTableRow row={openingRow} />
            {transactionRows.length > 0 && columnFilteredRows.length === 0 ? (
              <AccountsTableRow>
                <AccountsTableCell colSpan={9} className="accounts-table-empty">
                  No records match the column filters.
                </AccountsTableCell>
              </AccountsTableRow>
            ) : (
              paginatedTransactions.map((row) => (
                <CashBookTableRow key={`${row.kind}-${row.id}`} row={row} />
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
              <AccountsTableCell className="py-2" />
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

function CashBookTableRow({ row }: { row: CashBookDisplayRow }) {
  const isOpening = row.kind === "opening";

  return (
    <AccountsTableRow className={cn(isOpening && "bg-muted/20 font-medium")}>
      <AccountsTableCell className="whitespace-nowrap py-2">{row.date}</AccountsTableCell>
      <AccountsTableCell className="whitespace-nowrap py-2">{row.voucherType}</AccountsTableCell>
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
      <AccountsTableCell
        className={cn("py-2 max-w-[180px] truncate", isOpening && "font-medium")}
        title={row.particular}
      >
        {row.particularLedgerId && !isOpening ? (
          <Link
            href={`/accounts/masters/chart-of-accounts?node=${row.particularLedgerId}`}
            className="text-xs font-medium text-brand-700 hover:underline truncate block"
          >
            {row.particular}
          </Link>
        ) : (
          row.particular
        )}
      </AccountsTableCell>
      <AccountsTableCell
        className="py-2 max-w-[160px] truncate font-mono text-xs text-muted-foreground"
        title={row.reference}
      >
        {row.reference}
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
      {!isOpening && row.status && row.status !== "—" ? (
        <AccountsTableCell className="whitespace-nowrap py-2">
          <StatusBadge status="posted" />
        </AccountsTableCell>
      ) : (
        <AccountsTableCell className="py-2 text-muted-foreground">—</AccountsTableCell>
      )}
    </AccountsTableRow>
  );
}
