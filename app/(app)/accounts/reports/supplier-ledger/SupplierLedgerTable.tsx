"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { MoneyAmount, MoneyCell } from "@/components/accounts/MoneyAmount";
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const paginatedTransactions = useMemo(() => {
    const start = (page - 1) * pageSize;
    return transactionRows.slice(start, start + pageSize);
  }, [transactionRows, page, pageSize]);

  return (
    <>
      <AccountsTableScroll className="flex-1 min-h-0 h-full">
        <AccountsTable minWidth={1040} className="text-xs financial-report">
          <AccountsTableHead>
            <AccountsTableHeadRow>
              <FinancialReportHeadCell>Date</FinancialReportHeadCell>
              <FinancialReportHeadCell>Voucher No.</FinancialReportHeadCell>
              <FinancialReportHeadCell>Voucher Type</FinancialReportHeadCell>
              <FinancialReportHeadCell>Particular</FinancialReportHeadCell>
              <FinancialReportHeadCell>Narration</FinancialReportHeadCell>
              <FinancialReportHeadCell align="right">Debit</FinancialReportHeadCell>
              <FinancialReportHeadCell align="right">Credit</FinancialReportHeadCell>
              <FinancialReportHeadCell align="right">Running Balance</FinancialReportHeadCell>
            </AccountsTableHeadRow>
          </AccountsTableHead>
          <AccountsTableBody>
            <SupplierLedgerTableRow row={openingRow} />
            {paginatedTransactions.map((row, i) => (
              <SupplierLedgerTableRow key={`${row.kind}-${row.date}-${i}`} row={row} />
            ))}
            <SupplierLedgerTableRow row={closingRow} />
          </AccountsTableBody>
        </AccountsTable>
      </AccountsTableScroll>
      {transactionRows.length > 0 && (
        <div className="flex-shrink-0 border-t border-border">
          <AccountsTablePagination
            page={page}
            pageSize={pageSize}
            totalRecords={transactionRows.length}
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
        isSummary && "bg-muted/20 font-semibold",
        row.kind === "closing" && "border-t-2 border-foreground/20",
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
          className={cn("text-xs justify-end", row.kind === "closing" && "font-bold")}
        />
      </AccountsTableCell>
    </AccountsTableRow>
  );
}
