"use client";

import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableHead,
  AccountsTableHeadCell,
  AccountsTableHeadRow,
  AccountsTableRow,
} from "@/components/accounts/AccountsTable";
import type { Gstr1VoucherSummary } from "../gstr1-report-types";

const ROWS: { key: keyof Gstr1VoucherSummary; label: string }[] = [
  { key: "totalVouchers", label: "Total Vouchers" },
  { key: "includedInReturn", label: "Included in Return" },
  { key: "notRelevant", label: "Not Relevant" },
  { key: "needsReview", label: "Needs Review" },
];

export function Gstr1VoucherSummaryTable({ summary }: { summary: Gstr1VoucherSummary }) {
  return (
    <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
      <div className="px-3 py-2 border-b border-border bg-muted/30">
        <p className="text-xs font-semibold text-foreground">Voucher Summary</p>
      </div>
      <AccountsTable>
        <AccountsTableHead>
          <AccountsTableHeadRow>
            <AccountsTableHeadCell className="text-xs font-semibold">Particulars</AccountsTableHeadCell>
            <AccountsTableHeadCell align="right" className="text-xs font-semibold w-32">
              Count
            </AccountsTableHeadCell>
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {ROWS.map((row) => (
            <AccountsTableRow key={row.key}>
              <AccountsTableCell className="text-xs text-foreground">{row.label}</AccountsTableCell>
              <AccountsTableCell
                align="right"
                className="text-xs tabular-nums font-medium"
              >
                {summary[row.key]}
              </AccountsTableCell>
            </AccountsTableRow>
          ))}
        </AccountsTableBody>
      </AccountsTable>
    </div>
  );
}
