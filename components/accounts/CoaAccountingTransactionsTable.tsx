"use client";

import React, { useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { MoneyAmount, MoneyCell } from "@/components/accounts/MoneyAmount";
import { formatMoney } from "@/lib/accounts/money-format";
import type { CoaTransactionRow } from "@/lib/accounts/coa-accounting-view";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableHead,
  AccountsTableHeadRow,
  AccountsTableRow,
  AccountsTableScroll,
} from "@/components/accounts/AccountsTable";
import {
  AccountsColumnFilterProvider,
  SortTh,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";

export interface LedgerStatementFooter {
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  closingBalanceType: "Debit" | "Credit";
}

const COLUMN_CONFIG = {
  date: { type: "date" as const },
  voucherNo: { type: "text" as const },
  voucherType: { type: "text" as const },
  narration: { type: "text" as const },
  debit: { type: "amount" as const },
  credit: { type: "amount" as const },
  running: { type: "amount" as const },
};

function NarrationCell({ text }: { text: string }) {
  const display = text || "—";
  const truncated = display.length > 48;
  return (
    <span
      className="block truncate max-w-[280px] text-foreground"
      title={truncated ? display : undefined}
    >
      {display}
    </span>
  );
}

function VoucherNoCell({ row }: { row: CoaTransactionRow }) {
  const href = row.viewHref ?? (row.voucherId ? `/accounts/vouchers/view/${row.voucherId}` : null);

  if (row.isOpeningRow || !href) {
    return <span className="text-muted-foreground">{row.voucherNo}</span>;
  }

  return (
    <Link href={href} className="font-mono text-xs font-semibold text-brand-700 hover:underline">
      {row.voucherNo}
    </Link>
  );
}

function CoaTransactionsTableBody({
  rows,
  showRunningBalance,
}: {
  rows: CoaTransactionRow[];
  showRunningBalance: boolean;
}) {
  const visible = useAccountsFilteredRows<CoaTransactionRow>(rows);

  return (
    <>
      <AccountsTableHead>
        <AccountsTableHeadRow>
          <SortTh label="Date" colKey="date" filterType="date" />
          <SortTh label="Voucher No." colKey="voucherNo" />
          <SortTh label="Voucher Type" colKey="voucherType" />
          <SortTh label="Particulars / Narration" colKey="narration" />
          <SortTh label="Debit (₹)" colKey="debit" filterType="amount" align="right" />
          <SortTh label="Credit (₹)" colKey="credit" filterType="amount" align="right" />
          {showRunningBalance && (
            <SortTh label="Running Balance (Dr/Cr)" colKey="running" filterType="amount" align="right" />
          )}
        </AccountsTableHeadRow>
      </AccountsTableHead>
      <AccountsTableBody>
        {visible.length === 0 ? (
          <AccountsTableRow>
            <AccountsTableCell colSpan={showRunningBalance ? 7 : 6} className="accounts-table-empty">
              No records match the column filters.
            </AccountsTableCell>
          </AccountsTableRow>
        ) : (
          visible.map((r, i) => (
            <AccountsTableRow
              key={`${r.voucherNo}-${r.date}-${r.referenceNo}-${i}`}
              className={cn(r.isOpeningRow && "font-medium", !showRunningBalance && "group")}
            >
              <AccountsTableCell className="whitespace-nowrap">{r.date || "—"}</AccountsTableCell>
              <AccountsTableCell className="whitespace-nowrap">
                <VoucherNoCell row={r} />
              </AccountsTableCell>
              <AccountsTableCell className="whitespace-nowrap">{r.voucherType}</AccountsTableCell>
              <AccountsTableCell className={showRunningBalance ? "max-w-[280px]" : "text-muted-foreground max-w-[240px] truncate"} title={r.narration}>
                {showRunningBalance ? <NarrationCell text={r.narration} /> : r.narration}
              </AccountsTableCell>
              <MoneyCell amount={r.debit} dashIfZero className="accounts-table-td" />
              <MoneyCell amount={r.credit} dashIfZero className="accounts-table-td" />
              {showRunningBalance && (
                <AccountsTableCell align="right" className="tabular-nums font-medium whitespace-nowrap">
                  <MoneyAmount
                    amount={r.runningBalance}
                    side={r.runningBalanceType}
                    sideBadge
                    className="text-xs justify-end"
                  />
                </AccountsTableCell>
              )}
            </AccountsTableRow>
          ))
        )}
      </AccountsTableBody>
    </>
  );
}

export function CoaAccountingTransactionsTable({
  rows,
  emptyLabel = "No transactions yet.",
  showRunningBalance = true,
  footer,
  variant = "compact",
}: {
  rows: CoaTransactionRow[];
  emptyLabel?: string;
  showRunningBalance?: boolean;
  footer?: LedgerStatementFooter;
  /** ledger-detail: full account statement layout with footer; compact: group recent activity */
  variant?: "ledger-detail" | "compact";
  paginate?: boolean;
  defaultPageSize?: number;
}) {
  const isLedgerDetail = variant === "ledger-detail";

  const getCellValue = useCallback((row: CoaTransactionRow, key: string) => {
    if (key === "running") return row.runningBalance;
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  if (rows.length === 0) {
    return (
      <div className={cn(isLedgerDetail && "px-4 py-8 flex-1")}>
        <p className="text-sm text-muted-foreground text-center">{emptyLabel}</p>
      </div>
    );
  }

  if (isLedgerDetail) {
    return (
      <AccountsColumnFilterProvider
        rows={rows}
        getCellValue={getCellValue}
        columnConfig={COLUMN_CONFIG}
        defaultSortKey="date"
        defaultSortDir="asc"
      >
        <div className="flex flex-col flex-1 min-h-0">
          <AccountsTableScroll>
            <AccountsTable minWidth={900}>
              <CoaTransactionsTableBody rows={rows} showRunningBalance />
            </AccountsTable>
          </AccountsTableScroll>

          {footer && (
            <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-1 px-4 py-2.5 border-t border-border bg-muted/20 text-xs flex-shrink-0">
              <span className="tabular-nums">
                <span className="text-muted-foreground">Total Debit: </span>
                <span className="font-semibold text-foreground">{formatMoney(footer.totalDebit)}</span>
              </span>
              <span className="tabular-nums">
                <span className="text-muted-foreground">Total Credit: </span>
                <span className="font-semibold text-foreground">{formatMoney(footer.totalCredit)}</span>
              </span>
              <span className="tabular-nums">
                <span className="text-muted-foreground">Closing Balance: </span>
                <MoneyAmount
                  amount={footer.closingBalance}
                  side={footer.closingBalanceType}
                  sideBadge
                  className="inline text-xs font-semibold"
                />
              </span>
            </div>
          )}
        </div>
      </AccountsColumnFilterProvider>
    );
  }

  return (
    <AccountsColumnFilterProvider
      rows={rows}
      getCellValue={getCellValue}
      columnConfig={COLUMN_CONFIG}
      defaultSortKey="date"
      defaultSortDir="desc"
    >
      <AccountsTableScroll className="overflow-x-auto">
        <AccountsTable className="text-sm">
          <CoaTransactionsTableBody rows={rows} showRunningBalance={showRunningBalance} />
        </AccountsTable>
      </AccountsTableScroll>
    </AccountsColumnFilterProvider>
  );
}
