"use client";

import { useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Receipt } from "lucide-react";
import {
  AccountsTableActionCell,
  AccountsViewAction,
  accountsActionColClass,
} from "@/components/accounts/AccountsTableActions";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  getCustomerOutstandingDetail,
  type CustomerInvoiceOutstandingRow,
} from "@/lib/accounts/receivables-data";
import { useAccountsSectionRefresh } from "@/lib/accounts/use-accounts-section-refresh";
import { formatMoney } from "@/lib/accounts/money-format";
import {
  AccountsColumnFilterProvider,
  AccountsColumnHeader,
  SortTh,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
import { Button } from "@/components/ui/button";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableHead,
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

function OpenInvoicesTable({
  rows,
  onOpenInvoice,
}: {
  rows: CustomerInvoiceOutstandingRow[];
  onOpenInvoice: (invoiceId: number) => void;
}) {
  const visible = useAccountsFilteredRows(rows);

  return (
    <AccountsTableScroll className="flex-1 min-h-0">
      <AccountsTable minWidth={960}>
        <AccountsTableHead>
          <AccountsTableHeadRow>
            <SortTh label="Invoice No." colKey="invoiceNo" />
            <SortTh label="Invoice Date" colKey="invoiceDate" filterType="date" />
            <SortTh label="Invoice Amount" colKey="invoiceAmount" filterType="amount" align="right" />
            <SortTh label="Received" colKey="paidAmount" filterType="amount" align="right" />
            <SortTh label="Outstanding" colKey="outstanding" filterType="amount" align="right" />
            <SortTh label="Due Date" colKey="dueDate" filterType="date" />
            <AccountsColumnHeader
              label=""
              colKey="_actions"
              sortable={false}
              filterable={false}
              align="right"
            />
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {visible.length === 0 ? (
            <AccountsTableRow>
              <AccountsTableCell colSpan={7} className="accounts-table-empty">
                {rows.length === 0
                  ? "No open invoices for this customer."
                  : "No records match the column filters."}
              </AccountsTableCell>
            </AccountsTableRow>
          ) : (
            visible.map((inv) => (
              <AccountsTableRow
                key={inv.invoiceId}
                className="group cursor-pointer"
                onClick={() => onOpenInvoice(inv.invoiceId)}
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
                <AccountsTableCell align="right" className={accountsActionColClass("single")}>
                  <AccountsTableActionCell variant="single">
                    <AccountsViewAction
                      title="View invoice"
                      href={`/accounts/transactions/invoices/${inv.invoiceId}`}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </AccountsTableActionCell>
                </AccountsTableCell>
              </AccountsTableRow>
            ))
          )}
        </AccountsTableBody>
      </AccountsTable>
    </AccountsTableScroll>
  );
}

export default function CustomerOutstandingDetailClient() {
  const params = useParams();
  const customerId = Number(params.customerId);

  const sectionRefresh = useAccountsSectionRefresh();

  const detail = useMemo(
    () => (Number.isFinite(customerId) ? getCustomerOutstandingDetail(customerId) : null),
    [customerId, sectionRefresh],
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
            <Button variant="outline" size="sm" className="h-9 text-sm font-medium gap-1">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </Link>
          <Link href={`/accounts/receivables/receipt-allocation?customer=${customer.id}`}>
            <Button size="sm" className="h-9 text-sm font-medium gap-1 bg-brand-600 hover:bg-brand-700 text-white">
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
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
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
                <p className="text-xs uppercase text-muted-foreground font-semibold">{label}</p>
                <p className="font-medium mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 rounded-lg border border-border/60 bg-muted/10 p-3 text-xs">
          <div>
            <p className="text-xs uppercase text-muted-foreground font-semibold">Total Sales</p>
            <p className="text-sm font-bold mt-0.5 tabular-nums">{formatMoney(detail.totalSales)}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground font-semibold">Total Receipts</p>
            <p className="text-sm font-bold mt-0.5 tabular-nums">{formatMoney(detail.totalReceipts)}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground font-semibold">Current Outstanding</p>
            <p className="text-sm font-bold mt-0.5 tabular-nums text-brand-700">
              {formatMoney(detail.currentOutstanding)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-shrink-0 px-4 py-2 border-b border-border/60 bg-white">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Open Invoices
          </p>
        </div>
        <AccountsColumnFilterProvider
          rows={openInvoices}
          getCellValue={(row, key) => (row as unknown as Record<string, unknown>)[key]}
          columnConfig={{
            invoiceNo: { type: "text" },
            invoiceDate: { type: "date" },
            invoiceAmount: { type: "amount" },
            paidAmount: { type: "amount" },
            outstanding: { type: "amount" },
            dueDate: { type: "date" },
          }}
          defaultSortKey="dueDate"
          defaultSortDir="asc"
        >
          <OpenInvoicesTable rows={openInvoices} onOpenInvoice={openInvoice} />
        </AccountsColumnFilterProvider>
      </div>
    </AccountsPageShell>
  );
}
