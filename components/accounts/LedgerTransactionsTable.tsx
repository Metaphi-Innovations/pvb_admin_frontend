"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { MoneyCell } from "@/components/accounts/MoneyAmount";
import { formatMoney, balanceSideLabel } from "@/lib/accounts/money-format";
import type { StatementRow } from "@/lib/accounts/ledger-detail-utils";
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
  { key: "voucher", label: "Voucher No", align: "left" as const },
  { key: "type", label: "Voucher Type", align: "left" as const },
  { key: "source", label: "Source Module", align: "left" as const },
  { key: "particulars", label: "Particulars", align: "left" as const },
  { key: "debit", label: "Debit", align: "right" as const },
  { key: "credit", label: "Credit", align: "right" as const },
  { key: "balance", label: "Running Balance", align: "right" as const },
  { key: "action", label: "Action", align: "left" as const },
];

export function LedgerTransactionsTable({
  rows,
  emptyLabel = "No transactions posted to this ledger yet.",
}: {
  rows: StatementRow[];
  emptyLabel?: string;
}) {
  if (rows.length === 0) {
    return <p className="text-xs text-muted-foreground py-6 text-center px-4">{emptyLabel}</p>;
  }

  return (
    <AccountsTableScroll>
      <AccountsTable minWidth={960}>
        <AccountsTableHead>
          <AccountsTableHeadRow>
            {COLUMNS.map((col) => (
              <AccountsTableHeadCell key={col.key} align={col.align} uppercase>
                {col.label}
              </AccountsTableHeadCell>
            ))}
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {rows.map((row, i) => {
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
          })}
        </AccountsTableBody>
      </AccountsTable>
    </AccountsTableScroll>
  );
}
