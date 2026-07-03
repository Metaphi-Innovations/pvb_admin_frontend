"use client";

import { cn } from "@/lib/utils";
import { MoneyCell } from "@/components/accounts/MoneyAmount";
import { balanceSideLabel, formatMoney } from "@/lib/accounts/money-format";
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
import type { GeneralLedgerDisplayRow } from "./general-ledger-data";

const COLUMNS = [
  { key: "date", label: "Date", align: "left" as const },
  { key: "type", label: "Voucher Type", align: "left" as const },
  { key: "voucher", label: "Voucher No.", align: "left" as const },
  { key: "reference", label: "Reference No.", align: "left" as const },
  { key: "particulars", label: "Particulars", align: "left" as const },
  { key: "debit", label: "Debit", align: "right" as const },
  { key: "credit", label: "Credit", align: "right" as const },
  { key: "balance", label: "Running Balance", align: "right" as const },
  { key: "side", label: "Dr/Cr", align: "center" as const },
];

function emptyCell(value: string) {
  return value && value !== "—" ? value : "—";
}

export function GeneralLedgerTable({
  openingRow,
  transactionRows,
}: {
  openingRow: GeneralLedgerDisplayRow;
  transactionRows: GeneralLedgerDisplayRow[];
}) {
  const rows = [openingRow, ...transactionRows];

  return (
    <AccountsTableScroll className="flex-1 min-h-0 h-full">
      <AccountsTable minWidth={960} className="text-xs">
        <AccountsTableHead>
          <AccountsTableHeadRow>
            {COLUMNS.map((col) => (
              <AccountsTableHeadCell key={col.key} align={col.align} className="whitespace-nowrap">
                {col.label}
              </AccountsTableHeadCell>
            ))}
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {rows.map((row, i) => (
            <GeneralLedgerTableRow key={`${row.kind}-${row.date}-${i}`} row={row} />
          ))}
        </AccountsTableBody>
      </AccountsTable>
    </AccountsTableScroll>
  );
}

function GeneralLedgerTableRow({ row }: { row: GeneralLedgerDisplayRow }) {
  const isOpening = row.kind === "opening";

  return (
    <AccountsTableRow className={cn(isOpening && "bg-muted/20 font-medium")}>
      <AccountsTableCell className="whitespace-nowrap">{row.date}</AccountsTableCell>
      <AccountsTableCell className="whitespace-nowrap text-muted-foreground">
        {isOpening ? "Opening" : row.voucherType}
      </AccountsTableCell>
      <AccountsTableCell className="whitespace-nowrap">
        {isOpening || !row.voucherNo ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span className="font-mono text-xs font-semibold text-brand-700">{row.voucherNo}</span>
        )}
      </AccountsTableCell>
      <AccountsTableCell className="whitespace-nowrap font-mono text-[11px] text-muted-foreground">
        {emptyCell(row.referenceNo)}
      </AccountsTableCell>
      <AccountsTableCell
        className={cn("max-w-[280px] truncate", isOpening && "font-semibold text-foreground")}
        title={row.particularsNarration}
      >
        {row.particularsNarration}
      </AccountsTableCell>
      <MoneyCell amount={row.debit} dashIfZero className="accounts-table-td" />
      <MoneyCell amount={row.credit} dashIfZero className="accounts-table-td" />
      <AccountsTableCell align="right" className="tabular-nums font-medium whitespace-nowrap">
        {formatMoney(row.runningBalance)}
      </AccountsTableCell>
      <AccountsTableCell align="center" className="whitespace-nowrap text-xs font-semibold">
        {balanceSideLabel(row.runningBalanceType)}
      </AccountsTableCell>
    </AccountsTableRow>
  );
}
