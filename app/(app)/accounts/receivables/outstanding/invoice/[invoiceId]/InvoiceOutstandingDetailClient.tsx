"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, FileText, Receipt } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { getInvoiceOutstandingDetail } from "@/lib/accounts/receivables-data";
import { ensureReceivablesDemoData } from "@/lib/accounts/receivables-demo-seed";
import { formatMoney } from "@/lib/accounts/money-format";
import { StatusBadge } from "@/app/(app)/accounts/components/AccountsUI";
import { Button } from "@/components/ui/button";
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

function formatReportDate(value: string): string {
  const [y, m, d] = value.slice(0, 10).split("-");
  if (!y || !m || !d) return value;
  return `${d}-${m}-${y}`;
}

export default function InvoiceOutstandingDetailClient() {
  const params = useParams();
  const searchParams = useSearchParams();
  const invoiceId = Number(params.invoiceId);
  const fromAgeing = searchParams.get("from") === "ageing";

  useEffect(() => {
    ensureReceivablesDemoData();
  }, []);

  const detail = useMemo(
    () => (Number.isFinite(invoiceId) ? getInvoiceOutstandingDetail(invoiceId) : null),
    [invoiceId],
  );

  if (!detail) {
    return (
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Receivables", "Customer Outstanding", "/accounts/receivables/outstanding")}
        title="Invoice Not Found"
        description="No outstanding record for this invoice."
        layout="standard"
      >
        <div className="p-8 text-center">
          <Link
            href="/accounts/receivables/outstanding"
            className="text-sm text-brand-600 hover:underline inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Customer Outstanding
          </Link>
        </div>
      </AccountsPageShell>
    );
  }

  const { customer, invoice, receiptHistory, summary } = detail;
  const backHref = fromAgeing
    ? "/accounts/receivables/ageing"
    : "/accounts/receivables/outstanding";

  return (
    <AccountsPageShell
      breadcrumbs={[
        ...accountsBreadcrumb("Receivables", "Customer Outstanding", "/accounts/receivables/outstanding"),
        { label: invoice.invoiceNo },
      ]}
      title="Customer Outstanding Details"
      description={`${customer.customerName} · ${invoice.invoiceNo}`}
      actions={
        <div className="flex items-center gap-2">
          <Link href={backHref}>
            <Button variant="outline" size="sm" className="h-9 text-[13px] font-medium gap-1">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </Link>
          <Link href={`/accounts/transactions/invoices/${invoice.invoiceId}`}>
            <Button variant="outline" size="sm" className="h-9 text-[13px] font-medium gap-1">
              <FileText className="w-4 h-4" /> View Sales Invoice
            </Button>
          </Link>
          <Link href={`/accounts/receivables/receipt-allocation?customer=${customer.id}`}>
            <Button size="sm" className="h-9 text-[13px] font-medium gap-1 bg-brand-600 hover:bg-brand-700 text-white">
              <Receipt className="w-4 h-4" /> Go to Receipt Allocation
            </Button>
          </Link>
        </div>
      }
      layout="split"
      className="h-full min-h-0"
    >
      <div className="flex-shrink-0 border-b border-border/60 bg-white px-4 py-3 space-y-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Customer Information
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
            {[
              ["Customer", customer.customerName],
              ["Code", customer.customerCode],
              ["GSTIN", customer.gstin || "—"],
              ["Mobile", customer.mobile],
              ["Territory", customer.territoryName || "—"],
              ["Sales Executive", customer.salesManName || "Rajesh Sharma"],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-[10px] uppercase text-muted-foreground font-semibold">{label}</p>
                <p className="font-medium mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Invoice Information
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
            {[
              ["Invoice No.", invoice.invoiceNo],
              ["Invoice Date", formatReportDate(invoice.invoiceDate)],
              ["Due Date", formatReportDate(invoice.dueDate)],
              ["Invoice Amount", formatMoney(invoice.invoiceAmount)],
              ["Received", formatMoney(invoice.paidAmount)],
              ["Outstanding", formatMoney(invoice.outstanding)],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-[10px] uppercase text-muted-foreground font-semibold">{label}</p>
                <p className="font-medium mt-0.5">{value}</p>
              </div>
            ))}
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-semibold">Status</p>
              <div className="mt-1">
                <StatusBadge status={invoice.status} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 rounded-lg border border-border/60 bg-muted/10 p-3 text-xs">
          <div>
            <p className="text-[10px] uppercase text-muted-foreground font-semibold">Invoice Amount</p>
            <p className="text-sm font-bold mt-0.5 tabular-nums">{formatMoney(summary.invoiceAmount)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted-foreground font-semibold">Total Received</p>
            <p className="text-sm font-bold mt-0.5 tabular-nums">{formatMoney(summary.receivedAmount)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted-foreground font-semibold">Outstanding</p>
            <p className="text-sm font-bold mt-0.5 tabular-nums text-brand-700">
              {formatMoney(summary.outstandingAmount)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-shrink-0 px-4 py-2 border-b border-border/60 bg-white">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Receipt History
          </p>
        </div>
        <AccountsTableScroll className="flex-1 min-h-0">
          <AccountsTable minWidth={720}>
            <AccountsTableHead>
              <AccountsTableHeadRow>
                {["Receipt No.", "Date", "Amount", "Mode", "Reference"].map((h) => (
                  <AccountsTableHeadCell key={h}>{h}</AccountsTableHeadCell>
                ))}
              </AccountsTableHeadRow>
            </AccountsTableHead>
            <AccountsTableBody>
              {receiptHistory.length === 0 ? (
                <AccountsTableRow>
                  <AccountsTableCell colSpan={5} className="accounts-table-empty">
                    No receipts recorded against this invoice.
                  </AccountsTableCell>
                </AccountsTableRow>
              ) : (
                receiptHistory.map((r, i) => (
                  <AccountsTableRow key={`${r.receiptNo}-${i}`}>
                    <AccountsTableCell>
                      <span className="font-mono text-xs font-semibold text-brand-700">{r.receiptNo}</span>
                    </AccountsTableCell>
                    <AccountsTableCell>{formatReportDate(r.receiptDate)}</AccountsTableCell>
                    <AccountsTableCell align="right">
                      <span className="tabular-nums">{formatMoney(r.amount)}</span>
                    </AccountsTableCell>
                    <AccountsTableCell>{r.paymentMode}</AccountsTableCell>
                    <AccountsTableCell>
                      <span className="font-mono text-[11px]">{r.referenceNo}</span>
                    </AccountsTableCell>
                  </AccountsTableRow>
                ))
              )}
            </AccountsTableBody>
          </AccountsTable>
        </AccountsTableScroll>
      </div>
    </AccountsPageShell>
  );
}
