"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { computeCustomerOutstanding } from "@/lib/accounts/receivables-data";
import { loadCustomers } from "@/app/(app)/masters/customers/customer-data";
import { formatMoney } from "@/lib/accounts/money-format";
import { defaultAsOnDate } from "@/lib/accounts/report-date-presets";
import { StatusBadge } from "@/app/(app)/accounts/components/AccountsUI";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ReportFilterRow,
  ReportAsOnDateFilter,
  ReportCustomerFilter,
  ReportBranchFilter,
} from "@/components/accounts/ReportFilters";

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
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full text-table min-w-[1200px]">
          <thead className="bg-muted/20 border-b sticky top-0 z-10">
            <tr>
              {[
                "Customer",
                "Code",
                "Territory / Branch",
                "Invoice Amount",
                "Paid",
                "Credit Note",
                "Outstanding",
                "Overdue",
                "Last Invoice",
                "Last Receipt",
                "Status",
                "",
              ].map((h) => (
                <th
                  key={h || "act"}
                  className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase text-muted-foreground whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.customerId} className="border-b border-border/40 hover:bg-muted/20">
                <td className="px-3 py-2.5 text-xs font-medium">{r.customerName}</td>
                <td className="px-3 py-2.5 text-xs font-mono text-muted-foreground">{r.customerCode}</td>
                <td className="px-3 py-2.5 text-xs">{r.territory} / {r.branch}</td>
                <td className="px-3 py-2.5 text-xs text-right tabular-nums">{formatMoney(r.totalInvoiceAmount)}</td>
                <td className="px-3 py-2.5 text-xs text-right tabular-nums">{formatMoney(r.paidAmount)}</td>
                <td className="px-3 py-2.5 text-xs text-right tabular-nums">{formatMoney(r.creditNoteAdjusted)}</td>
                <td className="px-3 py-2.5 text-xs text-right tabular-nums font-semibold">{formatMoney(r.outstanding)}</td>
                <td className="px-3 py-2.5 text-xs text-right tabular-nums text-red-600">{formatMoney(r.overdueAmount)}</td>
                <td className="px-3 py-2.5 text-xs">{r.lastInvoiceDate}</td>
                <td className="px-3 py-2.5 text-xs">{r.lastReceiptDate}</td>
                <td className="px-3 py-2.5"><StatusBadge status={r.status} /></td>
                <td className="px-3 py-2.5 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem asChild>
                        <Link href={`/accounts/receivables/outstanding/${r.customerId}`}>View Customer Outstanding</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/accounts/masters/ledgers/${r.ledgerId}`}>View Customer Ledger</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/accounts/vouchers?tab=receipt&customer=${r.customerId}`}>Record Receipt</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/accounts/receivables/receipt-allocation">Allocate Receipt</Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AccountsPageShell>
  );
}
