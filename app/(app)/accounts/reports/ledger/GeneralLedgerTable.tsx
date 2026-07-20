"use client";

import { useMemo, useState } from "react";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { MoneyCell } from "@/components/accounts/MoneyAmount";
import { formatBalanceAmount, formatMoney } from "@/lib/accounts/money-format";
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
import type { GeneralLedgerDisplayRow, GeneralLedgerSummary } from "./general-ledger-data";
import { useBankReconDisplay } from "@/components/accounts/useBankReconDisplay";

export function GeneralLedgerTable({
  openingRow,
  transactionRows,
  closingRow,
  summary,
  onVoucherClick,
}: {
  openingRow: GeneralLedgerDisplayRow;
  transactionRows: GeneralLedgerDisplayRow[];
  closingRow?: GeneralLedgerDisplayRow;
  summary: GeneralLedgerSummary;
  onVoucherClick?: (row: GeneralLedgerDisplayRow) => void;
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
        <AccountsTable minWidth={1140} className="text-xs financial-report">
          <AccountsTableHead>
            <AccountsTableHeadRow>
              <FinancialReportHeadCell>Date</FinancialReportHeadCell>
              <FinancialReportHeadCell>Particulars</FinancialReportHeadCell>
              <FinancialReportHeadCell>Transaction Type</FinancialReportHeadCell>
              <FinancialReportHeadCell>Voucher No.</FinancialReportHeadCell>
              <FinancialReportHeadCell>Bank Date</FinancialReportHeadCell>
              <FinancialReportHeadCell>Recon Status</FinancialReportHeadCell>
              <FinancialReportHeadCell align="right">Debit</FinancialReportHeadCell>
              <FinancialReportHeadCell align="right">Credit</FinancialReportHeadCell>
              <FinancialReportHeadCell align="right">Running Balance</FinancialReportHeadCell>
              <FinancialReportHeadCell align="center" className="w-10">
                <span className="sr-only">View</span>
              </FinancialReportHeadCell>
            </AccountsTableHeadRow>
          </AccountsTableHead>
          <AccountsTableBody>
            <GeneralLedgerTableRow row={openingRow} />
            {paginatedTransactions.map((row, i) => (
              <GeneralLedgerTableRow
                key={`${row.kind}-${row.date}-${row.voucherNo}-${i}`}
                row={row}
                onVoucherClick={onVoucherClick}
              />
            ))}
            {closingRow ? <GeneralLedgerTableRow row={closingRow} /> : null}
          </AccountsTableBody>
          <AccountsTableFoot>
            <AccountsTableRow className="bg-muted/20 font-semibold border-t border-border/80">
              <AccountsTableCell colSpan={6} className="text-xs py-2 font-bold">
                Total
              </AccountsTableCell>
              <AccountsTableCell align="right" money className="py-2 font-bold">
                {formatMoney(summary.totalDebit)}
              </AccountsTableCell>
              <AccountsTableCell align="right" money className="py-2 font-bold">
                {formatMoney(summary.totalCredit)}
              </AccountsTableCell>
              <AccountsTableCell align="right" className="tabular-nums whitespace-nowrap py-2 text-xs font-bold">
                {formatBalanceAmount(summary.closingBalance, summary.closingBalanceType)}
              </AccountsTableCell>
              <AccountsTableCell />
            </AccountsTableRow>
            <AccountsTableRow className="bg-brand-50/30 font-semibold border-t-2 border-foreground/20">
              <AccountsTableCell colSpan={6} className="text-xs py-2 font-bold">
                Grand Total
              </AccountsTableCell>
              <AccountsTableCell align="right" money className="py-2 font-bold">
                {formatMoney(summary.grandTotalDebit)}
              </AccountsTableCell>
              <AccountsTableCell align="right" money className="py-2 font-bold">
                {formatMoney(summary.grandTotalCredit)}
              </AccountsTableCell>
              <AccountsTableCell colSpan={2} />
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

function GeneralLedgerTableRow({
  row,
  onVoucherClick,
}: {
  row: GeneralLedgerDisplayRow;
  onVoucherClick?: (row: GeneralLedgerDisplayRow) => void;
}) {
  const isOpening = row.kind === "opening";
  const isClosing = row.kind === "closing";
  const isBalanceRow = isOpening || isClosing;
  const canDrill = row.kind === "transaction" && row.voucherId && onVoucherClick;
  const recon = useBankReconDisplay(
    isBalanceRow ? null : row.voucherId,
    isBalanceRow ? null : row.voucherNo,
  );

  return (
    <AccountsTableRow
      className={cn(
        isOpening && "bg-muted/20 font-medium",
        isClosing && "bg-brand-50/40 font-medium",
        canDrill && "cursor-pointer hover:bg-muted/20 group",
      )}
      onClick={() => {
        if (canDrill) onVoucherClick(row);
      }}
    >
      <AccountsTableCell className="whitespace-nowrap">{row.date}</AccountsTableCell>
      <AccountsTableCell
        className={cn("max-w-[280px] truncate", isBalanceRow && "font-semibold")}
        title={row.particulars}
      >
        {row.particulars}
      </AccountsTableCell>
      <AccountsTableCell className="whitespace-nowrap text-muted-foreground">
        {isOpening ? "Opening" : isClosing ? "—" : row.transactionType || row.voucherType}
      </AccountsTableCell>
      <AccountsTableCell className="whitespace-nowrap">
        {isBalanceRow || !row.voucherNo ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span className="font-mono text-xs font-semibold text-brand-700">{row.voucherNo}</span>
        )}
      </AccountsTableCell>
      <AccountsTableCell className="whitespace-nowrap tabular-nums text-[11px]">
        {isBalanceRow ? "—" : recon.isReconciled && recon.bankDate ? recon.bankDate : "—"}
      </AccountsTableCell>
      <AccountsTableCell className="whitespace-nowrap text-[11px]">
        {isBalanceRow ? "—" : recon.statusLabel}
      </AccountsTableCell>
      <MoneyCell amount={row.debit} dashIfZero className="accounts-table-td" />
      <MoneyCell amount={row.credit} dashIfZero className="accounts-table-td" />
      <AccountsTableCell align="right" className="tabular-nums font-medium whitespace-nowrap">
        {formatBalanceAmount(row.runningBalance, row.runningBalanceType)}
      </AccountsTableCell>
      <AccountsTableCell align="center" className="w-10">
        {canDrill ? (
          <button
            type="button"
            className="p-1 rounded-md text-muted-foreground hover:text-brand-600 hover:bg-brand-50 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onVoucherClick(row);
            }}
            aria-label="View voucher details"
          >
            <Eye className="w-4 h-4" />
          </button>
        ) : null}
      </AccountsTableCell>
    </AccountsTableRow>
  );
}
