"use client";

import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { formatMoneyString } from "@/lib/accounts/money-format";
import type {
  GeneralLedgerApiRow,
  GeneralLedgerSummary,
} from "@/types/general-ledger.types";
import {
  formatApiMoneyOrDash,
  formatApiRunningBalance,
  formatGlDisplayDate,
} from "./general-ledger-api-view";

export function GeneralLedgerTable({
  openingRow,
  transactionRows,
  closingRow,
  summary,
  filtersActive,
  page,
  pageSize,
  totalTransactions,
  onPageChange,
  onPageSizeChange,
  onVoucherClick,
}: {
  openingRow: GeneralLedgerApiRow;
  transactionRows: GeneralLedgerApiRow[];
  closingRow: GeneralLedgerApiRow;
  summary: GeneralLedgerSummary;
  filtersActive: boolean;
  page: number;
  pageSize: number;
  totalTransactions: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onVoucherClick?: (row: GeneralLedgerApiRow) => void;
}) {
  const visibleTotals = filtersActive ? summary.filtered_period : summary.period;

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
            {transactionRows.map((row, i) => (
              <GeneralLedgerTableRow
                key={`${row.voucher_id ?? "tx"}-${row.date}-${i}`}
                row={row}
                onVoucherClick={onVoucherClick}
              />
            ))}
            <GeneralLedgerTableRow row={closingRow} />
          </AccountsTableBody>
          <AccountsTableFoot>
            <AccountsTableRow className="bg-muted/20 font-semibold border-t border-border/80">
              <AccountsTableCell colSpan={6} className="text-xs py-2 font-bold">
                Total
              </AccountsTableCell>
              <AccountsTableCell align="right" money className="py-2 font-bold">
                {formatMoneyString(visibleTotals.debit)}
              </AccountsTableCell>
              <AccountsTableCell align="right" money className="py-2 font-bold">
                {formatMoneyString(visibleTotals.credit)}
              </AccountsTableCell>
              <AccountsTableCell align="right" className="tabular-nums whitespace-nowrap py-2 text-xs font-bold">
                {formatApiRunningBalance(summary.closing.amount, summary.closing.side)}
              </AccountsTableCell>
              <AccountsTableCell />
            </AccountsTableRow>
            <AccountsTableRow className="bg-brand-50/30 font-semibold border-t-2 border-foreground/20">
              <AccountsTableCell colSpan={6} className="text-xs py-2 font-bold">
                Grand Total
              </AccountsTableCell>
              <AccountsTableCell align="right" money className="py-2 font-bold">
                {formatMoneyString(summary.grand_total.debit)}
              </AccountsTableCell>
              <AccountsTableCell align="right" money className="py-2 font-bold">
                {formatMoneyString(summary.grand_total.credit)}
              </AccountsTableCell>
              <AccountsTableCell colSpan={2} />
            </AccountsTableRow>
          </AccountsTableFoot>
        </AccountsTable>
      </AccountsTableScroll>
      {totalTransactions > 0 ? (
        <div className="flex-shrink-0 border-t border-border">
          <AccountsTablePagination
            page={page}
            pageSize={pageSize}
            totalRecords={totalTransactions}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            recordLabel="transactions"
          />
        </div>
      ) : null}
    </>
  );
}

function GeneralLedgerTableRow({
  row,
  onVoucherClick,
}: {
  row: GeneralLedgerApiRow;
  onVoucherClick?: (row: GeneralLedgerApiRow) => void;
}) {
  const isOpening = row.kind === "OPENING";
  const isClosing = row.kind === "CLOSING";
  const isBalanceRow = isOpening || isClosing;
  const canView = row.kind === "TRANSACTION" && Boolean(row.voucher_id) && Boolean(onVoucherClick);

  return (
    <AccountsTableRow
      className={cn(
        isOpening && "bg-muted/20 font-medium",
        isClosing && "bg-brand-50/40 font-medium",
        canView && "cursor-pointer hover:bg-muted/20 group",
      )}
      onClick={() => {
        if (canView) onVoucherClick?.(row);
      }}
    >
      <AccountsTableCell className="whitespace-nowrap">
        {formatGlDisplayDate(row.date)}
      </AccountsTableCell>
      <AccountsTableCell
        className={cn("max-w-[280px] truncate", isBalanceRow && "font-semibold")}
        title={row.narration ? `${row.particulars} — ${row.narration}` : row.particulars}
      >
        {row.particulars}
      </AccountsTableCell>
      <AccountsTableCell className="whitespace-nowrap text-muted-foreground">
        {isOpening ? "Opening" : isClosing ? "—" : row.transaction_type || row.voucher_type || "—"}
      </AccountsTableCell>
      <AccountsTableCell className="whitespace-nowrap">
        {isBalanceRow || !row.voucher_number ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span className="font-mono text-xs font-semibold text-brand-700">{row.voucher_number}</span>
        )}
      </AccountsTableCell>
      <AccountsTableCell className="whitespace-nowrap tabular-nums text-[11px]">
        {isBalanceRow || !row.bank_date ? "—" : formatGlDisplayDate(row.bank_date)}
      </AccountsTableCell>
      <AccountsTableCell className="whitespace-nowrap text-[11px]">
        {isBalanceRow || !row.recon_status ? "—" : row.recon_status}
      </AccountsTableCell>
      <AccountsTableCell align="right" money>
        {formatApiMoneyOrDash(row.debit)}
      </AccountsTableCell>
      <AccountsTableCell align="right" money>
        {formatApiMoneyOrDash(row.credit)}
      </AccountsTableCell>
      <AccountsTableCell align="right" className="tabular-nums font-medium whitespace-nowrap">
        {formatApiRunningBalance(row.running_balance, row.running_balance_side)}
      </AccountsTableCell>
      <AccountsTableCell align="center" className="w-10">
        {canView ? (
          <button
            type="button"
            className="p-1 rounded-md text-muted-foreground hover:text-brand-600 hover:bg-brand-50 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onVoucherClick?.(row);
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
