"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { MoneyCell } from "@/components/accounts/MoneyAmount";
import { formatMoney } from "@/lib/accounts/money-format";
import type { StatementRow } from "@/lib/accounts/ledger-detail-utils";

export function LedgerTransactionsTable({
  rows,
  emptyLabel = "No transactions posted to this ledger yet.",
}: {
  rows: StatementRow[];
  emptyLabel?: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center px-4">{emptyLabel}</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs min-w-[960px]">
        <thead className="bg-muted/20 border-b border-border/60 sticky top-0 z-10">
          <tr>
            {[
              "Date",
              "Voucher No",
              "Voucher Type",
              "Source Module",
              "Particulars",
              "Debit",
              "Credit",
              "Running Balance",
              "Action",
            ].map((h) => (
              <th
                key={h}
                className={`px-3 py-2.5 font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap ${
                  h === "Debit" || h === "Credit" || h === "Running Balance" ? "text-right" : "text-left"
                }`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const isOpening = row.voucherType === "Opening";
            return (
              <tr key={`${row.id ?? row.voucherNo}-${i}`} className="border-b border-border/30 hover:bg-muted/10">
                <td className="px-3 py-2.5 whitespace-nowrap">{row.date}</td>
                <td className="px-3 py-2.5 font-mono">
                  {row.href && !isOpening ? (
                    <Link href={row.href} className="text-brand-700 hover:underline">
                      {row.voucherNo}
                    </Link>
                  ) : (
                    row.voucherNo
                  )}
                </td>
                <td className="px-3 py-2.5">{row.voucherType}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{row.sourceModule || "—"}</td>
                <td className="px-3 py-2.5 max-w-[240px] truncate" title={row.particulars}>
                  {row.particulars}
                </td>
                <MoneyCell amount={row.debit} dashIfZero className="px-3 py-2.5" />
                <MoneyCell amount={row.credit} dashIfZero className="px-3 py-2.5" />
                <td className="px-3 py-2.5 text-right tabular-nums font-medium whitespace-nowrap">
                  {formatMoney(row.runningBalance)} {row.balanceType === "Debit" ? "Dr" : "Cr"}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
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
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
