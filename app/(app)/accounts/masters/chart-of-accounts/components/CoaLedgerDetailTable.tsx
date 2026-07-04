"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { MoneyAmount, MoneyCell } from "@/components/accounts/MoneyAmount";
import { formatMoney } from "@/lib/accounts/money-format";
import { isoToDisplayDate } from "@/lib/accounts/date-display";
import type { CoaLedgerDetailRow } from "../coa-demo-accounting";
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

export interface CoaLedgerDetailFooter {
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  closingBalanceType: "Debit" | "Credit";
}

const COLUMNS = [
  { key: "date", label: "Date", align: "left" as const },
  { key: "voucherType", label: "Voucher Type", align: "left" as const },
  { key: "voucherNo", label: "Voucher No.", align: "left" as const },
  { key: "particulars", label: "Particulars", align: "left" as const },
  { key: "debit", label: "Debit", align: "right" as const },
  { key: "credit", label: "Credit", align: "right" as const },
  { key: "balance", label: "Balance", align: "right" as const },
  { key: "side", label: "Dr/Cr", align: "center" as const },
  { key: "narration", label: "Narration", align: "left" as const },
];

function particularsLabel(row: CoaLedgerDetailRow): string {
  if (row.isOpeningRow) return "Opening Balance";
  if (row.partyName) return row.partyName;
  return row.narration || "—";
}

export function CoaLedgerDetailTable({
  rows,
  footer,
  emptyLabel = "No transactions for this ledger in the selected period.",
}: {
  rows: CoaLedgerDetailRow[];
  footer?: CoaLedgerDetailFooter;
  emptyLabel?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="px-4 py-8 flex-1">
        <p className="text-sm text-muted-foreground text-center">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <AccountsTableScroll>
        <AccountsTable minWidth={1100}>
          <AccountsTableHead>
            <AccountsTableHeadRow>
              {COLUMNS.map((col) => (
                <AccountsTableHeadCell key={col.key} align={col.align}>
                  {col.label}
                </AccountsTableHeadCell>
              ))}
            </AccountsTableHeadRow>
          </AccountsTableHead>
          <AccountsTableBody>
            {rows.map((r, i) => (
              <AccountsTableRow
                key={`${r.voucherNo}-${r.date}-${i}`}
                className={cn(r.isOpeningRow && "font-medium bg-muted/10")}
              >
                <AccountsTableCell className="whitespace-nowrap tabular-nums">
                  {r.date ? isoToDisplayDate(r.date) : "—"}
                </AccountsTableCell>
                <AccountsTableCell className="whitespace-nowrap">{r.voucherType}</AccountsTableCell>
                <AccountsTableCell className="whitespace-nowrap font-mono text-xs text-brand-700 font-semibold">
                  {r.voucherNo || "—"}
                </AccountsTableCell>
                <AccountsTableCell className="max-w-[200px] truncate" title={particularsLabel(r)}>
                  {particularsLabel(r)}
                </AccountsTableCell>
                <MoneyCell amount={r.debit} dashIfZero className="accounts-table-td" />
                <MoneyCell amount={r.credit} dashIfZero className="accounts-table-td" />
                <AccountsTableCell align="right" className="tabular-nums font-medium whitespace-nowrap">
                  {r.runningBalance > 0 ? formatMoney(r.runningBalance) : "—"}
                </AccountsTableCell>
                <AccountsTableCell align="center" className="whitespace-nowrap">
                  {r.runningBalance > 0 ? (
                    <span
                      className={cn(
                        "text-[10px] font-semibold px-1.5 py-0.5 rounded",
                        r.runningBalanceType === "Debit"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-navy-50 text-navy-700",
                      )}
                    >
                      {r.runningBalanceType === "Debit" ? "Dr" : "Cr"}
                    </span>
                  ) : (
                    "—"
                  )}
                </AccountsTableCell>
                <AccountsTableCell className="max-w-[220px] truncate text-muted-foreground" title={r.narration}>
                  {r.narration || "—"}
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
