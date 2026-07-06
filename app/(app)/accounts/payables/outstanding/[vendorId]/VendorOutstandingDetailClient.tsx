"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  getVendorOutstandingDetail,
  getVendorPayablesMeta,
  getVendorPaymentHistory,
} from "@/lib/accounts/payables-data";
import { useAccountsSectionRefresh } from "@/lib/accounts/use-accounts-section-refresh";
import { formatMoney, MONEY_CELL_CLASS } from "@/lib/accounts/money-format";
import { defaultAsOnDate } from "@/lib/accounts/report-date-presets";
import { StatusBadge } from "@/app/(app)/accounts/components/AccountsUI";
import { Button } from "@/components/ui/button";
import { formatCreditPeriod } from "@/app/(app)/masters/vendors/vendor-data";
import { cn } from "@/lib/utils";

function formatReportDate(value: string): string {
  if (!value || value === "—") return "—";
  const [y, m, d] = value.slice(0, 10).split("-");
  if (!y || !m || !d) return value;
  return `${d}-${m}-${y}`;
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-xs font-medium mt-0.5">{value}</p>
    </div>
  );
}

export default function VendorOutstandingDetailClient() {
  const params = useParams();
  const searchParams = useSearchParams();
  const vendorId = Number(params.vendorId);
  const highlightBillId = Number(searchParams.get("billId"));
  const [asOnDate] = useState(defaultAsOnDate());
  const [refreshKey, setRefreshKey] = useState(0);

  const sectionRefresh = useAccountsSectionRefresh();

  useEffect(() => {
    setRefreshKey((k) => k + 1);
  }, [sectionRefresh]);

  const detail = useMemo(
    () => (Number.isFinite(vendorId) ? getVendorOutstandingDetail(vendorId, asOnDate) : null),
    [vendorId, asOnDate, refreshKey],
  );

  const paymentHistory = useMemo(
    () => (Number.isFinite(vendorId) ? getVendorPaymentHistory(vendorId) : []),
    [vendorId, refreshKey],
  );

  const highlightedBill = useMemo(() => {
    if (!detail || !Number.isFinite(highlightBillId)) return null;
    return detail.bills.find((b) => b.billId === highlightBillId) ?? null;
  }, [detail, highlightBillId]);

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

  const { vendor, bills } = detail;
  const meta = getVendorPayablesMeta(vendor.id);
  const openBills = bills.filter((b) => b.outstanding > 0.009);

  return (
    <AccountsPageShell
      breadcrumbs={[
        ...accountsBreadcrumb("Payables", "Supplier Outstanding", "/accounts/payables/outstanding"),
        { label: vendor.vendorName },
      ]}
      title="Supplier Outstanding Details"
      description={`${vendor.vendorCode} · Outstanding as on ${formatReportDate(asOnDate)}`}
      actions={
        <div className="flex items-center gap-2">
          <Link href="/accounts/payables/outstanding">
            <Button variant="outline" size="sm" className="h-9 text-sm font-medium gap-1">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </Link>
          <Link href={`/accounts/payables/payment-allocation?vendorId=${vendor.id}`}>
            <Button size="sm" className="h-9 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white">
              Go to Payment Allocation
            </Button>
          </Link>
        </div>
      }
      layout="split"
      className="h-full min-h-0"
    >
      <div className="flex-1 overflow-auto min-h-0 space-y-4 p-4">
        <section className="rounded-xl border border-border bg-white shadow-sm p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Supplier Information
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <InfoBlock label="Supplier Name" value={vendor.vendorName} />
            <InfoBlock label="Supplier Code" value={vendor.vendorCode} />
            <InfoBlock label="GSTIN" value={vendor.gstNumber || "—"} />
            <InfoBlock label="Territory" value={meta?.territory ?? "—"} />
            <InfoBlock label="Branch" value={meta?.branch ?? vendor.billingAddress.city} />
            <InfoBlock label="Credit Period" value={formatCreditPeriod(vendor)} />
            <InfoBlock label="Purchase Manager" value={meta?.purchaseManager ?? "Purchase Desk"} />
            <InfoBlock label="Mobile" value={vendor.mobile} />
          </div>
        </section>

        {highlightedBill && (
          <section className="rounded-xl border border-brand-200 bg-brand-50/40 shadow-sm p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Invoice Information
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <InfoBlock label="Invoice No." value={highlightedBill.billNo} />
              <InfoBlock label="Invoice Date" value={formatReportDate(highlightedBill.billDate)} />
              <InfoBlock label="Due Date" value={formatReportDate(highlightedBill.dueDate)} />
              <InfoBlock label="Status" value={highlightedBill.status.replaceAll("_", " ")} />
              <InfoBlock label="Invoice Amount" value={formatMoney(highlightedBill.billAmount)} />
              <InfoBlock label="Paid" value={formatMoney(highlightedBill.paidAmount)} />
              <InfoBlock label="Outstanding" value={formatMoney(highlightedBill.outstanding)} />
              <InfoBlock
                label="Overdue Days"
                value={highlightedBill.outstanding > 0 ? String(highlightedBill.daysOverdue) : "—"}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="sm" className="h-9 text-sm font-medium" asChild>
                <Link href={`/accounts/purchase-invoices/${highlightedBill.billId}`}>
                  View Purchase Invoice
                </Link>
              </Button>
            </div>
          </section>
        )}

        <section className="rounded-xl border border-border bg-white shadow-sm p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Outstanding Summary
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            {[
              ["Total Purchases", formatMoney(detail.totalPurchases)],
              ["Total Payments", formatMoney(detail.totalPayments)],
              ["Debit Notes", formatMoney(detail.debitNotes)],
              ["Credit Notes", formatMoney(detail.creditNotes)],
              ["Current Outstanding", formatMoney(detail.currentOutstanding)],
            ].map(([label, value]) => (
              <div
                key={label}
                className={cn(
                  "rounded-lg border border-border/60 bg-muted/10 p-3",
                  label === "Current Outstanding" && "border-brand-200 bg-brand-50/30",
                )}
              >
                <p className="text-xs uppercase text-muted-foreground font-semibold">{label}</p>
                <p
                  className={cn(
                    "text-sm font-bold mt-1 tabular-nums",
                    label === "Current Outstanding" && "text-brand-700",
                  )}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-muted/20">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Open Invoices
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="accounts-table w-full min-w-[900px]">
              <thead className="border-b">
                <tr>
                  {[
                    "Invoice No.",
                    "Invoice Date",
                    "Invoice Amount",
                    "Paid",
                    "Outstanding",
                    "Due Date",
                    "Status",
                    "",
                  ].map((h) => (
                    <th key={h || "act"} className="text-left whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(openBills.length > 0 ? openBills : bills).map((bill) => (
                  <tr
                    key={bill.billId}
                    className={cn(
                      "accounts-table-row group",
                      bill.billId === highlightBillId && "bg-brand-50/50",
                    )}
                  >
                    <td className="px-3 py-2.5 text-xs font-mono font-semibold text-brand-700">
                      {bill.billNo}
                    </td>
                    <td className="px-3 py-2.5 text-xs tabular-nums">{formatReportDate(bill.billDate)}</td>
                    <td className={cn("px-3 py-2.5 text-xs text-right", MONEY_CELL_CLASS)}>
                      {formatMoney(bill.billAmount)}
                    </td>
                    <td className={cn("px-3 py-2.5 text-xs text-right", MONEY_CELL_CLASS)}>
                      {formatMoney(bill.paidAmount)}
                    </td>
                    <td className={cn("px-3 py-2.5 text-xs text-right font-semibold", MONEY_CELL_CLASS)}>
                      {formatMoney(bill.outstanding)}
                    </td>
                    <td className="px-3 py-2.5 text-xs tabular-nums">{formatReportDate(bill.dueDate)}</td>
                    <td className="px-3 py-2.5">
                      <StatusBadge status={bill.status} />
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Link
                        href={`/accounts/purchase-invoices/${bill.billId}`}
                        className="text-xs text-brand-700 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-muted/20">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Payment History
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="accounts-table w-full min-w-[800px]">
              <thead className="border-b">
                <tr>
                  {["Payment No.", "Date", "Amount", "Allocated", "Bank Account", "Reference", "Status"].map(
                    (h) => (
                      <th key={h} className="text-left whitespace-nowrap">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {paymentHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-xs text-muted-foreground">
                      No payment vouchers recorded for this supplier.
                    </td>
                  </tr>
                ) : (
                  paymentHistory.map((p) => (
                    <tr key={p.paymentNo} className="accounts-table-row group">
                      <td className="px-3 py-2.5 text-xs font-mono font-semibold">{p.paymentNo}</td>
                      <td className="px-3 py-2.5 text-xs tabular-nums">{formatReportDate(p.paymentDate)}</td>
                      <td className={cn("px-3 py-2.5 text-xs text-right", MONEY_CELL_CLASS)}>
                        {formatMoney(p.amount)}
                      </td>
                      <td className={cn("px-3 py-2.5 text-xs text-right", MONEY_CELL_CLASS)}>
                        {formatMoney(p.allocatedAmount)}
                      </td>
                      <td className="px-3 py-2.5 text-xs">{p.bankAccount}</td>
                      <td className="px-3 py-2.5 text-xs font-mono">{p.referenceNo}</td>
                      <td className="px-3 py-2.5">
                        <StatusBadge status={p.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AccountsPageShell>
  );
}
