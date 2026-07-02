"use client";

import Link from "next/link";
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
import type { SupplierLedgerDisplayRow } from "./supplier-ledger-data";

const COLUMNS = [
  { key: "date", label: "Date", align: "left" as const },
  { key: "voucher", label: "Voucher No.", align: "left" as const },
  { key: "type", label: "Voucher Type", align: "left" as const },
  { key: "particular", label: "Particular", align: "left" as const },
  { key: "narration", label: "Narration", align: "left" as const },
  { key: "debit", label: "Debit", align: "right" as const },
  { key: "credit", label: "Credit", align: "right" as const },
  { key: "balance", label: "Running Balance", align: "right" as const },
];

export function SupplierLedgerTable({
  openingRow,
  transactionRows,
  closingRow,
}: {
  openingRow: SupplierLedgerDisplayRow;
  transactionRows: SupplierLedgerDisplayRow[];
  closingRow: SupplierLedgerDisplayRow;
}) {
  const rows = [openingRow, ...transactionRows, closingRow];

  return (
    <AccountsTableScroll className="flex-1 min-h-0 h-full">
      <AccountsTable minWidth={1040} className="text-xs">
        <AccountsTableHead>
          <AccountsTableHeadRow>
            {COLUMNS.map((col) => (
              <AccountsTableHeadCell key={col.key} align={col.align} sticky>
                {col.label}
              </AccountsTableHeadCell>
            ))}
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {rows.map((row, i) => (
            <SupplierLedgerTableRow key={`${row.kind}-${row.date}-${i}`} row={row} />
          ))}
        </AccountsTableBody>
      </AccountsTable>
    </AccountsTableScroll>
  );
}

function SupplierLedgerTableRow({ row }: { row: SupplierLedgerDisplayRow }) {
  const isSummary = row.kind === "opening" || row.kind === "closing";
  const isOpening = row.kind === "opening";

  return (
    <AccountsTableRow
      className={cn(
        "accounts-table-row-compact",
        isSummary && "bg-muted/20 font-medium",
        row.kind === "closing" && "bg-brand-50/40 border-t-2 border-brand-200",
      )}
    >
      <AccountsTableCell className="whitespace-nowrap py-2">{row.date}</AccountsTableCell>
      <AccountsTableCell className="whitespace-nowrap py-2">
        {isOpening ? (
          <span className="font-mono text-xs font-semibold text-brand-700">OB</span>
        ) : row.kind === "closing" ? (
          <span className="text-muted-foreground">—</span>
        ) : row.viewHref ? (
          <Link
            href={row.viewHref}
            className="font-mono text-xs font-semibold text-brand-700 hover:text-brand-800 hover:underline"
          >
            {row.voucherNo}
          </Link>
        ) : (
          <span className="font-mono text-xs font-semibold text-brand-700">{row.voucherNo}</span>
        )}
      </AccountsTableCell>
      <AccountsTableCell className="whitespace-nowrap py-2 text-muted-foreground">
        {isOpening ? "Opening Balance" : row.kind === "closing" ? "—" : row.voucherType}
      </AccountsTableCell>
      <AccountsTableCell
        className={cn("py-2", !isSummary && "max-w-[180px] truncate")}
        title={row.particular}
      >
        <span className={cn(isSummary && "text-xs font-semibold text-foreground")}>
          {row.particular}
        </span>
      </AccountsTableCell>
      <AccountsTableCell
        className={cn("py-2 text-muted-foreground", !isSummary && "max-w-[200px] truncate")}
        title={row.narration}
      >
        {row.narration}
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
