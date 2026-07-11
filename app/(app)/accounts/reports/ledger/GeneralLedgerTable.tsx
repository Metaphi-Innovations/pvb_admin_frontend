"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { MoneyCell } from "@/components/accounts/MoneyAmount";
import { balanceSideLabel, formatMoney } from "@/lib/accounts/money-format";
import { resolveDrCrColumnSide } from "@/lib/accounts/running-balance";
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
import type { GeneralLedgerDisplayRow } from "./general-ledger-data";

function emptyCell(value: string) {
  return value && value !== "—" ? value : "—";
}

export function GeneralLedgerTable({
  openingRow,
  transactionRows,
  closingRow,
}: {
  openingRow: GeneralLedgerDisplayRow;
  transactionRows: GeneralLedgerDisplayRow[];
  closingRow?: GeneralLedgerDisplayRow;
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
        <AccountsTable minWidth={960} className="text-xs">
          <AccountsTableHead>
            <AccountsTableHeadRow>
              <SortTh label="Date" colKey="date" filterType="date" />
              <SortTh label="Voucher Type" colKey="type" />
              <SortTh label="Voucher No." colKey="voucher" />
              <SortTh label="Reference No." colKey="reference" />
              <SortTh label="Particulars" colKey="particulars" />
              <SortTh label="Debit" colKey="debit" filterType="amount" align="right" />
              <SortTh label="Credit" colKey="credit" filterType="amount" align="right" />
              <AccountsColumnHeader
                label="Running Balance"
                colKey="balance"
                sortable={false}
                filterable={false}
                align="right"
              />
              <AccountsColumnHeader label="Dr/Cr" colKey="side" sortable={false} align="center" />
            </AccountsTableHeadRow>
          </AccountsTableHead>
          <AccountsTableBody>
            <GeneralLedgerTableRow row={openingRow} />
            {transactionRows.length > 0 && columnFilteredRows.length === 0 ? (
              <AccountsTableRow>
                <AccountsTableCell colSpan={9} className="accounts-table-empty">
                  No records match the column filters.
                </AccountsTableCell>
              </AccountsTableRow>
            ) : (
              paginatedTransactions.map((row, i) => (
                <GeneralLedgerTableRow key={`${row.kind}-${row.date}-${i}`} row={row} />
              ))
            )}
            {closingRow ? <GeneralLedgerTableRow row={closingRow} /> : null}
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

function GeneralLedgerTableRow({ row }: { row: GeneralLedgerDisplayRow }) {
  const isOpening = row.kind === "opening";
  const isBalanceRow = row.kind === "opening" || row.kind === "closing";
  const drCrSide = resolveDrCrColumnSide({
    debit: row.debit,
    credit: row.credit,
    runningBalanceType: row.runningBalanceType,
    isBalanceRow,
  });

  return (
    <AccountsTableRow className={cn(isOpening && "bg-muted/20 font-medium")}>
      <AccountsTableCell className="whitespace-nowrap">{row.date}</AccountsTableCell>
      <AccountsTableCell className="whitespace-nowrap text-muted-foreground">
        {isOpening ? "Opening" : row.voucherType}
      </AccountsTableCell>
      <AccountsTableCell className="whitespace-nowrap">
        {isOpening || !row.voucherNo ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span className="font-mono text-xs font-semibold text-brand-700">{row.voucherNo}</span>
        )}
      </AccountsTableCell>
      <AccountsTableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
        {emptyCell(row.referenceNo)}
      </AccountsTableCell>
      <AccountsTableCell
        className={cn("max-w-[280px] truncate", isOpening && "font-semibold text-foreground")}
        title={row.particularsNarration}
      >
        {row.particularsNarration}
      </AccountsTableCell>
      <MoneyCell amount={row.debit} dashIfZero className="accounts-table-td" />
      <MoneyCell amount={row.credit} dashIfZero className="accounts-table-td" />
      <AccountsTableCell align="right" className="tabular-nums font-medium whitespace-nowrap">
        {formatMoney(row.runningBalance)}
      </AccountsTableCell>
      <AccountsTableCell align="center" className="whitespace-nowrap text-xs font-semibold">
        {balanceSideLabel(drCrSide)}
      </AccountsTableCell>
    </AccountsTableRow>
  );
}
