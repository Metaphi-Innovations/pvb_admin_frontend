"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  mapCustomerDetailInvoiceRow,
} from "@/lib/accounts/receivables-api-mappers";
import type { ApiCustomerInvoiceOutstandingRow } from "@/types/receivables.types";
import { useAccountsSectionRefresh } from "@/lib/accounts/use-accounts-section-refresh";
import { formatMoney } from "@/lib/accounts/money-format";
import { ReceivablesService } from "@/services/receivables.service";
import type { CustomerOutstandingDetailApi, CustomerReceiptHistoryRow } from "@/types/receivables.types";
import { defaultAsOnDate } from "@/lib/accounts/report-date-presets";
import {
  fetchCustomerReceiptHistory,
  paymentVoucherStatusToBadgeKey,
} from "@/lib/accounts/outstanding-voucher-history";
import { receiptViewPath } from "@/app/(app)/accounts/vouchers/receipt/receipt-voucher-utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
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
  AccountsTableHeadCell,
  AccountsTableHeadRow,
  AccountsTableRow,
  AccountsTableScroll,
} from "@/components/accounts/AccountsTable";
import { PartyCrossNavButtons } from "@/components/accounts/PartyCrossNavButtons";
import { buildReceivablesDetailCrossNavLinks } from "@/lib/accounts/party-cross-nav";

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
  rows: ApiCustomerInvoiceOutstandingRow[];
  onOpenInvoice: (openItemId: string) => void;
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
                key={inv.openItemId}
                className="group cursor-pointer"
                onClick={() => onOpenInvoice(inv.openItemId)}
              >
                <AccountsTableCell>
                  <span className="text-xs font-mono font-semibold text-brand-700">{inv.invoiceNo}</span>
                </AccountsTableCell>
                <AccountsTableCell>{formatReportDate(inv.invoiceDate)}</AccountsTableCell>
                <AccountsTableCell align="right" money>
                  {formatMoney(inv.invoiceAmount)}
                </AccountsTableCell>
                <AccountsTableCell align="right" money>
                  {formatMoney(inv.paidAmount)}
                </AccountsTableCell>
                <AccountsTableCell align="right" money className="font-semibold">
                  {formatMoney(inv.outstanding)}
                </AccountsTableCell>
                <AccountsTableCell>{formatReportDate(inv.dueDate)}</AccountsTableCell>
                <AccountsTableCell align="right" className={accountsActionColClass("single")}>
                  <AccountsTableActionCell variant="single">
                    <AccountsViewAction
                      title="View invoice"
                      href={
                        inv.invoiceId
                          ? `/accounts/transactions/invoices/${inv.invoiceId}`
                          : undefined
                      }
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
  const customerId = String(params.customerId ?? "");
  const [asOnDate] = useState(defaultAsOnDate());

  const sectionRefresh = useAccountsSectionRefresh();
  const [detail, setDetail] = useState<CustomerOutstandingDetailApi | null>(null);
  const [receiptHistory, setReceiptHistory] = useState<CustomerReceiptHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customerId) {
      setDetail(null);
      setReceiptHistory([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await ReceivablesService.getCustomerOutstanding(customerId);
        if (!cancelled) setDetail(data);
      } catch (e) {
        if (!cancelled) {
          setDetail(null);
          setError(e instanceof Error ? e.message : "Failed to load customer outstanding.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId, sectionRefresh]);

  useEffect(() => {
    if (!customerId) return;
    let cancelled = false;
    (async () => {
      setHistoryLoading(true);
      setHistoryError(null);
      try {
        const history = await fetchCustomerReceiptHistory(customerId, asOnDate);
        if (!cancelled) setReceiptHistory(history);
      } catch (e) {
        if (!cancelled) {
          setReceiptHistory([]);
          setHistoryError(
            e instanceof Error ? e.message : "Failed to load receipt history.",
          );
        }
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId, asOnDate, sectionRefresh]);

  const invoices = useMemo(
    () => (detail?.openInvoices ?? []).map(mapCustomerDetailInvoiceRow),
    [detail],
  );

  const openInvoices = useMemo(
    () => invoices.filter((i) => i.outstanding > 0.009),
    [invoices],
  );

  const openInvoice = useCallback((openItemId: string) => {
    window.location.href = `/accounts/receivables/outstanding/invoice/${openItemId}`;
  }, []);

  if (loading) {
    return (
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Receivables", "Customer Outstanding", "/accounts/receivables/outstanding")}
        title="Customer Outstanding Details"
        description="Loading…"
        layout="standard"
      >
        <div className="p-8 text-center text-sm text-muted-foreground">Loading customer outstanding…</div>
      </AccountsPageShell>
    );
  }

  if (!detail) {
    return (
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Receivables", "Customer Outstanding", "/accounts/receivables/outstanding")}
        title="Customer Not Found"
        description={error || "No customer outstanding record for this ID."}
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

  const { customer } = detail;
  const crossNav = buildReceivablesDetailCrossNavLinks({
    customerId: customer.customerId,
  });

  return (
    <AccountsPageShell
      breadcrumbs={[
        ...accountsBreadcrumb("Receivables", "Customer Outstanding", "/accounts/receivables/outstanding"),
        { label: customer.customerName },
      ]}
      title="Customer Outstanding Details"
      description={`${customer.customerCode} · ${customer.territory || "—"}`}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/accounts/receivables/outstanding">
            <Button variant="outline" size="sm" className="h-9 text-sm font-medium gap-1">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </Link>
          <Link href={`/accounts/receivables/receipt-allocation?customer=${customer.customerId}`}>
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
              ["Mobile", customer.mobile || "—"],
              ["Credit Limit", formatMoney(customer.creditLimit ?? 0)],
              ["Territory", customer.territory || "—"],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs uppercase text-muted-foreground font-semibold">{label}</p>
                <p className="font-medium mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <PartyCrossNavButtons items={crossNav} label="Go to" />

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

      <div className="flex flex-col flex-1 min-h-0 overflow-auto">
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

        <section className="flex-shrink-0 border-t border-border bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-muted/20">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Receipt History
            </p>
            {historyError ? (
              <p className="text-xs text-red-600 mt-1">{historyError}</p>
            ) : null}
          </div>
          <AccountsTableScroll>
            <AccountsTable minWidth={800}>
              <AccountsTableHead>
                <AccountsTableHeadRow>
                  <AccountsTableHeadCell>Receipt No.</AccountsTableHeadCell>
                  <AccountsTableHeadCell>Date</AccountsTableHeadCell>
                  <AccountsTableHeadCell align="right">Amount</AccountsTableHeadCell>
                  <AccountsTableHeadCell align="right">Allocated</AccountsTableHeadCell>
                  <AccountsTableHeadCell>Bank Account</AccountsTableHeadCell>
                  <AccountsTableHeadCell>Reference</AccountsTableHeadCell>
                  <AccountsTableHeadCell>Status</AccountsTableHeadCell>
                </AccountsTableHeadRow>
              </AccountsTableHead>
              <AccountsTableBody>
                {historyLoading && receiptHistory.length === 0 ? (
                  <AccountsTableRow>
                    <AccountsTableCell colSpan={7} className="accounts-table-empty">
                      Loading receipt history…
                    </AccountsTableCell>
                  </AccountsTableRow>
                ) : receiptHistory.length === 0 ? (
                  <AccountsTableRow>
                    <AccountsTableCell colSpan={7} className="accounts-table-empty">
                      No receipt vouchers recorded for this customer.
                    </AccountsTableCell>
                  </AccountsTableRow>
                ) : (
                  receiptHistory.map((receipt) => (
                    <AccountsTableRow key={receipt.receiptVoucherId} className="group">
                      <AccountsTableCell mono>
                        <Link
                          href={receiptViewPath(receipt.receiptVoucherId)}
                          className="font-semibold text-brand-700 hover:underline"
                        >
                          {receipt.receiptNo}
                        </Link>
                      </AccountsTableCell>
                      <AccountsTableCell>{formatReportDate(receipt.receiptDate)}</AccountsTableCell>
                      <AccountsTableCell align="right" money>
                        {formatMoney(receipt.amount)}
                      </AccountsTableCell>
                      <AccountsTableCell align="right" money>
                        {formatMoney(receipt.allocatedAmount)}
                      </AccountsTableCell>
                      <AccountsTableCell>{receipt.bankAccount}</AccountsTableCell>
                      <AccountsTableCell mono>{receipt.referenceNo}</AccountsTableCell>
                      <AccountsTableCell>
                        <StatusBadge
                          status={paymentVoucherStatusToBadgeKey(receipt.status)}
                          label={receipt.statusLabel}
                          size="sm"
                          showDot
                        />
                      </AccountsTableCell>
                    </AccountsTableRow>
                  ))
                )}
              </AccountsTableBody>
            </AccountsTable>
          </AccountsTableScroll>
        </section>
      </div>
    </AccountsPageShell>
  );
}
