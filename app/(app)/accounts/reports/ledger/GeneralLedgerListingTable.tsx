"use client";

import { useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { MoneyAmount, MoneyCell } from "@/components/accounts/MoneyAmount";
import { AccountsViewAction, accountsActionColClass } from "@/components/accounts/AccountsTableActions";
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
} from "@/app/(app)/accounts/components/AccountsUI";
import { formatGeneralLedgerDate, type GeneralLedgerListingRow } from "./general-ledger-data";

function GeneralLedgerListingTableBody({
  rows,
  onViewLedger,
}: {
  rows: GeneralLedgerListingRow[];
  onViewLedger: (ledgerId: string) => void;
}) {
  const visible = useAccountsFilteredRows(rows);

  if (rows.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">No ledgers match your filters.</p>
      </div>
    );
  }

  if (visible.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">No records match the column filters.</p>
      </div>
    );
  }

  return (
    <AccountsTableScroll className="flex-1 min-h-0 h-full">
      <AccountsTable minWidth={1200} className="text-xs">
        <AccountsTableHead>
          <AccountsTableHeadRow>
            <SortTh label="Ledger Code" colKey="ledgerCode" className="whitespace-nowrap" />
            <SortTh label="Ledger Name" colKey="ledgerName" className="whitespace-nowrap" />
            <SortTh label="Ledger Type" colKey="ledgerType" className="whitespace-nowrap" />
            <SortTh label="Parent Group" colKey="parentGroup" className="whitespace-nowrap" />
            <SortTh label="Opening Balance" colKey="openingBalance" filterType="amount" align="right" className="whitespace-nowrap" />
            <SortTh label="Total Debit" colKey="totalDebit" filterType="amount" align="right" className="whitespace-nowrap" />
            <SortTh label="Total Credit" colKey="totalCredit" filterType="amount" align="right" className="whitespace-nowrap" />
            <SortTh label="Closing Balance" colKey="closingBalance" filterType="amount" align="right" className="whitespace-nowrap" />
            <SortTh label="Last Transaction Date" colKey="lastTransactionDate" filterType="date" className="whitespace-nowrap" />
            <AccountsColumnHeader
              label="Actions"
              colKey="_actions"
              sortable={false}
              filterable={false}
              align="center"
              className={accountsActionColClass("single")}
            />
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {visible.map((row) => (
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

export function GeneralLedgerListingTable({
  rows,
  onViewLedger,
}: {
  rows: GeneralLedgerListingRow[];
  onViewLedger: (ledgerId: string) => void;
}) {
  const getCellValue = useCallback((row: GeneralLedgerListingRow, key: string) => {
    switch (key) {
      case "code":
        return row.ledgerCode;
      case "name":
        return row.ledgerName;
      default:
        return (row as unknown as Record<string, unknown>)[key];
    }
  }, []);

  return (
    <AccountsColumnFilterProvider
      rows={rows}
      getCellValue={getCellValue}
      columnConfig={{
        ledgerCode: { type: "text" },
        ledgerName: { type: "text" },
        ledgerType: { type: "text" },
        parentGroup: { type: "text" },
        openingBalance: { type: "amount" },
        totalDebit: { type: "amount" },
        totalCredit: { type: "amount" },
        closingBalance: { type: "amount" },
        lastTransactionDate: { type: "date" },
      }}
      defaultSortKey="ledgerName"
      defaultSortDir="asc"
    >
      <GeneralLedgerListingTableBody rows={rows} onViewLedger={onViewLedger} />
    </AccountsColumnFilterProvider>
  );
}
