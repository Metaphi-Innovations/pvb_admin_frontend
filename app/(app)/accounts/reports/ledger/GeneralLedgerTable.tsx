"use client";

import { cn } from "@/lib/utils";
import { MoneyAmount, MoneyCell } from "@/components/accounts/MoneyAmount";
import { formatMoneyOrDash } from "@/lib/accounts/money-format";
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
  { key: "party", label: "Party Name", align: "left" as const },
  { key: "gstin", label: "GSTIN", align: "left" as const },
  { key: "pan", label: "PAN", align: "left" as const },
  { key: "expense", label: "Expense Head", align: "left" as const },
  { key: "narration", label: "Particulars / Narration", align: "left" as const },
  { key: "debit", label: "Debit", align: "right" as const },
  { key: "credit", label: "Credit", align: "right" as const },
  { key: "bank", label: "Bank / Cash", align: "left" as const },
  { key: "tdsSection", label: "TDS Section", align: "left" as const },
  { key: "tdsAmount", label: "TDS Amount", align: "right" as const },
  { key: "gstAmount", label: "GST Amount", align: "right" as const },
  { key: "reference", label: "Reference No.", align: "left" as const },
  { key: "balance", label: "Running Balance", align: "right" as const },
];

function TextCell({
  value,
  className,
  mono,
  title,
}: {
  value: string;
  className?: string;
  mono?: boolean;
  title?: string;
}) {
  return (
    <AccountsTableCell
      className={cn(mono && "font-mono text-[11px]", className)}
      title={title ?? (value !== "—" ? value : undefined)}
    >
      {value}
    </AccountsTableCell>
  );
}

function OptionalMoneyCell({ amount }: { amount: number | null }) {
  if (amount == null || amount === 0) {
    return (
      <AccountsTableCell align="right" className="tabular-nums text-muted-foreground">
        —
      </AccountsTableCell>
    );
  }
  return <MoneyCell amount={amount} className="accounts-table-td" />;
}

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
      <AccountsTable minWidth={2200} className="text-xs">
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
  const isSummary = row.kind === "opening" || row.kind === "closing";

  return (
    <AccountsTableRow
      className={cn(
        isSummary && "bg-muted/20 font-medium",
      )}
    >
      <AccountsTableCell className="whitespace-nowrap">
        {isSummary ? "—" : row.date}
      </AccountsTableCell>
      <AccountsTableCell className="whitespace-nowrap">
        {isSummary ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span className="font-mono text-xs font-semibold text-brand-700">{row.voucherNo}</span>
        )}
      </AccountsTableCell>
      <TextCell value={isSummary ? "—" : row.voucherType} className="whitespace-nowrap text-muted-foreground" />
      <TextCell
        value={isSummary ? row.particularsNarration : row.partyName}
        className={cn(!isSummary && "max-w-[160px] truncate font-medium")}
      />
      <TextCell value={isSummary ? "—" : row.gstin} mono className="whitespace-nowrap" />
      <TextCell value={isSummary ? "—" : row.pan} mono className="whitespace-nowrap" />
      <TextCell value={isSummary ? "—" : row.expenseHead} className="max-w-[140px] truncate" />
      <TextCell
        value={isSummary ? row.particularsNarration : row.particularsNarration}
        className={cn("max-w-[200px] truncate", isSummary && "font-semibold text-foreground")}
      />
      <MoneyCell amount={row.debit} dashIfZero className="accounts-table-td" />
      <MoneyCell amount={row.credit} dashIfZero className="accounts-table-td" />
      <TextCell value={isSummary ? "—" : row.bankCash} className="max-w-[140px] truncate" />
      <TextCell value={isSummary ? "—" : row.tdsSection} className="max-w-[140px] truncate" />
      {isSummary ? (
        <AccountsTableCell align="right" className="text-muted-foreground">
          —
        </AccountsTableCell>
      ) : (
        <OptionalMoneyCell amount={row.tdsAmount} />
      )}
      {isSummary ? (
        <AccountsTableCell align="right" className="text-muted-foreground">
          —
        </AccountsTableCell>
      ) : (
        <OptionalMoneyCell amount={row.gstAmount} />
      )}
      <TextCell value={isSummary ? "—" : row.referenceNo} mono className="whitespace-nowrap" />
      <AccountsTableCell align="right" className="tabular-nums font-medium whitespace-nowrap">
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

export function formatGeneralLedgerOptionalMoney(amount: number | null): string {
  if (amount == null || amount === 0) return "—";
  return formatMoneyOrDash(amount);
}
