"use client";

import { cn } from "@/lib/utils";
import { MoneyAmount, MoneyCell } from "@/components/accounts/MoneyAmount";
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
  { key: "voucher", label: "Voucher No.", align: "left" as const },
  { key: "type", label: "Voucher Type", align: "left" as const },
  { key: "particular", label: "Particular", align: "left" as const },
  { key: "debit", label: "Debit", align: "right" as const },
  { key: "credit", label: "Credit", align: "right" as const },
  { key: "balance", label: "Running Balance", align: "right" as const },
];

export function GeneralLedgerTable({
  openingRow,
  transactionRows,
  closingRow,
}: {
  openingRow: GeneralLedgerDisplayRow;
  transactionRows: GeneralLedgerDisplayRow[];
  closingRow: GeneralLedgerDisplayRow;
}) {
  const rows = [openingRow, ...transactionRows, closingRow];

  return (
    <AccountsTableScroll className="flex-1 min-h-0 h-full">
      <AccountsTable minWidth={900} className="text-xs">
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
          {rows.map((row, i) => (
            <GeneralLedgerTableRow key={`${row.kind}-${row.date}-${i}`} row={row} />
          ))}
        </AccountsTableBody>
      </AccountsTable>
    </AccountsTableScroll>
  );
}

function GeneralLedgerTableRow({ row }: { row: GeneralLedgerDisplayRow }) {
  const isSummary = row.kind === "opening" || row.kind === "closing";

  return (
    <AccountsTableRow
      className={cn(
        "accounts-table-row-compact",
        isSummary && "bg-muted/20 font-medium",
      )}
    >
      <AccountsTableCell className="whitespace-nowrap py-2">
        {isSummary ? "—" : row.date}
      </AccountsTableCell>
      <AccountsTableCell className="whitespace-nowrap py-2">
        {isSummary ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span className="font-mono text-xs font-semibold text-brand-700">{row.voucherNo}</span>
        )}
      </AccountsTableCell>
      <AccountsTableCell className="whitespace-nowrap py-2 text-muted-foreground">
        {isSummary ? "—" : row.voucherType}
      </AccountsTableCell>
      <AccountsTableCell
        className={cn("py-2", !isSummary && "max-w-[220px] truncate")}
        title={isSummary ? row.particular : `${row.particular}${row.narration ? ` — ${row.narration}` : ""}`}
      >
        <span className={cn(isSummary && "text-xs font-semibold text-foreground")}>{row.particular}</span>
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
    </AccountsTableRow>
  );
}
