"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatBalanceAmount, formatMoney } from "@/lib/accounts/money-format";
import { MoneyAmount, MoneyCell } from "@/components/accounts/MoneyAmount";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableFoot,
  AccountsTableHead,
  AccountsTableHeadCell,
  AccountsTableHeadRow,
  AccountsTableRow,
  AccountsTableScroll,
} from "@/components/accounts/AccountsTable";
import type { CustomerLedgerDisplayRow } from "./customer-ledger-data";

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

export function CustomerLedgerTable({
  openingRow,
  transactionRows,
  closingRow,
  totalDebit,
  totalCredit,
}: {
  openingRow: CustomerLedgerDisplayRow;
  transactionRows: CustomerLedgerDisplayRow[];
  closingRow: CustomerLedgerDisplayRow;
  totalDebit: number;
  totalCredit: number;
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
            <CustomerLedgerTableRow key={`${row.kind}-${row.date}-${i}`} row={row} />
          ))}
        </AccountsTableBody>
        <AccountsTableFoot>
          <AccountsTableRow className="bg-muted/20 font-semibold">
            <AccountsTableCell colSpan={5} className="text-xs text-foreground py-2">
              Total
            </AccountsTableCell>
            <AccountsTableCell align="right" money className="py-2">
              {formatMoney(totalDebit)}
            </AccountsTableCell>
            <AccountsTableCell align="right" money className="py-2">
              {formatMoney(totalCredit)}
            </AccountsTableCell>
            <AccountsTableCell align="right" className="tabular-nums whitespace-nowrap py-2">
              <MoneyAmount
                amount={closingRow.runningBalance}
                side={closingRow.runningBalanceType}
                sideBadge
                className="text-xs justify-end font-semibold"
              />
            </AccountsTableCell>
          </AccountsTableRow>
        </AccountsTableFoot>
      </AccountsTable>
    </AccountsTableScroll>
  );
}

function CustomerLedgerTableRow({ row }: { row: CustomerLedgerDisplayRow }) {
  const isSummary = row.kind === "opening" || row.kind === "closing";

  return (
    <AccountsTableRow
      className={cn(
        isSummary && "bg-muted/20 font-medium",
        row.kind === "closing" && "bg-brand-50/40",
      )}
    >
      <AccountsTableCell className="whitespace-nowrap py-2">{row.date}</AccountsTableCell>
      <AccountsTableCell className="whitespace-nowrap py-2">
        {row.voucherNo === "—" ? (
          <span className="text-muted-foreground">—</span>
        ) : row.voucherHref ? (
          <Link
            href={row.voucherHref}
            className="font-mono text-xs font-semibold text-brand-700 hover:underline"
          >
            {row.voucherNo}
          </Link>
        ) : (
          <span className="font-mono text-xs font-semibold text-brand-700">{row.voucherNo}</span>
        )}
      </AccountsTableCell>
      <AccountsTableCell className="whitespace-nowrap py-2">{row.voucherType}</AccountsTableCell>
      <AccountsTableCell
        className={cn("py-2 max-w-[180px] truncate", isSummary && "text-muted-foreground")}
        title={row.particular}
      >
        {row.particular}
      </AccountsTableCell>
      <AccountsTableCell
        className="py-2 max-w-[220px] truncate text-muted-foreground"
        title={row.narration}
      >
        {row.narration}
      </AccountsTableCell>
      <MoneyCell amount={row.debit} dashIfZero className="accounts-table-td py-2" />
      <MoneyCell amount={row.credit} dashIfZero className="accounts-table-td py-2" />
      <AccountsTableCell align="right" className="tabular-nums font-medium whitespace-nowrap py-2">
        {isSummary && row.kind === "opening" ? (
          <span className="text-xs">
            {formatBalanceAmount(row.runningBalance, row.runningBalanceType)}
          </span>
        ) : (
          <MoneyAmount
            amount={row.runningBalance}
            side={row.runningBalanceType}
            sideBadge
            className={cn("text-xs justify-end", row.kind === "closing" && "font-semibold")}
          />
        )}
      </AccountsTableCell>
    </AccountsTableRow>
  );
}
