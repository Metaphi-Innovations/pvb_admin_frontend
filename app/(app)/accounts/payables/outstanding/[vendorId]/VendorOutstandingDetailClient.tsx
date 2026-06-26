"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { IndianRupee, ArrowLeft, MoreHorizontal } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { getVendorOutstandingDetail } from "@/lib/accounts/payables-data";
import { getVendorPayablesMeta } from "@/lib/accounts/payables-data";
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
import { formatCreditPeriod } from "@/app/(app)/masters/vendors/vendor-data";

export default function VendorOutstandingDetailClient() {
  const params = useParams();
  const vendorId = Number(params.vendorId);
  const detail = useMemo(
    () => (Number.isFinite(vendorId) ? getVendorOutstandingDetail(vendorId, "2026-06-20") : null),
    [vendorId],
  );

  if (!detail) {
    return (
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Payables", "Supplier Outstanding", "/accounts/payables/outstanding")}
        title="Supplier Not Found"
        description="No supplier outstanding record for this ID."
        layout="standard"
      >
        <div className="p-8 text-center">
          <Link
            href="/accounts/payables/outstanding"
            className="text-sm text-brand-600 hover:underline inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Supplier Outstanding
          </Link>
        </div>
      </AccountsPageShell>
    );
  }

  const { vendor, ledgerId, bills } = detail;
  const meta = getVendorPayablesMeta(vendor.id);

  return (
    <AccountsPageShell
      breadcrumbs={[
        ...accountsBreadcrumb("Payables", "Supplier Outstanding", "/accounts/payables/outstanding"),
        { label: vendor.vendorName },
      ]}
      title={vendor.vendorName}
      description={`${vendor.vendorCode} · ${meta?.territory ?? vendor.billingAddress.state}`}
      actions={
        <Link href="/accounts/payables/outstanding">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Button>
        </Link>
      }
      layout="split"
      className="h-full min-h-0"
    >
      <div className="flex-shrink-0 p-4 border-b border-border/60 bg-muted/5 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
          {[
            ["GSTIN", vendor.gstNumber || "—"],
            ["Mobile", vendor.mobile],
            ["Territory", meta?.territory ?? "—"],
            ["Purchase Manager", meta?.purchaseManager ?? "Purchase Desk"],
            ["Credit Days", formatCreditPeriod(vendor)],
            ["Branch", meta?.branch ?? vendor.billingAddress.city],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[10px] uppercase text-muted-foreground font-semibold">{label}</p>
              <p className="font-medium mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <MiniKPICard label="Opening Balance" value={formatMoney(detail.openingBalance)} icon={IndianRupee} />
          <MiniKPICard label="Total Purchases" value={formatMoney(detail.totalPurchases)} icon={IndianRupee} />
          <MiniKPICard label="Total Payments" value={formatMoney(detail.totalPayments)} icon={IndianRupee} />
          <MiniKPICard label="Debit Notes" value={formatMoney(detail.debitNotes)} icon={IndianRupee} />
          <MiniKPICard label="Credit Notes" value={formatMoney(detail.creditNotes)} icon={IndianRupee} />
          <MiniKPICard
            label="Current Outstanding"
            value={formatMoney(detail.currentOutstanding)}
            icon={IndianRupee}
            accent
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full text-table min-w-[1100px]">
          <thead className="bg-muted/20 border-b sticky top-0 z-10">
            <tr>
              {[
                "Purchase Bill No",
                "Bill Date",
                "Due Date",
                "Bill Amount",
                "Paid",
                "Debit Note Adj.",
                "Outstanding",
                "Days Overdue",
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
            {bills.map((bill) => (
              <tr key={bill.billId} className="border-b border-border/40 hover:bg-muted/20">
                <td className="px-3 py-2.5 text-xs font-mono font-semibold">
                  <Link
                    href={`/accounts/purchase-invoices/${bill.billId}`}
                    className="text-brand-600 hover:underline"
                  >
                    {bill.billNo}
                  </Link>
                </td>
                <td className="px-3 py-2.5 text-xs">{bill.billDate}</td>
                <td className="px-3 py-2.5 text-xs">{bill.dueDate}</td>
                <td className="px-3 py-2.5 text-xs text-right tabular-nums">
                  {formatMoney(bill.billAmount)}
                </td>
                <td className="px-3 py-2.5 text-xs text-right tabular-nums">
                  {formatMoney(bill.paidAmount)}
                </td>
                <td className="px-3 py-2.5 text-xs text-right tabular-nums">
                  {formatMoney(bill.debitNoteAdjusted)}
                </td>
                <td className="px-3 py-2.5 text-xs text-right tabular-nums font-semibold">
                  {formatMoney(bill.outstanding)}
                </td>
                <td className="px-3 py-2.5 text-xs text-center tabular-nums">
                  {bill.outstanding > 0 ? bill.daysOverdue : "—"}
                </td>
                <td className="px-3 py-2.5">
                  <StatusBadge status={bill.status} />
                </td>
                <td className="px-3 py-2.5 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem asChild>
                        <Link href={`/accounts/purchase-invoices/${bill.billId}`}>
                          View Purchase Bill
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/accounts/vouchers?tab=payment&vendor=${vendor.id}`}>
                          Make Payment
                        </Link>
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
