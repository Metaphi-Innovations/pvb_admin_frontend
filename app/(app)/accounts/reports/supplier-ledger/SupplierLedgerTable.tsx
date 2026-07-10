"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
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
  AccountsTableHead,
  AccountsTableHeadRow,
  AccountsTableRow,
  AccountsTableScroll,
} from "@/components/accounts/AccountsTable";
import { AccountsTablePagination } from "@/components/accounts/AccountsTableListing";
import type { SupplierLedgerDisplayRow } from "./supplier-ledger-data";

export function SupplierLedgerTable({
  openingRow,
  transactionRows,
  closingRow,
}: {
  openingRow: SupplierLedgerDisplayRow;
  transactionRows: SupplierLedgerDisplayRow[];
  closingRow: SupplierLedgerDisplayRow;
}) {
  const ctx = useAccountsColumnFilterContext();
  const columnFilteredRows = useAccountsFilteredRows(transactionRows);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

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
            <SupplierLedgerTableRow row={openingRow} />
            {transactionRows.length > 0 && columnFilteredRows.length === 0 ? (
              <AccountsTableRow>
                <AccountsTableCell colSpan={8} className="accounts-table-empty">
                  No records match the column filters.
                </AccountsTableCell>
              </AccountsTableRow>
            ) : (
              paginatedTransactions.map((row, i) => (
                <SupplierLedgerTableRow key={`${row.kind}-${row.date}-${i}`} row={row} />
              ))
            )}
            <SupplierLedgerTableRow row={closingRow} />
          </AccountsTableBody>
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

function SupplierLedgerTableRow({ row }: { row: SupplierLedgerDisplayRow }) {
  const isSummary = row.kind === "opening" || row.kind === "closing";
  const isOpening = row.kind === "opening";

  return (
    <AccountsTableRow
      className={cn(
        isSummary && "bg-muted/20 font-medium",
        row.kind === "closing" && "bg-brand-50/40 border-t-2 border-brand-200",
      )}
    >
      <AccountsTableCell className="whitespace-nowrap py-2">{row.date}</AccountsTableCell>
      <AccountsTableCell className="whitespace-nowrap py-2">
        {isOpening ? (
          <span className="font-mono text-xs font-semibold text-brand-700">OB</span>
        ) : row.kind === "closing" ? (
          <span className="text-muted-foreground">—</span>
        ) : row.viewHref ? (
          <Link
            href={row.viewHref}
            className="font-mono text-xs font-semibold text-brand-700 hover:text-brand-800 hover:underline"
          >
            {row.voucherNo}
          </Link>
        ) : (
          <span className="font-mono text-xs font-semibold text-brand-700">{row.voucherNo}</span>
        )}
      </AccountsTableCell>
      <AccountsTableCell className="whitespace-nowrap py-2 text-muted-foreground">
        {isOpening ? "Opening Balance" : row.kind === "closing" ? "—" : row.voucherType}
      </AccountsTableCell>
      <AccountsTableCell
        className={cn("py-2", !isSummary && "max-w-[180px] truncate")}
        title={row.particular}
      >
        <span className={cn(isSummary && "text-xs font-semibold text-foreground")}>
          {row.particular}
        </span>
      </AccountsTableCell>
      <AccountsTableCell
        className={cn("py-2 text-muted-foreground", !isSummary && "max-w-[200px] truncate")}
        title={row.narration}
      >
        {row.narration}
      </AccountsTableCell>
      <MoneyCell amount={row.debit} dashIfZero className="accounts-table-td py-2" />
      <MoneyCell amount={row.credit} dashIfZero className="accounts-table-td py-2" />
      <AccountsTableCell align="right" className="tabular-nums font-medium whitespace-nowrap py-2">
        <MoneyAmount
          amount={row.runningBalance}
          side={row.runningBalanceType}
          sideBadge
          className="text-xs justify-end"
        />
      </AccountsTableCell>
    </AccountsTableRow>
  );
}
