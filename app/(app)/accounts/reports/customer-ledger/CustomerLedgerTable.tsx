"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { formatBalanceAmount, formatMoney } from "@/lib/accounts/money-format";
import { MoneyAmount, MoneyCell } from "@/components/accounts/MoneyAmount";
import {
  AccountsColumnHeader,
  SortTh,
  useAccountsColumnFilterContext,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
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
import type { CustomerLedgerDisplayRow } from "./customer-ledger-data";

export function CustomerLedgerTable({
  openingRow,
  transactionRows,
  closingRow,
}: {
  openingRow: CustomerLedgerDisplayRow;
  transactionRows: CustomerLedgerDisplayRow[];
  closingRow: CustomerLedgerDisplayRow;
}) {
  const ctx = useAccountsColumnFilterContext();
  const columnFilteredRows = useAccountsFilteredRows(transactionRows);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const filteredTotals = useMemo(
    () => ({
      totalDebit: columnFilteredRows.reduce((s, r) => s + r.debit, 0),
      totalCredit: columnFilteredRows.reduce((s, r) => s + r.credit, 0),
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
        <AccountsTable minWidth={1040} className="text-xs">
          <AccountsTableHead>
            <AccountsTableHeadRow>
              <SortTh label="Date" colKey="date" filterType="date" />
              <SortTh label="Voucher No." colKey="voucher" />
              <SortTh label="Voucher Type" colKey="type" />
              <SortTh label="Particular" colKey="particular" />
              <SortTh label="Narration" colKey="narration" />
              <SortTh label="Debit" colKey="debit" filterType="amount" align="right" />
              <SortTh label="Credit" colKey="credit" filterType="amount" align="right" />
              <AccountsColumnHeader
                label="Running Balance"
                colKey="balance"
                sortable={false}
                filterable={false}
                align="right"
              />
            </AccountsTableHeadRow>
          </AccountsTableHead>
          <AccountsTableBody>
            <CustomerLedgerTableRow row={openingRow} />
            {transactionRows.length > 0 && columnFilteredRows.length === 0 ? (
              <AccountsTableRow>
                <AccountsTableCell colSpan={8} className="accounts-table-empty">
                  No records match the column filters.
                </AccountsTableCell>
              </AccountsTableRow>
            ) : (
              paginatedTransactions.map((row, i) => (
                <CustomerLedgerTableRow key={`${row.kind}-${row.date}-${i}`} row={row} />
              ))
            )}
            <CustomerLedgerTableRow row={closingRow} />
          </AccountsTableBody>
          <AccountsTableFoot>
            <AccountsTableRow className="bg-muted/20 font-semibold">
              <AccountsTableCell colSpan={5} className="text-xs text-foreground py-2">
                Total
              </AccountsTableCell>
              <AccountsTableCell align="right" money className="py-2">
                {formatMoney(filteredTotals.totalDebit)}
              </AccountsTableCell>
              <AccountsTableCell align="right" money className="py-2">
                {formatMoney(filteredTotals.totalCredit)}
              </AccountsTableCell>
              <AccountsTableCell align="right" className="tabular-nums whitespace-nowrap py-2">
                <MoneyAmount
                  amount={closingRow.runningBalance}
                  side={closingRow.runningBalanceType}
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

function CustomerLedgerTableRow({ row }: { row: CustomerLedgerDisplayRow }) {
  const isSummary = row.kind === "opening" || row.kind === "closing";

  return (
    <AccountsTableRow
      className={cn(
        isSummary && "bg-muted/20 font-medium",
        row.kind === "closing" && "bg-brand-50/40",
      )}
    >
      <AccountsTableCell className="whitespace-nowrap py-2">{row.date}</AccountsTableCell>
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
        className={cn("py-2 max-w-[180px] truncate", isSummary && "text-muted-foreground")}
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
      <MoneyCell amount={row.debit} dashIfZero className="accounts-table-td py-2" />
      <MoneyCell amount={row.credit} dashIfZero className="accounts-table-td py-2" />
      <AccountsTableCell align="right" className="tabular-nums font-medium whitespace-nowrap py-2">
        {isSummary && row.kind === "opening" ? (
          <span className="text-xs">
            {formatBalanceAmount(row.runningBalance, row.runningBalanceType)}
          </span>
        ) : (
          <MoneyAmount
            amount={row.runningBalance}
            side={row.runningBalanceType}
            sideBadge
            className={cn("text-xs justify-end", row.kind === "closing" && "font-semibold")}
          />
        )}
      </AccountsTableCell>
    </AccountsTableRow>
  );
}
