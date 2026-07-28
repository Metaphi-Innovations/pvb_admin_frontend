"use client";

import Link from "next/link";
import { useCallback } from "react";
import { ExternalLink } from "lucide-react";
import { MoneyCell } from "@/components/accounts/MoneyAmount";
import { formatMoney, balanceSideLabel } from "@/lib/accounts/money-format";
import type { StatementRow } from "@/lib/accounts/ledger-detail-utils";
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
  source: { type: "text" as const },
  particulars: { type: "text" as const },
  debit: { type: "amount" as const },
  credit: { type: "amount" as const },
  balance: { type: "amount" as const },
};

function LedgerTransactionsTableBody({ toolbarRows }: { toolbarRows: StatementRow[] }) {
  const visible = useAccountsFilteredRows<StatementRow>(toolbarRows);

  return (
    <AccountsTable minWidth={960}>
      <AccountsTableHead>
        <AccountsTableHeadRow>
          <SortTh label="Date" colKey="date" filterType="date" />
          <SortTh label="Voucher No" colKey="voucher" />
          <SortTh label="Voucher Type" colKey="type" />
          <SortTh label="Source Module" colKey="source" />
          <SortTh label="Particulars" colKey="particulars" />
          <SortTh label="Debit" colKey="debit" filterType="amount" align="right" />
          <SortTh label="Credit" colKey="credit" filterType="amount" align="right" />
          <SortTh label="Running Balance" colKey="balance" filterType="amount" align="right" />
          <AccountsColumnHeader
            label="Action"
            colKey="action"
            sortable={false}
            filterable={false}
          />
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
          visible.map((row, i) => {
            const isOpening = row.voucherType === "Opening Balance" || row.voucherType === "Opening";
            return (
              <AccountsTableRow key={`${row.id ?? row.voucherNo}-${i}`}>
                <AccountsTableCell className="whitespace-nowrap">{row.date}</AccountsTableCell>
                <AccountsTableCell mono>
                  {row.href && !isOpening ? (
                    <Link href={row.href} className="text-brand-700 hover:underline font-semibold">
                      {row.voucherNo}
                    </Link>
                  ) : (
                    row.voucherNo
                  )}
                </AccountsTableCell>
                <AccountsTableCell>{row.voucherType}</AccountsTableCell>
                <AccountsTableCell className="text-muted-foreground">{row.sourceModule || "—"}</AccountsTableCell>
                <AccountsTableCell className="max-w-[240px] truncate" title={row.particulars}>
                  {row.particulars}
                </AccountsTableCell>
                <MoneyCell amount={row.debit} dashIfZero />
                <MoneyCell amount={row.credit} dashIfZero />
                <AccountsTableCell align="right" money className="font-medium whitespace-nowrap">
                  {formatMoney(row.runningBalance)} {balanceSideLabel(row.balanceType)}
                </AccountsTableCell>
                <AccountsTableCell className="whitespace-nowrap">
                  {row.sourceHref && !isOpening ? (
                    <Link
                      href={row.sourceHref}
                      className="inline-flex items-center gap-1 text-brand-700 hover:underline font-medium"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View Source
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </AccountsTableCell>
              </AccountsTableRow>
            );
          })
        )}
      </AccountsTableBody>
    </AccountsTable>
  );
}

export function LedgerTransactionsTable({
  rows,
  emptyLabel = "No transactions posted to this ledger yet.",
}: {
  rows: StatementRow[];
  emptyLabel?: string;
}) {
  const getCellValue = useCallback((row: StatementRow, key: string) => {
    switch (key) {
      case "voucher":
        return row.voucherNo;
      case "type":
        return row.voucherType;
      case "source":
        return row.sourceModule;
      case "balance":
        return row.runningBalance;
      default:
        return (row as unknown as Record<string, unknown>)[key];
    }
  }, []);

  if (rows.length === 0) {
    return <p className="text-xs text-muted-foreground py-6 text-center px-4">{emptyLabel}</p>;
  }

  return (
    <AccountsColumnFilterProvider
      rows={rows}
      getCellValue={getCellValue}
      columnConfig={COLUMN_CONFIG}
      defaultSortKey="date"
      defaultSortDir="asc"
    >
      <AccountsTableScroll>
        <LedgerTransactionsTableBody toolbarRows={rows} />
      </AccountsTableScroll>
    </AccountsColumnFilterProvider>
  );
}
