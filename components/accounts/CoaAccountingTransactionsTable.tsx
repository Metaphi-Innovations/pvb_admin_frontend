"use client";

import React from "react";
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
  AccountsTableHeadCell,
  AccountsTableHeadRow,
  AccountsTableRow,
  AccountsTableScroll,
} from "@/components/accounts/AccountsTable";

export interface LedgerStatementFooter {
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  closingBalanceType: "Debit" | "Credit";
}

const LEDGER_DETAIL_COLUMNS = [
  { key: "date", label: "Date", align: "left" as const },
  { key: "voucherNo", label: "Voucher No.", align: "left" as const },
  { key: "voucherType", label: "Voucher Type", align: "left" as const },
  { key: "narration", label: "Particulars / Narration", align: "left" as const },
  { key: "debit", label: "Debit (₹)", align: "right" as const },
  { key: "credit", label: "Credit (₹)", align: "right" as const },
  { key: "running", label: "Running Balance (Dr/Cr)", align: "right" as const },
];

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

  const compactColumns = [
    "Date",
    "Voucher No.",
    "Voucher Type",
    "Particulars / Narration",
    "Debit (₹)",
    "Credit (₹)",
    ...(showRunningBalance ? ["Running Balance (Dr/Cr)"] : []),
  ];

  if (rows.length === 0) {
    return (
      <div className={cn(isLedgerDetail && "px-4 py-8 flex-1")}>
        <p className="text-sm text-muted-foreground text-center">{emptyLabel}</p>
      </div>
    );
  }

  if (isLedgerDetail) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <AccountsTableScroll>
          <AccountsTable minWidth={900}>
            <AccountsTableHead>
              <AccountsTableHeadRow>
                {LEDGER_DETAIL_COLUMNS.map((col) => (
                  <AccountsTableHeadCell key={col.key} align={col.align}>
                    {col.label}
                  </AccountsTableHeadCell>
                ))}
              </AccountsTableHeadRow>
            </AccountsTableHead>
            <AccountsTableBody>
              {rows.map((r, i) => (
                <AccountsTableRow
                  key={`${r.voucherNo}-${r.date}-${r.referenceNo}-${i}`}
                  className={cn(r.isOpeningRow && "font-medium")}
                >
                  <AccountsTableCell className="whitespace-nowrap">{r.date || "—"}</AccountsTableCell>
                  <AccountsTableCell className="whitespace-nowrap">
                    <VoucherNoCell row={r} />
                  </AccountsTableCell>
                  <AccountsTableCell className="whitespace-nowrap">{r.voucherType}</AccountsTableCell>
                  <AccountsTableCell className="max-w-[280px]">
                    <NarrationCell text={r.narration} />
                  </AccountsTableCell>
                  <MoneyCell amount={r.debit} dashIfZero className="accounts-table-td" />
                  <MoneyCell amount={r.credit} dashIfZero className="accounts-table-td" />
                  <AccountsTableCell align="right" className="tabular-nums font-medium whitespace-nowrap">
                    <MoneyAmount
                      amount={r.runningBalance}
                      side={r.runningBalanceType}
                      sideBadge
                      className="text-xs justify-end"
                    />
                  </AccountsTableCell>
                </AccountsTableRow>
              ))}
            </AccountsTableBody>
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
    );
  }

  return (
    <AccountsTableScroll className="overflow-x-auto">
      <AccountsTable className="text-sm">
        <AccountsTableHead>
          <AccountsTableHeadRow>
            {compactColumns.map((h) => (
              <AccountsTableHeadCell
                key={h}
                align={
                  h.startsWith("Debit") || h.startsWith("Credit") || h.startsWith("Running")
                    ? "right"
                    : "left"
                }
              >
                {h}
              </AccountsTableHeadCell>
            ))}
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {rows.map((r, i) => (
            <AccountsTableRow key={`${r.voucherNo}-${r.date}-${i}`} className="group">
              <AccountsTableCell className="whitespace-nowrap">{r.date}</AccountsTableCell>
              <AccountsTableCell className="whitespace-nowrap">
                <VoucherNoCell row={r} />
              </AccountsTableCell>
              <AccountsTableCell className="whitespace-nowrap">{r.voucherType}</AccountsTableCell>
              <AccountsTableCell className="text-muted-foreground max-w-[240px] truncate" title={r.narration}>
                {r.narration}
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
          ))}
        </AccountsTableBody>
      </AccountsTable>
    </AccountsTableScroll>
  );
}
