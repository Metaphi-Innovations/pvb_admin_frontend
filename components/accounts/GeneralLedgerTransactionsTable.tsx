"use client";

import { cn } from "@/lib/utils";
import { MoneyAmount, MoneyCell } from "@/components/accounts/MoneyAmount";
import { AccountsViewAction, accountsActionColClass } from "@/components/accounts/AccountsTableActions";
import type { GeneralLedgerRow } from "@/lib/accounts/general-ledger-data";
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

const COLUMNS = [
  { key: "date", label: "Date", align: "left" as const },
  { key: "voucher", label: "Voucher No.", align: "left" as const },
  { key: "type", label: "Voucher Type", align: "left" as const },
  { key: "particular", label: "Party / Particular", align: "left" as const },
  { key: "debit", label: "Debit", align: "right" as const },
  { key: "credit", label: "Credit", align: "right" as const },
  { key: "balance", label: "Running Balance", align: "right" as const },
  { key: "action", label: "", align: "center" as const },
];

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

export function GeneralLedgerTransactionsTable({
  rows,
  emptyLabel = "No posted transactions for this ledger in the selected period.",
  onRowClick,
}: {
  rows: GeneralLedgerRow[];
  emptyLabel?: string;
  onRowClick?: (row: GeneralLedgerRow) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <AccountsTableScroll className="flex-1 min-h-0 h-full">
      <AccountsTable minWidth={820} className="text-xs">
        <AccountsTableHead>
          <AccountsTableHeadRow>
            {COLUMNS.map((col) => (
              <AccountsTableHeadCell key={col.key} align={col.align} className={col.key === "action" ? accountsActionColClass("single") : undefined}>
                {col.label}
              </AccountsTableHeadCell>
            ))}
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {rows.map((row, i) => (
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
          ))}
        </AccountsTableBody>
      </AccountsTable>
    </AccountsTableScroll>
  );
}
