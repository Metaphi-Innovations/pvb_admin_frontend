"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { formatBalanceAmount, formatMoney } from "@/lib/accounts/money-format";
import { MoneyAmount, MoneyCell } from "@/components/accounts/MoneyAmount";
import { FinancialReportHeadCell } from "@/components/accounts/FinancialReportTableHead";
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const totals = useMemo(
    () => ({
      totalDebit: transactionRows.reduce((s, r) => s + r.debit, 0),
      totalCredit: transactionRows.reduce((s, r) => s + r.credit, 0),
    }),
    [transactionRows],
  );

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
            <CustomerLedgerTableRow row={openingRow} />
            {paginatedTransactions.map((row, i) => (
              <CustomerLedgerTableRow key={`${row.kind}-${row.date}-${i}`} row={row} />
            ))}
            <CustomerLedgerTableRow row={closingRow} />
          </AccountsTableBody>
          <AccountsTableFoot>
            <AccountsTableRow className="bg-muted/20 font-semibold border-t-2 border-foreground/20">
              <AccountsTableCell colSpan={5} className="text-xs text-foreground py-2 font-bold">
                Total
              </AccountsTableCell>
              <AccountsTableCell align="right" money className="py-2 font-bold">
                {formatMoney(totals.totalDebit)}
              </AccountsTableCell>
              <AccountsTableCell align="right" money className="py-2 font-bold">
                {formatMoney(totals.totalCredit)}
              </AccountsTableCell>
              <AccountsTableCell align="right" className="tabular-nums whitespace-nowrap py-2">
                <MoneyAmount
                  amount={closingRow.runningBalance}
                  side={closingRow.runningBalanceType}
                  sideBadge
                  className="text-xs justify-end font-bold"
                />
              </AccountsTableCell>
            </AccountsTableRow>
          </AccountsTableFoot>
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

function CustomerLedgerTableRow({ row }: { row: CustomerLedgerDisplayRow }) {
  const isSummary = row.kind === "opening" || row.kind === "closing";

  return (
    <AccountsTableRow
      className={cn(
        isSummary && "bg-muted/20 font-semibold",
        row.kind === "closing" && "border-t border-border/80",
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
            className={cn("text-xs justify-end", row.kind === "closing" && "font-bold")}
          />
        )}
      </AccountsTableCell>
    </AccountsTableRow>
  );
}
