"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { MoneyAmount } from "@/components/accounts/MoneyAmount";
import { SectionTabs } from "@/app/(app)/accounts/components/AccountsUI";
import { LedgerTransactionsTable } from "@/components/accounts/LedgerTransactionsTable";
import {
  LedgerTransactionDateFilter,
  useLedgerTransactionDateFilter,
} from "@/components/accounts/LedgerTransactionDateFilter";
import { loadChartOfAccounts } from "../../../data";
import { computeLedgerBalanceBreakdown } from "../ledgers-utils";
import {
  buildLedgerStatementForDateRange,
  collectLedgerTransactions,
  getLedgerById,
  ledgerOutstanding,
  parentGroupLabel,
  primaryHeadForLedger,
  resolveLedgerType,
  type LedgerTypeLabel,
} from "@/lib/accounts/ledger-detail-utils";
import {
  computePeriodClosingBalance,
  ledgerMovementTotalsForRange,
} from "@/lib/accounts/ledger-transaction-date-filter";
import { formatMoney } from "@/lib/accounts/money-format";
import { loadLedgerMeta } from "@/lib/accounts/ledger-metadata";
import { resolveCoaMasterLink } from "@/lib/accounts/coa-master-link";
import { loadInvoices } from "@/app/(app)/accounts/invoices/invoices-data";
import { loadPurchaseInvoices } from "@/app/(app)/accounts/purchase-invoices/purchase-invoices-data";
import { loadVouchers } from "@/app/(app)/accounts/vouchers/voucher-data";
import {
  computeBatchRegister,
  ensureInventoryAccountingLedgers,
} from "@/lib/accounts/inventory-accounting-data";
import { invoiceMatchesCustomerLedger } from "@/lib/accounts/invoice-ledger-match";

const BASE_TABS = [
  { id: "transactions", label: "Transactions" },
  { id: "type-detail", label: "Ledger Activity" },
];

export default function LedgerDetailClient({
  ledgerId,
  initialTab = "transactions",
}: {
  ledgerId: number;
  initialTab?: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState(initialTab === "statement" ? "transactions" : initialTab);
  const [records, setRecords] = useState(() => loadChartOfAccounts());
  const { applied, draft, setPreset, setDraftFrom, setDraftTo, apply } = useLedgerTransactionDateFilter();

  useEffect(() => {
    setRecords(loadChartOfAccounts());
  }, [ledgerId]);

  useEffect(() => {
    setTab(initialTab === "statement" ? "transactions" : initialTab);
  }, [initialTab, ledgerId]);

  const ledger = useMemo(() => getLedgerById(ledgerId), [ledgerId, records]);
  const balance = useMemo(
    () => (ledger ? computeLedgerBalanceBreakdown(ledger) : null),
    [ledger],
  );
  const ledgerType = useMemo(
    () => (ledger ? resolveLedgerType(ledger, records) : "General"),
    [ledger, records],
  );
  const meta = useMemo(() => (ledger ? loadLedgerMeta(ledger.id) : null), [ledger]);
  const masterLink = useMemo(
    () => (ledger ? resolveCoaMasterLink(ledger, records) : null),
    [ledger, records],
  );
  const outstanding = useMemo(() => (ledger ? ledgerOutstanding(ledger) : 0), [ledger]);
  const transactions = useMemo(
    () => (ledger ? collectLedgerTransactions(ledger.id) : []),
    [ledger],
  );
  const statement = useMemo(
    () =>
      ledger
        ? buildLedgerStatementForDateRange(ledger, transactions, applied.from, applied.to)
        : [],
    [ledger, transactions, applied.from, applied.to],
  );
  const { totalDebit, totalCredit } = useMemo(
    () => ledgerMovementTotalsForRange(transactions, applied.from, applied.to),
    [transactions, applied.from, applied.to],
  );
  const periodClosing = useMemo(
    () => (ledger ? computePeriodClosingBalance(ledger, totalDebit, totalCredit) : null),
    [ledger, totalDebit, totalCredit],
  );

  const tabs = useMemo(() => {
    if (ledgerType === "General") return [BASE_TABS[0]];
    return BASE_TABS;
  }, [ledgerType]);

  if (!ledger) {
    return (
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Masters", "Ledgers", "/accounts/masters/ledgers")}
        title="Ledger not found"
        description="This ledger may have been removed."
      >
        <div className="p-8 text-center text-sm text-muted-foreground">
          <Link href="/accounts/masters/ledgers" className="text-brand-600 hover:underline">
            Back to Ledgers
          </Link>
        </div>
      </AccountsPageShell>
    );
  }

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Masters", "Ledgers", "/accounts/masters/ledgers")}
      title={ledger.accountName}
      description={`${ledger.accountCode} · ${parentGroupLabel(records, ledger)} · ${primaryHeadForLedger(records, ledger)}`}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {masterLink?.masterHref && (
            <Link
              href={masterLink.masterHref}
              className="h-8 px-3 text-xs border border-border rounded-lg hover:bg-muted/40 inline-flex items-center"
            >
              View {masterLink.categoryLabel}
            </Link>
          )}
          <button
            type="button"
            onClick={() => router.push(`/accounts/masters/chart-of-accounts?node=${ledger.id}`)}
            className="h-8 px-3 text-xs border border-border rounded-lg hover:bg-muted/40"
          >
            Open in COA
          </button>
        </div>
      }
      layout="split"
    >
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-shrink-0 border-b border-border/60 bg-white">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-px bg-border/40">
            {[
              { label: "Ledger Code", value: ledger.accountCode },
              { label: "Parent Group", value: parentGroupLabel(records, ledger) },
              { label: "Primary Head", value: primaryHeadForLedger(records, ledger) },
              {
                label: "Opening Balance",
                value: <MoneyAmount amount={ledger.openingBalance} side={ledger.balanceType} />,
              },
              { label: "Period Debit", value: formatMoney(totalDebit), accent: "debit" },
              { label: "Period Credit", value: formatMoney(totalCredit), accent: "credit" },
              {
                label: "Closing Balance",
                value: periodClosing ? (
                  <MoneyAmount amount={periodClosing.amount} side={periodClosing.balanceType} />
                ) : (
                  "—"
                ),
                highlight: true,
              },
              {
                label: ledgerType === "Customer" ? "Outstanding" : ledgerType === "Vendor" ? "Payable" : "Type",
                value:
                  ledgerType === "Customer" || ledgerType === "Vendor"
                    ? formatMoney(outstanding)
                    : ledgerType,
              },
            ].map((item) => (
              <div key={item.label} className="bg-white px-3 py-2.5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {item.label}
                </p>
                <div
                  className={`text-sm font-semibold mt-0.5 tabular-nums ${
                    item.highlight ? "text-brand-700" : item.accent === "debit" ? "text-emerald-800" : item.accent === "credit" ? "text-red-700" : "text-foreground"
                  }`}
                >
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {tabs.length > 1 && (
          <div className="flex-shrink-0 px-4 pt-3 border-b border-border/60">
            <SectionTabs
              tabs={tabs}
              active={tab}
              onChange={setTab}
              counts={{ transactions: Math.max(0, statement.length - 1) }}
            />
          </div>
        )}

        <div className="flex-1 overflow-auto p-4">
          {tab === "transactions" && (
            <div className="space-y-4">
              <LedgerTransactionDateFilter
                preset={draft.preset}
                dateFrom={draft.from}
                dateTo={draft.to}
                onPresetChange={setPreset}
                onDateFromChange={setDraftFrom}
                onDateToChange={setDraftTo}
                onApply={apply}
              />
              <LedgerTransactionsTable
                rows={statement}
                emptyLabel="No vouchers or source documents linked to this ledger yet. Post sales invoices, purchase bills, or vouchers to see the audit trail here."
              />
            </div>
          )}

          {tab === "type-detail" && (
            <LedgerTypeDetail
              ledgerType={ledgerType}
              ledgerName={ledger.accountName}
              ledgerId={ledger.id}
              meta={meta}
              outstanding={outstanding}
              openingBalance={ledger.openingBalance}
              openingSide={ledger.balanceType}
              closingBalance={balance?.currentBalance.amount ?? 0}
              closingSide={balance?.currentBalance.balanceType ?? "Debit"}
            />
          )}
        </div>
      </div>
    </AccountsPageShell>
  );
}

function LedgerTypeDetail({
  ledgerType,
  ledgerName,
  ledgerId,
  meta,
  outstanding,
  openingBalance,
  openingSide,
  closingBalance,
  closingSide,
}: {
  ledgerType: LedgerTypeLabel;
  ledgerName: string;
  ledgerId: number;
  meta: ReturnType<typeof loadLedgerMeta> | null;
  outstanding: number;
  openingBalance: number;
  openingSide: "Debit" | "Credit";
  closingBalance: number;
  closingSide: "Debit" | "Credit";
}) {
  switch (ledgerType) {
    case "Customer":
      return (
        <CustomerLedgerDetail
          ledgerName={ledgerName}
          ledgerId={ledgerId}
          outstanding={outstanding}
          openingBalance={openingBalance}
          openingSide={openingSide}
          closingBalance={closingBalance}
          closingSide={closingSide}
        />
      );
    case "Vendor":
      return (
        <VendorLedgerDetail
          ledgerName={ledgerName}
          ledgerId={ledgerId}
          outstanding={outstanding}
          openingBalance={openingBalance}
          openingSide={openingSide}
          closingBalance={closingBalance}
          closingSide={closingSide}
        />
      );
    case "Bank":
      return (
        <BankLedgerDetail
          ledgerName={ledgerName}
          ledgerId={ledgerId}
          accountNumber={meta?.accountNumber}
          reconciliationEnabled={meta?.reconciliationEnabled}
          openingBalance={openingBalance}
          openingSide={openingSide}
          closingBalance={closingBalance}
          closingSide={closingSide}
        />
      );
    case "Inventory":
      return <InventoryLedgerDetail ledgerName={ledgerName} />;
    case "Sales":
      return <SalesLedgerDetail ledgerName={ledgerName} />;
    case "Purchase":
      return <PurchaseLedgerDetail ledgerName={ledgerName} />;
    case "GST":
      return <GstLedgerDetail ledgerId={ledgerId} />;
    case "Expense":
      return <ExpenseLedgerDetail ledgerId={ledgerId} ledgerName={ledgerName} />;
    case "Income":
      return <IncomeLedgerDetail ledgerId={ledgerId} ledgerName={ledgerName} />;
    default:
      return null;
  }
}

function DetailTable({
  title,
  columns,
  rows,
  empty,
}: {
  title: string;
  columns: string[];
  rows: (string | number)[][];
  empty: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-border/60 p-4">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-2">{empty}</p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-border/60 overflow-hidden">
      <p className="text-sm font-medium text-foreground px-4 py-2.5 border-b border-border/40 bg-muted/10">
        {title}
      </p>
      <table className="accounts-table w-full">
        <thead>
          <tr className="border-b border-border/40 bg-muted/5">
            {columns.map((c) => (
              <th key={c} className="px-3 py-2 text-left font-semibold uppercase text-muted-foreground">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border/30">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 tabular-nums">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CustomerLedgerDetail({
  ledgerName,
  ledgerId,
  outstanding,
  openingBalance,
  openingSide,
  closingBalance,
  closingSide,
}: {
  ledgerName: string;
  ledgerId: number;
  outstanding: number;
  openingBalance: number;
  openingSide: "Debit" | "Credit";
  closingBalance: number;
  closingSide: "Debit" | "Credit";
}) {
  const invoices = loadInvoices()
    .filter((inv) => invoiceMatchesCustomerLedger(inv, ledgerId, ledgerName))
    .sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate));

  const receipts = loadVouchers()
    .filter(
      (v) =>
        (v.status === "posted" || v.status === "approved") &&
        v.voucherType === "receipt" &&
        v.lines.some((l) => l.ledgerId === ledgerId),
    )
    .sort((a, b) => b.date.localeCompare(a.date));

  const creditNotes = loadVouchers()
    .filter(
      (v) =>
        (v.status === "posted" || v.status === "approved") &&
        v.voucherType === "credit_note" &&
        v.lines.some((l) => l.ledgerId === ledgerId),
    )
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Opening Balance", value: `${formatMoney(openingBalance)} ${openingSide}` },
          { label: "Current Outstanding", value: formatMoney(outstanding) },
          { label: "Closing Balance", value: `${formatMoney(closingBalance)} ${closingSide}` },
          { label: "Open Invoices", value: String(invoices.filter((i) => i.balanceAmount > 0).length) },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-border/60 p-3 bg-muted/5">
            <p className="text-xs uppercase text-muted-foreground">{item.label}</p>
            <p className="text-sm font-semibold mt-1">{item.value}</p>
          </div>
        ))}
      </div>

      <DetailTable
        title="Invoice-wise Outstanding"
        columns={["Date", "Invoice No", "Amount", "Received", "Balance"]}
        rows={invoices.map((inv) => [
          inv.invoiceDate,
          inv.invoiceNo,
          formatMoney(inv.grandTotal),
          formatMoney(inv.amountReceived),
          formatMoney(inv.balanceAmount),
        ])}
        empty="No sales invoices for this customer."
      />

      <DetailTable
        title="Receipts"
        columns={["Date", "Receipt No", "Amount", "Reference"]}
        rows={receipts.map((v) => {
          const line = v.lines.find((l) => l.ledgerId === ledgerId);
          return [
            v.date,
            v.voucherNumber,
            formatMoney(Number(line?.credit) || 0),
            v.referenceNo || v.narration,
          ];
        })}
        empty="No receipt vouchers recorded."
      />

      <DetailTable
        title="Credit Notes"
        columns={["Date", "Voucher No", "Amount", "Narration"]}
        rows={creditNotes.map((v) => {
          const line = v.lines.find((l) => l.ledgerId === ledgerId);
          return [v.date, v.referenceNo || v.voucherNumber, formatMoney(Number(line?.credit) || 0), v.narration];
        })}
        empty="No credit notes applied."
      />
    </div>
  );
}

function VendorLedgerDetail({
  ledgerName,
  ledgerId,
  outstanding,
  openingBalance,
  openingSide,
  closingBalance,
  closingSide,
}: {
  ledgerName: string;
  ledgerId: number;
  outstanding: number;
  openingBalance: number;
  openingSide: "Debit" | "Credit";
  closingBalance: number;
  closingSide: "Debit" | "Credit";
}) {
  const bills = loadPurchaseInvoices()
    .filter((b) => b.vendorName === ledgerName)
    .sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate));

  const payments = loadVouchers()
    .filter(
      (v) =>
        (v.status === "posted" || v.status === "approved") &&
        v.voucherType === "payment" &&
        v.lines.some((l) => l.ledgerId === ledgerId),
    )
    .sort((a, b) => b.date.localeCompare(a.date));

  const debitNotes = loadVouchers()
    .filter(
      (v) =>
        (v.status === "posted" || v.status === "approved") &&
        v.voucherType === "debit_note" &&
        v.lines.some((l) => l.ledgerId === ledgerId),
    )
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Opening Balance", value: `${formatMoney(openingBalance)} ${openingSide}` },
          { label: "Current Payable", value: formatMoney(outstanding) },
          { label: "Closing Balance", value: `${formatMoney(closingBalance)} ${closingSide}` },
          { label: "Open Bills", value: String(bills.filter((b) => b.grandTotal - b.amountPaid > 0).length) },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-border/60 p-3 bg-muted/5">
            <p className="text-xs uppercase text-muted-foreground">{item.label}</p>
            <p className="text-sm font-semibold mt-1">{item.value}</p>
          </div>
        ))}
      </div>

      <DetailTable
        title="Bill-wise Outstanding"
        columns={["Date", "Bill No", "GRN", "Amount", "Paid", "Balance"]}
        rows={bills.map((b) => [
          b.invoiceDate,
          b.invoiceNo,
          b.grnNo || "—",
          formatMoney(b.grandTotal),
          formatMoney(b.amountPaid),
          formatMoney(b.grandTotal - b.amountPaid),
        ])}
        empty="No purchase bills for this vendor."
      />

      <DetailTable
        title="Payments"
        columns={["Date", "Payment No", "Amount", "Reference"]}
        rows={payments.map((v) => {
          const line = v.lines.find((l) => l.ledgerId === ledgerId);
          return [
            v.date,
            v.voucherNumber,
            formatMoney(Number(line?.debit) || 0),
            v.referenceNo || v.narration,
          ];
        })}
        empty="No payment vouchers recorded."
      />

      <DetailTable
        title="Debit Notes"
        columns={["Date", "Voucher No", "Amount", "Narration"]}
        rows={debitNotes.map((v) => {
          const line = v.lines.find((l) => l.ledgerId === ledgerId);
          return [v.date, v.referenceNo || v.voucherNumber, formatMoney(Number(line?.debit) || 0), v.narration];
        })}
        empty="No debit notes applied."
      />
    </div>
  );
}

function BankLedgerDetail({
  ledgerName,
  ledgerId,
  accountNumber,
  reconciliationEnabled,
  openingBalance,
  openingSide,
  closingBalance,
  closingSide,
}: {
  ledgerName: string;
  ledgerId: number;
  accountNumber?: string;
  reconciliationEnabled?: boolean;
  openingBalance: number;
  openingSide: "Debit" | "Credit";
  closingBalance: number;
  closingSide: "Debit" | "Credit";
}) {
  const vouchers = loadVouchers()
    .filter(
      (v) =>
        (v.status === "posted" || v.status === "approved") &&
        v.lines.some((l) => l.ledgerId === ledgerId),
    )
    .sort((a, b) => b.date.localeCompare(a.date));

  const receipts = vouchers.filter((v) => v.voucherType === "receipt");
  const payments = vouchers.filter((v) => v.voucherType === "payment");
  const contra = vouchers.filter((v) => v.voucherType === "contra");

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Account Number", value: accountNumber || "—" },
          { label: "Opening Balance", value: `${formatMoney(openingBalance)} ${openingSide}` },
          { label: "Closing Balance", value: `${formatMoney(closingBalance)} ${closingSide}` },
          {
            label: "Reconciliation",
            value: reconciliationEnabled ? "Enabled" : "Not configured",
          },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-border/60 p-3 bg-muted/5">
            <p className="text-xs uppercase text-muted-foreground">{item.label}</p>
            <p className="text-sm font-semibold mt-1">{item.value}</p>
          </div>
        ))}
      </div>

      <DetailTable
        title="Receipts"
        columns={["Date", "Receipt No", "Amount", "Narration"]}
        rows={receipts.map((v) => {
          const line = v.lines.find((l) => l.ledgerId === ledgerId);
          return [v.date, v.voucherNumber, formatMoney(Number(line?.debit) || 0), v.narration];
        })}
        empty="No receipts on this bank account."
      />

      <DetailTable
        title="Payments"
        columns={["Date", "Payment No", "Amount", "Narration"]}
        rows={payments.map((v) => {
          const line = v.lines.find((l) => l.ledgerId === ledgerId);
          return [v.date, v.voucherNumber, formatMoney(Number(line?.credit) || 0), v.narration];
        })}
        empty="No payments from this bank account."
      />

      <DetailTable
        title="Contra Transfers"
        columns={["Date", "Voucher No", "Debit", "Credit", "Narration"]}
        rows={contra.map((v) => {
          const line = v.lines.find((l) => l.ledgerId === ledgerId);
          return [
            v.date,
            v.voucherNumber,
            formatMoney(Number(line?.debit) || 0),
            formatMoney(Number(line?.credit) || 0),
            v.narration,
          ];
        })}
        empty="No contra transfers."
      />

      <Link href="/accounts/banking/reconciliation" className="text-xs text-brand-600 hover:underline">
        View Bank Reconciliation â†’
      </Link>
    </div>
  );
}

function InventoryLedgerDetail({ ledgerName }: { ledgerName: string }) {
  ensureInventoryAccountingLedgers();
  const batches = computeBatchRegister().filter(
    (b) =>
      ledgerName.toLowerCase().includes(b.product.toLowerCase()) ||
      b.product.toLowerCase().includes(ledgerName.toLowerCase().replace(" stock", "")),
  );

  return (
    <div className="space-y-4 max-w-5xl">
      <DetailTable
        title="Product-wise Stock Valuation"
        columns={["Product", "SKU", "Warehouse", "Batch", "Qty", "CP", "Stock Value", "Expiry"]}
        rows={batches.map((b) => [
          b.product,
          b.sku,
          b.warehouse,
          b.batchNo,
          String(b.availableQty),
          formatMoney(b.costPrice),
          formatMoney(b.stockValue),
          b.expiryDate || "—",
        ])}
        empty="No batch register entries match this inventory ledger. View stock valuation report for full register."
      />
      <Link href="/accounts/reports/stock-valuation" className="text-xs text-brand-600 hover:underline">
        Open Stock Valuation Report â†’
      </Link>
    </div>
  );
}

function SalesLedgerDetail({ ledgerName }: { ledgerName: string }) {
  const invoices = loadInvoices()
    .filter((inv) => inv.invoiceStatus !== "cancelled")
    .sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate));

  return (
    <DetailTable
      title="Invoice-wise Sales"
      columns={["Date", "Invoice No", "Customer", "Taxable", "GST", "Net Sales"]}
      rows={invoices.map((inv) => [
        inv.invoiceDate,
        inv.invoiceNo,
        inv.customerName,
        formatMoney(inv.grandTotal - inv.taxAmount),
        formatMoney(inv.taxAmount),
        formatMoney(inv.grandTotal),
      ])}
      empty="No sales invoices posted."
    />
  );
}

function PurchaseLedgerDetail({ ledgerName }: { ledgerName: string }) {
  const bills = loadPurchaseInvoices().sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate));

  return (
    <DetailTable
      title="Bill-wise Purchases"
      columns={["Date", "Bill No", "Supplier", "GRN/PO", "Taxable", "GST", "Total"]}
      rows={bills.map((b) => [
        b.invoiceDate,
        b.invoiceNo,
        b.vendorName,
        b.grnNo || b.poNumber || "—",
        formatMoney(b.grandTotal - b.taxAmount),
        formatMoney(b.taxAmount),
        formatMoney(b.grandTotal),
      ])}
      empty="No purchase bills posted."
    />
  );
}

function GstLedgerDetail({ ledgerId }: { ledgerId: number }) {
  const rows = collectLedgerTransactions(ledgerId);
  return (
    <DetailTable
      title="GST Transactions"
      columns={["Date", "Document", "Source", "Debit", "Credit"]}
      rows={rows.map((r) => [
        r.date,
        r.voucherNo,
        r.sourceModule,
        formatMoney(r.debit),
        formatMoney(r.credit),
      ])}
      empty="No GST postings on this ledger."
    />
  );
}

function ExpenseLedgerDetail({ ledgerId, ledgerName }: { ledgerId: number; ledgerName: string }) {
  const rows = collectLedgerTransactions(ledgerId);
  const payments = rows.filter((r) => r.voucherType.includes("Payment"));
  const purchases = rows.filter((r) => r.sourceModule.includes("Purchase"));

  return (
    <div className="space-y-4">
      <DetailTable
        title="Payment Vouchers"
        columns={["Date", "Voucher", "Amount", "Particulars"]}
        rows={payments.map((r) => [r.date, r.voucherNo, formatMoney(r.debit), r.particulars])}
        empty="No payment vouchers."
      />
      <DetailTable
        title="Purchase Bills"
        columns={["Date", "Bill", "Amount", "Particulars"]}
        rows={purchases.map((r) => [r.date, r.voucherNo, formatMoney(r.debit), r.particulars])}
        empty="No purchase bill entries."
      />
    </div>
  );
}

function IncomeLedgerDetail({ ledgerId, ledgerName }: { ledgerId: number; ledgerName: string }) {
  const rows = collectLedgerTransactions(ledgerId);
  return (
    <DetailTable
      title="Income Entries"
      columns={["Date", "Document", "Source", "Credit", "Particulars"]}
      rows={rows.map((r) => [r.date, r.voucherNo, r.sourceModule, formatMoney(r.credit), r.particulars])}
      empty="No income entries on this ledger."
    />
  );
}
