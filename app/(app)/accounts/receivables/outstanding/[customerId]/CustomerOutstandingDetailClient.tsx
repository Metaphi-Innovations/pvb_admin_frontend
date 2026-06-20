"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  IndianRupee,
  ArrowLeft,
  MoreHorizontal,
} from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { getCustomerOutstandingDetail } from "@/lib/accounts/receivables-data";
import { formatMoney } from "@/lib/accounts/money-format";
import { MiniKPICard } from "@/components/ui/KPICard";
import { StatusBadge } from "@/app/(app)/accounts/components/AccountsUI";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function CustomerOutstandingDetailClient() {
  const params = useParams();
  const customerId = Number(params.customerId);
  const detail = useMemo(
    () => (Number.isFinite(customerId) ? getCustomerOutstandingDetail(customerId) : null),
    [customerId],
  );

  if (!detail) {
    return (
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Receivables", "Customer Outstanding", "/accounts/receivables/outstanding")}
        title="Customer Not Found"
        description="No customer outstanding record for this ID."
        layout="standard"
      >
        <div className="p-8 text-center">
          <Link href="/accounts/receivables/outstanding" className="text-sm text-brand-600 hover:underline inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back to Customer Outstanding
          </Link>
        </div>
      </AccountsPageShell>
    );
  }

  const { customer, ledgerId, invoices } = detail;
  const creditDays = customer.paymentTerms?.match(/(\d+)/)?.[1] ?? "30";

  return (
    <AccountsPageShell
      breadcrumbs={[
        ...accountsBreadcrumb("Receivables", "Customer Outstanding", "/accounts/receivables/outstanding"),
        { label: customer.customerName },
      ]}
      title={customer.customerName}
      description={`${customer.customerCode} · ${customer.territoryName || customer.districtName || "—"}`}
      actions={
        <Link href="/accounts/receivables/outstanding">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Button>
        </Link>
      }
      layout="split"
      className="h-full min-h-0"
    >
      <div className="flex-shrink-0 p-4 border-b border-border/60 bg-muted/5 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 text-xs">
          {[
            ["GSTIN", customer.gstin || "—"],
            ["Mobile", customer.mobile],
            ["Territory", customer.territoryName || "—"],
            ["Sales Executive", customer.salesManName || "Rajesh Sharma"],
            ["Credit Limit", formatMoney(customer.creditLimit)],
            ["Credit Days", creditDays],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[10px] uppercase text-muted-foreground font-semibold">{label}</p>
              <p className="font-medium mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <MiniKPICard label="Opening Balance" value={formatMoney(detail.openingBalance)} icon={IndianRupee} />
          <MiniKPICard label="Total Sales" value={formatMoney(detail.totalSales)} icon={IndianRupee} />
          <MiniKPICard label="Total Receipts" value={formatMoney(detail.totalReceipts)} icon={IndianRupee} />
          <MiniKPICard label="Credit Notes" value={formatMoney(detail.creditNotes)} icon={IndianRupee} />
          <MiniKPICard label="Debit Notes" value={formatMoney(detail.debitNotes)} icon={IndianRupee} />
          <MiniKPICard label="Current Outstanding" value={formatMoney(detail.currentOutstanding)} icon={IndianRupee} accent />
        </div>
      </div>

      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full text-table min-w-[1000px]">
          <thead className="bg-muted/20 border-b sticky top-0 z-10">
            <tr>
              {["Invoice No", "Invoice Date", "Due Date", "Amount", "Paid", "Credit Note", "Outstanding", "Days Overdue", "Status", ""].map((h) => (
                <th key={h || "act"} className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.invoiceId} className="border-b border-border/40 hover:bg-muted/20">
                <td className="px-3 py-2.5 text-xs font-mono font-semibold">{inv.invoiceNo}</td>
                <td className="px-3 py-2.5 text-xs">{inv.invoiceDate}</td>
                <td className="px-3 py-2.5 text-xs">{inv.dueDate}</td>
                <td className="px-3 py-2.5 text-xs text-right tabular-nums">{formatMoney(inv.invoiceAmount)}</td>
                <td className="px-3 py-2.5 text-xs text-right tabular-nums">{formatMoney(inv.paidAmount)}</td>
                <td className="px-3 py-2.5 text-xs text-right tabular-nums">{formatMoney(inv.creditNote)}</td>
                <td className="px-3 py-2.5 text-xs text-right tabular-nums font-semibold">{formatMoney(inv.outstanding)}</td>
                <td className="px-3 py-2.5 text-xs text-center tabular-nums">{inv.outstanding > 0 ? inv.daysOverdue : "—"}</td>
                <td className="px-3 py-2.5"><StatusBadge status={inv.status} /></td>
                <td className="px-3 py-2.5 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem asChild>
                        <Link href={`/accounts/transactions/invoices/${inv.invoiceId}`}>View Invoice</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/accounts/vouchers?tab=receipt&customer=${customer.id}`}>Record Receipt</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/accounts/receivables/receipt-allocation">Allocate Receipt</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/accounts/masters/ledgers/${ledgerId}`}>View Ledger</Link>
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
