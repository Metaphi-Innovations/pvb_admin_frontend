"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { mapSupplierDetailBillRow } from "@/lib/accounts/payables-api-mappers";
import type { ApiSupplierDetailBillRow } from "@/types/payables.types";
import { useAccountsSectionRefresh } from "@/lib/accounts/use-accounts-section-refresh";
import { formatDisplayDate } from "@/lib/accounts/date-display";
import { formatMoney } from "@/lib/accounts/money-format";
import { defaultAsOnDate } from "@/lib/accounts/report-date-presets";
import { PayablesService } from "@/services/payables.service";
import type { SupplierOutstandingDetailApi, VendorPaymentHistoryRow } from "@/types/payables.types";
import {
  fetchSupplierPaymentHistory,
  paymentVoucherStatusToBadgeKey,
} from "@/lib/accounts/outstanding-voucher-history";
import { paymentViewPath } from "@/app/(app)/accounts/vouchers/payment/payment-voucher-utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { payableStatusToBadge } from "@/lib/accounts/accounts-status-badges";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PartyCrossNavButtons } from "@/components/accounts/PartyCrossNavButtons";
import { buildPayablesDetailCrossNavLinks } from "@/lib/accounts/party-cross-nav";
import { resolveSupplierPartyLedgerId } from "@/lib/accounts/resolve-party-ledger";
import { loadChartOfAccounts } from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";
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

function formatCreditDays(creditDays?: number): string {
  if (creditDays == null || creditDays <= 0) return "—";
  return `${creditDays} Days`;
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
  const vendorId = String(params.vendorId ?? "");
  const highlightBillId = searchParams.get("billId") ?? "";
  const [asOnDate] = useState(defaultAsOnDate());

  const sectionRefresh = useAccountsSectionRefresh("payables");
  const [detail, setDetail] = useState<SupplierOutstandingDetailApi | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<VendorPaymentHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partyLedgerId, setPartyLedgerId] = useState<string | null>(null);

  useEffect(() => {
    if (!vendorId) {
      setDetail(null);
      setPaymentHistory([]);
      setPartyLedgerId(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [data, ledgerId] = await Promise.all([
          PayablesService.getSupplierOutstanding(vendorId, asOnDate),
          resolveSupplierPartyLedgerId(vendorId),
        ]);
        if (!cancelled) {
          setDetail(data);
          setPartyLedgerId(ledgerId);
        }
      } catch (e) {
        if (!cancelled) {
          setDetail(null);
          setPartyLedgerId(null);
          setError(e instanceof Error ? e.message : "Failed to load supplier outstanding.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vendorId, asOnDate, sectionRefresh]);

  useEffect(() => {
    if (!vendorId) return;
    let cancelled = false;
    (async () => {
      setHistoryLoading(true);
      setHistoryError(null);
      try {
        const history = await fetchSupplierPaymentHistory(vendorId, asOnDate);
        if (!cancelled) setPaymentHistory(history);
      } catch (e) {
        if (!cancelled) {
          setPaymentHistory([]);
          setHistoryError(
            e instanceof Error ? e.message : "Failed to load payment history.",
          );
        }
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vendorId, asOnDate, sectionRefresh]);

  const bills = useMemo(
    () => (detail?.openBills ?? []).map(mapSupplierDetailBillRow),
    [detail],
  );

  const openBills = useMemo(
    () => bills.filter((b) => b.outstanding > 0.009),
    [bills],
  );

  const displayBills = openBills.length > 0 ? openBills : bills;

  const highlightedBill = useMemo((): ApiSupplierDetailBillRow | null => {
    if (!highlightBillId) return null;
    return (
      bills.find(
        (b) =>
          b.billId === highlightBillId ||
          b.openItemId === highlightBillId,
      ) ?? null
    );
  }, [bills, highlightBillId]);

  const coaLedgerId = useMemo(() => {
    if (!vendorId) return undefined;
    const hit = loadChartOfAccounts().find((r) => {
      if (r.nodeLevel !== "ledger") return false;
      const sourceId = r.masterId ?? r.erpSourceId;
      return String(sourceId) === String(vendorId);
    });
    return hit?.id;
  }, [vendorId, sectionRefresh]);

  if (loading) {
    return (
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Payables", "Supplier Outstanding", "/accounts/payables/outstanding")}
        title="Supplier Outstanding Details"
        description="Loading…"
        layout="standard"
      >
        <div className="p-8 text-center text-sm text-muted-foreground">
          Loading supplier outstanding…
        </div>
      </AccountsPageShell>
    );
  }

  if (!detail) {
    return (
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Payables", "Supplier Outstanding", "/accounts/payables/outstanding")}
        title="Supplier Not Found"
        description={error || "No supplier outstanding record for this ID."}
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

  const { supplier } = detail;
  const crossNav = buildPayablesDetailCrossNavLinks({
    vendorId: supplier.supplierId,
    ledgerId: coaLedgerId,
    partyLedgerId,
  });

  return (
    <AccountsPageShell
      breadcrumbs={[
        ...accountsBreadcrumb("Payables", "Supplier Outstanding", "/accounts/payables/outstanding"),
        { label: supplier.supplierName },
      ]}
      title="Supplier Outstanding Details"
      description={`${supplier.supplierCode} · Outstanding as on ${formatDisplayDate(asOnDate)}`}
      actions={
        <div className="flex items-center gap-2">
          <Link href="/accounts/payables/outstanding">
            <Button variant="outline" size="sm" className="h-9 text-sm font-medium gap-1">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </Link>
          <Link href={`/accounts/payables/payment-allocation?vendorId=${supplier.supplierId}`}>
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
            <InfoBlock label="Supplier Name" value={supplier.supplierName} />
            <InfoBlock label="Supplier Code" value={supplier.supplierCode} />
            <InfoBlock label="GSTIN" value={supplier.gstin || "—"} />
            <InfoBlock label="Territory" value={supplier.territory || "—"} />
            <InfoBlock label="Branch" value={supplier.branch || "—"} />
            <InfoBlock label="Credit Period" value={formatCreditDays(supplier.creditDays)} />
            <InfoBlock label="Purchase Manager" value="—" />
            <InfoBlock label="Mobile" value={supplier.mobile || "—"} />
          </div>
          <PartyCrossNavButtons items={crossNav} label="Go to" />
        </section>

        {highlightedBill && (
          <section className="rounded-xl border border-brand-200 bg-brand-50/40 shadow-sm p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Invoice Information
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <InfoBlock label="Invoice No." value={highlightedBill.billNo} />
              <InfoBlock label="Invoice Date" value={formatDisplayDate(highlightedBill.billDate)} />
              <InfoBlock label="Due Date" value={formatDisplayDate(highlightedBill.dueDate)} />
              <InfoBlock
                label="Status"
                value={payableStatusToBadge(highlightedBill.status).label}
              />
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
          <AccountsTableScroll className="!flex-none max-h-none overflow-visible">
            <AccountsTable minWidth={900}>
              <AccountsTableHead>
                <AccountsTableHeadRow>
                  <AccountsTableHeadCell>Invoice No.</AccountsTableHeadCell>
                  <AccountsTableHeadCell>Invoice Date</AccountsTableHeadCell>
                  <AccountsTableHeadCell align="right">Invoice Amount</AccountsTableHeadCell>
                  <AccountsTableHeadCell align="right">Paid</AccountsTableHeadCell>
                  <AccountsTableHeadCell align="right">Outstanding</AccountsTableHeadCell>
                  <AccountsTableHeadCell>Due Date</AccountsTableHeadCell>
                  <AccountsTableHeadCell>Status</AccountsTableHeadCell>
                  <AccountsTableHeadCell align="right" />
                </AccountsTableHeadRow>
              </AccountsTableHead>
              <AccountsTableBody>
                {displayBills.length === 0 ? (
                  <AccountsTableRow>
                    <AccountsTableCell colSpan={8} className="accounts-table-empty">
                      No open invoices for this supplier.
                    </AccountsTableCell>
                  </AccountsTableRow>
                ) : (
                  displayBills.map((bill) => {
                    const badge = payableStatusToBadge(bill.status);
                    const isHighlighted =
                      bill.billId === highlightBillId || bill.openItemId === highlightBillId;
                    const purchaseInvoiceHref = `/accounts/purchase-invoices/${bill.billId}`;
                    return (
                      <AccountsTableRow
                        key={bill.openItemId}
                        className={cn(isHighlighted && "bg-brand-50/50")}
                      >
                        <AccountsTableCell mono>
                          <Link
                            href={purchaseInvoiceHref}
                            className="font-semibold text-brand-700 hover:underline"
                          >
                            {bill.billNo}
                          </Link>
                        </AccountsTableCell>
                        <AccountsTableCell>{formatDisplayDate(bill.billDate)}</AccountsTableCell>
                        <AccountsTableCell align="right" money>
                          {formatMoney(bill.billAmount)}
                        </AccountsTableCell>
                        <AccountsTableCell align="right" money>
                          {formatMoney(bill.paidAmount)}
                        </AccountsTableCell>
                        <AccountsTableCell align="right" money>
                          <span className="font-semibold">{formatMoney(bill.outstanding)}</span>
                        </AccountsTableCell>
                        <AccountsTableCell>{formatDisplayDate(bill.dueDate)}</AccountsTableCell>
                        <AccountsTableCell>
                          <StatusBadge
                            status={badge.status}
                            label={badge.label}
                            size="sm"
                            showDot
                          />
                        </AccountsTableCell>
                        <AccountsTableCell align="right">
                          <Link
                            href={purchaseInvoiceHref}
                            className="text-xs font-medium text-brand-700 hover:underline"
                          >
                            View
                          </Link>
                        </AccountsTableCell>
                      </AccountsTableRow>
                    );
                  })
                )}
              </AccountsTableBody>
            </AccountsTable>
          </AccountsTableScroll>
        </section>

        <section className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-muted/20">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Payment History
            </p>
            {historyError ? (
              <p className="text-xs text-red-600 mt-1">{historyError}</p>
            ) : null}
          </div>
          <AccountsTableScroll className="!flex-none max-h-none overflow-visible">
            <AccountsTable minWidth={800}>
              <AccountsTableHead>
                <AccountsTableHeadRow>
                  <AccountsTableHeadCell>Payment No.</AccountsTableHeadCell>
                  <AccountsTableHeadCell>Date</AccountsTableHeadCell>
                  <AccountsTableHeadCell align="right">Amount</AccountsTableHeadCell>
                  <AccountsTableHeadCell align="right">Allocated</AccountsTableHeadCell>
                  <AccountsTableHeadCell>Bank Account</AccountsTableHeadCell>
                  <AccountsTableHeadCell>Reference</AccountsTableHeadCell>
                  <AccountsTableHeadCell>Status</AccountsTableHeadCell>
                </AccountsTableHeadRow>
              </AccountsTableHead>
              <AccountsTableBody>
                {historyLoading && paymentHistory.length === 0 ? (
                  <AccountsTableRow>
                    <AccountsTableCell colSpan={7} className="accounts-table-empty">
                      Loading payment history…
                    </AccountsTableCell>
                  </AccountsTableRow>
                ) : paymentHistory.length === 0 ? (
                  <AccountsTableRow>
                    <AccountsTableCell colSpan={7} className="accounts-table-empty">
                      No payment vouchers recorded for this supplier.
                    </AccountsTableCell>
                  </AccountsTableRow>
                ) : (
                  paymentHistory.map((payment) => (
                    <AccountsTableRow key={payment.paymentVoucherId} className="group">
                      <AccountsTableCell mono>
                        <Link
                          href={paymentViewPath(payment.paymentVoucherId)}
                          className="font-semibold text-brand-700 hover:underline"
                        >
                          {payment.paymentNo}
                        </Link>
                      </AccountsTableCell>
                      <AccountsTableCell>{formatDisplayDate(payment.paymentDate)}</AccountsTableCell>
                      <AccountsTableCell align="right" money>
                        {formatMoney(payment.amount)}
                      </AccountsTableCell>
                      <AccountsTableCell align="right" money>
                        {formatMoney(payment.allocatedAmount)}
                      </AccountsTableCell>
                      <AccountsTableCell>{payment.bankAccount}</AccountsTableCell>
                      <AccountsTableCell mono>{payment.referenceNo}</AccountsTableCell>
                      <AccountsTableCell>
                        <StatusBadge
                          status={paymentVoucherStatusToBadgeKey(payment.status)}
                          label={payment.statusLabel}
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
