"use client";

import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { MoneyAmount, MoneyCell } from "@/components/accounts/MoneyAmount";
import { AccountsViewAction, accountsActionColClass } from "@/components/accounts/AccountsTableActions";
import type { GeneralLedgerRow } from "@/lib/accounts/general-ledger-data";
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
  AccountsColumnHeader,
  SortTh,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";

const COLUMN_CONFIG = {
  date: { type: "date" as const },
  voucher: { type: "text" as const },
  type: { type: "text" as const },
  particular: { type: "text" as const },
  debit: { type: "amount" as const },
  credit: { type: "amount" as const },
  balance: { type: "amount" as const },
};

function VoucherCell({
  row,
  onOpen,
}: {
  row: GeneralLedgerRow;
  onOpen?: (row: GeneralLedgerRow) => void;
}) {
  if (row.isOpeningRow || !onOpen) {
    return <span className="text-muted-foreground">{row.voucherNo}</span>;
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen(row);
      }}
      className="font-mono text-xs font-semibold text-brand-700 hover:underline text-left"
    >
      {row.voucherNo}
    </button>
  );
}

function GeneralLedgerTransactionsTableBody({
  toolbarRows,
  onRowClick,
}: {
  toolbarRows: GeneralLedgerRow[];
  onRowClick?: (row: GeneralLedgerRow) => void;
}) {
  const visible = useAccountsFilteredRows<GeneralLedgerRow>(toolbarRows);

  return (
    <AccountsTable minWidth={820} className="text-xs">
      <AccountsTableHead>
        <AccountsTableHeadRow>
          <SortTh label="Date" colKey="date" filterType="date" />
          <SortTh label="Voucher No." colKey="voucher" />
          <SortTh label="Voucher Type" colKey="type" />
          <SortTh label="Party / Particular" colKey="particular" />
          <SortTh label="Debit" colKey="debit" filterType="amount" align="right" />
          <SortTh label="Credit" colKey="credit" filterType="amount" align="right" />
          <SortTh label="Running Balance" colKey="balance" filterType="amount" align="right" />
          <AccountsColumnHeader
            label=""
            colKey="action"
            sortable={false}
            filterable={false}
            align="center"
            className={accountsActionColClass("single")}
          />
        </AccountsTableHeadRow>
      </AccountsTableHead>
      <AccountsTableBody>
        {visible.length === 0 ? (
          <AccountsTableRow>
            <AccountsTableCell colSpan={8} className="accounts-table-empty">
              No records match the column filters.
            </AccountsTableCell>
          </AccountsTableRow>
        ) : (
          visible.map((row, i) => (
            <AccountsTableRow
              key={`${row.voucherNo}-${row.date}-${i}`}
              className={cn(
                "group",
                row.isOpeningRow && "bg-muted/20 font-medium",
                onRowClick && !row.isOpeningRow && "cursor-pointer",
              )}
              onClick={() => !row.isOpeningRow && onRowClick?.(row)}
            >
              <AccountsTableCell className="whitespace-nowrap py-2">{row.date || "—"}</AccountsTableCell>
              <AccountsTableCell className="whitespace-nowrap py-2">
                <VoucherCell row={row} onOpen={onRowClick} />
              </AccountsTableCell>
              <AccountsTableCell className="whitespace-nowrap py-2 text-muted-foreground">
                {row.voucherType || "—"}
              </AccountsTableCell>
              <AccountsTableCell className="max-w-[200px] truncate py-2" title={row.contraLedger}>
                {row.contraLedger}
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
              <AccountsTableCell align="center" className={cn("py-2", accountsActionColClass("single"))}>
                {onRowClick && !row.isOpeningRow && (
                  <AccountsViewAction
                    title={`View ${row.voucherNo}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRowClick(row);
                    }}
                  />
                )}
              </AccountsTableCell>
            </AccountsTableRow>
          ))
        )}
      </AccountsTableBody>
    </AccountsTable>
  );
}

export function GeneralLedgerTransactionsTable({
  rows,
  emptyLabel = "No posted transactions for this ledger in the selected period.",
  onRowClick,
}: {
  rows: GeneralLedgerRow[];
  emptyLabel?: string;
  onRowClick?: (row: GeneralLedgerRow) => void;
}) {
  const getCellValue = useCallback((row: GeneralLedgerRow, key: string) => {
    switch (key) {
      case "voucher":
        return row.voucherNo;
      case "type":
        return row.voucherType;
      case "particular":
        return row.contraLedger;
      case "balance":
        return row.runningBalance;
      default:
        return (row as unknown as Record<string, unknown>)[key];
    }
  }, []);

  if (rows.length === 0) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <AccountsColumnFilterProvider
      rows={rows}
      getCellValue={getCellValue}
      columnConfig={COLUMN_CONFIG}
      defaultSortKey="date"
      defaultSortDir="asc"
    >
      <AccountsTableScroll className="flex-1 min-h-0 h-full">
        <GeneralLedgerTransactionsTableBody toolbarRows={rows} onRowClick={onRowClick} />
      </AccountsTableScroll>
    </AccountsColumnFilterProvider>
  );
}
