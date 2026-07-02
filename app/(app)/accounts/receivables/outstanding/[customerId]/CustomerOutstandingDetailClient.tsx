"use client";

import { useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, FileText, Receipt } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  getCustomerOutstandingDetail,
} from "@/lib/accounts/receivables-data";
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
  if (!value || value === "—") return "—";
  const [y, m, d] = value.slice(0, 10).split("-");
  if (!y || !m || !d) return value;
  return `${d}-${m}-${y}`;
}

export default function CustomerOutstandingDetailClient() {
  const params = useParams();
  const customerId = Number(params.customerId);

  useEffect(() => {
    ensureReceivablesDemoData();
  }, []);

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

  const { customer, invoices } = detail;
  const openInvoices = invoices.filter((i) => i.outstanding > 0.009);

  const openInvoice = useCallback((invoiceId: number) => {
    window.location.href = `/accounts/receivables/outstanding/invoice/${invoiceId}`;
  }, []);

  return (
    <AccountsPageShell
      breadcrumbs={[
        ...accountsBreadcrumb("Receivables", "Customer Outstanding", "/accounts/receivables/outstanding"),
        { label: customer.customerName },
      ]}
      title="Customer Outstanding Details"
      description={`${customer.customerCode} · ${customer.territoryName || customer.districtName || "—"}`}
      actions={
        <div className="flex items-center gap-2">
          <Link href="/accounts/receivables/ageing">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </Button>
          </Link>
          <Link href={`/accounts/receivables/receipt-allocation?customer=${customer.id}`}>
            <Button size="sm" className="h-8 text-xs gap-1 bg-brand-600 hover:bg-brand-700 text-white">
              <Receipt className="w-3.5 h-3.5" /> Go to Receipt Allocation
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
              ["Credit Limit", formatMoney(customer.creditLimit)],
              ["Territory", customer.territoryName || "—"],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-[10px] uppercase text-muted-foreground font-semibold">{label}</p>
                <p className="font-medium mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 rounded-lg border border-border/60 bg-muted/10 p-3 text-xs">
          <div>
            <p className="text-[10px] uppercase text-muted-foreground font-semibold">Total Sales</p>
            <p className="text-sm font-bold mt-0.5 tabular-nums">{formatMoney(detail.totalSales)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted-foreground font-semibold">Total Receipts</p>
            <p className="text-sm font-bold mt-0.5 tabular-nums">{formatMoney(detail.totalReceipts)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted-foreground font-semibold">Current Outstanding</p>
            <p className="text-sm font-bold mt-0.5 tabular-nums text-brand-700">
              {formatMoney(detail.currentOutstanding)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-shrink-0 px-4 py-2 border-b border-border/60 bg-white">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Open Invoices
          </p>
        </div>
        <AccountsTableScroll className="flex-1 min-h-0">
          <AccountsTable minWidth={960}>
            <AccountsTableHead>
              <AccountsTableHeadRow>
                {[
                  "Invoice No.",
                  "Invoice Date",
                  "Invoice Amount",
                  "Received",
                  "Outstanding",
                  "Due Date",
                  "",
                ].map((h) => (
                  <AccountsTableHeadCell key={h || "act"} align={h.includes("Amount") || h === "Received" || h === "Outstanding" ? "right" : "left"}>
                    {h}
                  </AccountsTableHeadCell>
                ))}
              </AccountsTableHeadRow>
            </AccountsTableHead>
            <AccountsTableBody>
              {openInvoices.length === 0 ? (
                <AccountsTableRow>
                  <AccountsTableCell colSpan={7} className="accounts-table-empty">
                    No open invoices for this customer.
                  </AccountsTableCell>
                </AccountsTableRow>
              ) : (
                openInvoices.map((inv) => (
                  <AccountsTableRow
                    key={inv.invoiceId}
                    className="group cursor-pointer"
                    onClick={() => openInvoice(inv.invoiceId)}
                  >
                    <AccountsTableCell>
                      <span className="text-xs font-mono font-semibold text-brand-700">{inv.invoiceNo}</span>
                    </AccountsTableCell>
                    <AccountsTableCell>{formatReportDate(inv.invoiceDate)}</AccountsTableCell>
                    <AccountsTableCell align="right">
                      <span className="tabular-nums">{formatMoney(inv.invoiceAmount)}</span>
                    </AccountsTableCell>
                    <AccountsTableCell align="right">
                      <span className="tabular-nums">{formatMoney(inv.paidAmount)}</span>
                    </AccountsTableCell>
                    <AccountsTableCell align="right">
                      <span className="tabular-nums font-semibold">{formatMoney(inv.outstanding)}</span>
                    </AccountsTableCell>
                    <AccountsTableCell>{formatReportDate(inv.dueDate)}</AccountsTableCell>
                    <AccountsTableCell align="right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100">
                        <Link
                          href={`/accounts/transactions/invoices/${inv.invoiceId}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] gap-1">
                            <FileText className="w-3.5 h-3.5" /> View
                          </Button>
                        </Link>
                      </div>
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
