"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { computeCustomerOutstanding } from "@/lib/accounts/receivables-data";
import { loadCustomers } from "@/app/(app)/masters/customers/customer-data";
import { formatMoneyNumber, MONEY_CELL_CLASS } from "@/lib/accounts/money-format";
import { defaultAsOnDate } from "@/lib/accounts/report-date-presets";
import { StatusBadge } from "@/app/(app)/accounts/components/AccountsUI";
import { Button } from "@/components/ui/button";
import {
  ReportFilterRow,
  ReportAsOnDateFilter,
  ReportCustomerFilter,
  ReportBranchFilter,
} from "@/components/accounts/ReportFilters";
import { cn } from "@/lib/utils";

const AMOUNT_HEADERS = [
  "Invoice Total (Incl. GST)",
  "Paid",
  "Credit Note",
  "Outstanding",
  "Overdue",
] as const;

function formatReportDate(value: string): string {
  if (!value || value === "—") return "—";
  const [y, m, d] = value.slice(0, 10).split("-");
  if (!y || !m || !d) return value;
  return `${d}-${m}-${y}`;
}

/** Single-line Indian currency — ₹3,20,000.66 (no wrap between symbol and amount). */
function formatAmount(amount: number): string {
  return `₹${formatMoneyNumber(amount)}`;
}

function AmountCell({
  amount,
  className,
}: {
  amount: number;
  className?: string;
}) {
  return (
    <td className={cn("px-3 py-2.5 align-middle", MONEY_CELL_CLASS, className)}>
      <span className="inline-block whitespace-nowrap">{formatAmount(amount)}</span>
    </td>
  );
}

export default function CustomerOutstandingClient() {
  const [asOnDate, setAsOnDate] = useState(defaultAsOnDate());
  const [customerId, setCustomerId] = useState("all");
  const [branch, setBranch] = useState("all");

  const customers = useMemo(() => loadCustomers(), []);

  const rows = useMemo(() => {
    let data = computeCustomerOutstanding(asOnDate);
    if (customerId !== "all") {
      data = data.filter((r) => String(r.customerId) === customerId);
    }
    if (branch !== "all") {
      data = data.filter((r) => r.branch === branch);
    }
    return data;
  }, [asOnDate, customerId, branch]);

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Receivables", "Customer Outstanding")}
      title="Customer Outstanding"
      description="Customer-wise open receivables from posted sales invoices, credit notes and receipts."
      filters={
        <ReportFilterRow>
          <ReportAsOnDateFilter value={asOnDate} onChange={setAsOnDate} />
          <ReportCustomerFilter value={customerId} onChange={setCustomerId} customers={customers} />
          <ReportBranchFilter value={branch} onChange={setBranch} />
        </ReportFilterRow>
      }
      layout="split"
      className="h-full min-h-0"
    >
      <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0">
        <table className="w-full border-collapse text-table table-fixed min-w-[1120px]">
          <colgroup>
            <col style={{ width: "220px" }} />
            <col style={{ width: "96px" }} />
            <col style={{ width: "112px" }} />
            <col style={{ width: "132px" }} />
            <col style={{ width: "112px" }} />
            <col style={{ width: "112px" }} />
            <col style={{ width: "120px" }} />
            <col style={{ width: "112px" }} />
            <col style={{ width: "104px" }} />
            <col style={{ width: "96px" }} />
            <col style={{ width: "72px" }} />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-white border-b border-border/60 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
            <tr>
              <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Customer
              </th>
              <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Code
              </th>
              <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Branch
              </th>
              {AMOUNT_HEADERS.map((h) => (
                <th
                  key={h}
                  className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
              <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                Last Invoice
              </th>
              <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Status
              </th>
              <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-14 text-center text-sm text-muted-foreground">
                  No customer outstanding balances for the selected filters.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.customerId}
                  className="border-b border-border/40 hover:bg-muted/15 h-11"
                >
                  <td className="px-3 py-2 align-middle">
                    <span
                      className="block text-xs font-medium leading-snug line-clamp-2 break-words"
                      title={r.customerName}
                    >
                      {r.customerName}
                    </span>
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <span className="text-[11px] font-mono text-muted-foreground whitespace-nowrap">
                      {r.customerCode}
                    </span>
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <span className="block text-xs text-muted-foreground truncate" title={r.branch}>
                      {r.branch}
                    </span>
                  </td>
                  <AmountCell amount={r.totalInvoiceAmount} />
                  <AmountCell amount={r.paidAmount} />
                  <AmountCell amount={r.creditNoteAdjusted} />
                  <AmountCell amount={r.outstanding} className="font-semibold text-foreground" />
                  <AmountCell
                    amount={r.overdueAmount}
                    className={r.overdueAmount > 0 ? "text-red-600 font-semibold" : "text-muted-foreground"}
                  />
                  <td className="px-3 py-2.5 align-middle text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                    {formatReportDate(r.lastInvoiceDate)}
                  </td>
                  <td className="px-3 py-2.5 align-middle whitespace-nowrap">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-3 py-2.5 align-middle text-right whitespace-nowrap">
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] text-brand-700" asChild>
                      <Link href={`/accounts/receivables/outstanding/${r.customerId}`}>View</Link>
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AccountsPageShell>
  );
}
