"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { computeCustomerOutstanding } from "@/lib/accounts/receivables-data";
import { formatMoney } from "@/lib/accounts/money-format";

export default function CustomerOutstandingClient() {
  const rows = useMemo(() => computeCustomerOutstanding(), []);

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "Customer Outstanding")}
      title="Customer Outstanding"
      description="Open receivables from posted sales vouchers on customer ledgers."
      layout="split"
      className="h-full min-h-0"
    >
      <div className="flex-1 overflow-auto min-h-0">
        {rows.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No customer outstanding. Post a sales invoice to see balances here.
          </div>
        ) : (
          <table className="w-full text-table min-w-[800px]">
            <thead className="bg-muted/20 border-b sticky top-0">
              <tr>
                {["Customer", "Invoices", "Debit", "Credit", "Outstanding", "Last Txn", ""].map((h) => (
                  <th key={h || "act"} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.ledgerId} className="border-b border-border/40 hover:bg-muted/20">
                  <td className="px-4 py-2.5 text-xs font-medium">{r.customerName}</td>
                  <td className="px-4 py-2.5 text-xs text-center">{r.invoiceCount}</td>
                  <td className="px-4 py-2.5 text-xs text-right tabular-nums">{formatMoney(r.totalDebit)}</td>
                  <td className="px-4 py-2.5 text-xs text-right tabular-nums">{formatMoney(r.totalCredit)}</td>
                  <td className="px-4 py-2.5 text-xs text-right tabular-nums font-semibold">{formatMoney(r.outstanding)}</td>
                  <td className="px-4 py-2.5 text-xs">{r.lastTransactionDate}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Link
                      href={`/accounts/masters/ledgers/${r.ledgerId}`}
                      className="text-[11px] text-brand-600 hover:underline"
                    >
                      Customer Ledger →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AccountsPageShell>
  );
}
