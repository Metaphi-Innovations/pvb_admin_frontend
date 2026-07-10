"use client";

import React, { useCallback } from "react";
import { cn } from "@/lib/utils";
import { MoneyAmount, MoneyCell } from "@/components/accounts/MoneyAmount";
import { formatMoney } from "@/lib/accounts/money-format";
import { DrCrSideBadge } from "@/components/accounts/DrCrSideBadge";
import { isoToDisplayDate } from "@/lib/accounts/date-display";
import type { CoaLedgerDetailRow } from "../coa-demo-accounting";
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
  AccountsColumnHeader,
  useAccountsFilteredRows,
} from "../../../components/AccountsUI";

export interface CoaLedgerDetailFooter {
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  closingBalanceType: "Debit" | "Credit";
}

function particularsLabel(row: CoaLedgerDetailRow): string {
  if (row.isOpeningRow) return "Opening Balance";
  if (row.partyName) return row.partyName;
  return row.narration || "—";
}

function CoaLedgerDetailTableBody({
  rows,
  footer,
  emptyLabel,
}: {
  rows: CoaLedgerDetailRow[];
  footer?: CoaLedgerDetailFooter;
  emptyLabel: string;
}) {
  const visible = useAccountsFilteredRows(rows);

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
              <SortTh label="Date" colKey="date" filterType="date" />
              <SortTh label="Voucher Type" colKey="voucherType" />
              <SortTh label="Voucher No." colKey="voucherNo" />
              <SortTh label="Particulars" colKey="particulars" />
              <SortTh label="Debit" colKey="debit" filterType="amount" align="right" />
              <SortTh label="Credit" colKey="credit" filterType="amount" align="right" />
              <SortTh label="Balance" colKey="runningBalance" filterType="amount" align="right" />
              <AccountsColumnHeader label="Dr/Cr" colKey="runningBalanceType" sortable={false} align="center" />
              <SortTh label="Narration" colKey="narration" />
            </AccountsTableHeadRow>
          </AccountsTableHead>
          <AccountsTableBody>
            {visible.length === 0 ? (
              <AccountsTableRow>
                <AccountsTableCell colSpan={9} className="accounts-table-empty">
                  No records match the column filters.
                </AccountsTableCell>
              </AccountsTableRow>
            ) : (
              visible.map((r, i) => (
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
                      <DrCrSideBadge
                        debit={r.debit}
                        credit={r.credit}
                        runningBalanceType={r.runningBalanceType}
                        isBalanceRow={Boolean(r.isOpeningRow)}
                      />
                    ) : (
                      "—"
                    )}
                  </AccountsTableCell>
                  <AccountsTableCell className="max-w-[220px] truncate text-muted-foreground" title={r.narration}>
                    {r.narration || "—"}
                  </AccountsTableCell>
                </AccountsTableRow>
              ))
            )}
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

export function CoaLedgerDetailTable({
  rows,
  footer,
  emptyLabel = "No transactions for this ledger in the selected period.",
}: {
  rows: CoaLedgerDetailRow[];
  footer?: CoaLedgerDetailFooter;
  emptyLabel?: string;
}) {
  const getCellValue = useCallback((row: CoaLedgerDetailRow, key: string) => {
    switch (key) {
      case "particulars":
        return particularsLabel(row);
      case "date":
        return row.date;
      default:
        return (row as unknown as Record<string, unknown>)[key];
    }
  }, []);

  return (
    <AccountsColumnFilterProvider
      rows={rows}
      getCellValue={getCellValue}
      columnConfig={{
        date: { type: "date" },
        voucherType: { type: "text" },
        voucherNo: { type: "text" },
        particulars: { type: "text" },
        debit: { type: "amount" },
        credit: { type: "amount" },
        runningBalance: { type: "amount" },
        runningBalanceType: { type: "text" },
        narration: { type: "text" },
      }}
      defaultSortKey="date"
      defaultSortDir="asc"
    >
      <CoaLedgerDetailTableBody rows={rows} footer={footer} emptyLabel={emptyLabel} />
    </AccountsColumnFilterProvider>
  );
}
