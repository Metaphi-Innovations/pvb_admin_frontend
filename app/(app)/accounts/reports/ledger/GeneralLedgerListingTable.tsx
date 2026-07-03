"use client";

import { MoneyAmount, MoneyCell } from "@/components/accounts/MoneyAmount";
import { AccountsViewAction, accountsActionColClass } from "@/components/accounts/AccountsTableActions";
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
import { formatGeneralLedgerDate, type GeneralLedgerListingRow } from "./general-ledger-data";

const COLUMNS = [
  { key: "code", label: "Ledger Code", align: "left" as const },
  { key: "name", label: "Ledger Name", align: "left" as const },
  { key: "type", label: "Ledger Type", align: "left" as const },
  { key: "group", label: "Parent Group", align: "left" as const },
  { key: "opening", label: "Opening Balance", align: "right" as const },
  { key: "debit", label: "Total Debit", align: "right" as const },
  { key: "credit", label: "Total Credit", align: "right" as const },
  { key: "closing", label: "Closing Balance", align: "right" as const },
  { key: "lastTx", label: "Last Transaction Date", align: "left" as const },
  { key: "action", label: "Actions", align: "center" as const },
];

export function GeneralLedgerListingTable({
  rows,
  onViewLedger,
}: {
  rows: GeneralLedgerListingRow[];
  onViewLedger: (ledgerId: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">No ledgers match your filters.</p>
      </div>
    );
  }

  return (
    <AccountsTableScroll className="flex-1 min-h-0 h-full">
      <AccountsTable minWidth={1200} className="text-xs">
        <AccountsTableHead>
          <AccountsTableHeadRow>
            {COLUMNS.map((col) => (
              <AccountsTableHeadCell
                key={col.key}
                align={col.align}
                className={col.key === "action" ? accountsActionColClass("single") : "whitespace-nowrap"}
              >
                {col.label}
              </AccountsTableHeadCell>
            ))}
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {rows.map((row) => (
            <AccountsTableRow
              key={row.ledgerId}
              className="group cursor-pointer"
              onClick={() => onViewLedger(row.ledgerId)}
            >
              <AccountsTableCell className="font-mono text-xs font-semibold text-brand-700 whitespace-nowrap">
                {row.ledgerCode}
              </AccountsTableCell>
              <AccountsTableCell className="font-medium max-w-[200px] truncate" title={row.ledgerName}>
                {row.ledgerName}
              </AccountsTableCell>
              <AccountsTableCell className="text-muted-foreground whitespace-nowrap">
                {row.ledgerType}
              </AccountsTableCell>
              <AccountsTableCell className="max-w-[180px] truncate text-muted-foreground" title={row.parentGroup}>
                {row.parentGroup}
              </AccountsTableCell>
              <AccountsTableCell align="right" className="tabular-nums whitespace-nowrap">
                <MoneyAmount
                  amount={row.openingBalance}
                  side={row.openingBalanceType}
                  sideBadge
                  className="text-xs justify-end"
                />
              </AccountsTableCell>
              <MoneyCell amount={row.totalDebit} dashIfZero className="accounts-table-td" />
              <MoneyCell amount={row.totalCredit} dashIfZero className="accounts-table-td" />
              <AccountsTableCell align="right" className="tabular-nums whitespace-nowrap">
                <MoneyAmount
                  amount={row.closingBalance}
                  side={row.closingBalanceType}
                  sideBadge
                  className="text-xs justify-end"
                />
              </AccountsTableCell>
              <AccountsTableCell className="whitespace-nowrap text-muted-foreground">
                {row.lastTransactionDate
                  ? formatGeneralLedgerDate(row.lastTransactionDate)
                  : "—"}
              </AccountsTableCell>
              <AccountsTableCell align="center" className={accountsActionColClass("single")}>
                <AccountsViewAction
                  title={`View ${row.ledgerName}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewLedger(row.ledgerId);
                  }}
                />
              </AccountsTableCell>
            </AccountsTableRow>
          ))}
        </AccountsTableBody>
      </AccountsTable>
    </AccountsTableScroll>
  );
}
