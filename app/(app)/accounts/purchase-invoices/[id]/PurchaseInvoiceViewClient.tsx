"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  FileMinus,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { DEBIT_NOTES_LIST_PATH } from "@/app/(app)/accounts/debit-notes/note-utils";
import { formatMoney, formatMoneyOrDash } from "@/lib/accounts/money-format";
import { purchaseInvoiceImpactResolved } from "@/lib/accounts/resolved-impact-previews";
import { LedgerImpactPreview } from "@/components/accounts/LedgerImpactPreview";
import { cn } from "@/lib/utils";
import {
  calcPurchaseLineGstSplit,
  getPurchaseInvoiceById,
  getPurchaseInvoiceGstBreakup,
} from "../purchase-invoices-data";
import { getBankAccountPrintDetails } from "@/components/accounts/WarehouseMappedBankAccountSelect";

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
      <p className="text-xs font-semibold mt-0.5">{value || "—"}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border/60">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

const ITEM_COLUMNS = [
  "#",
  "Product",
  "Description",
  "Qty",
  "Unit",
  "Rate",
  "Taxable",
  "CGST",
  "SGST",
  "IGST",
  "Total",
] as const;

function PaymentBadge({ amountPaid, grandTotal }: { amountPaid: number; grandTotal: number }) {
  if (amountPaid >= grandTotal && grandTotal > 0)
    return (
      <Badge className="text-xs h-6 bg-emerald-100 text-emerald-700 border-emerald-200 gap-1">
        <CheckCircle2 className="w-3 h-3" /> Paid
      </Badge>
    );
  if (amountPaid > 0)
    return (
      <Badge className="text-xs h-6 bg-amber-100 text-amber-700 border-amber-200 gap-1">
        <Clock className="w-3 h-3" /> Partially Paid
      </Badge>
    );
  return (
    <Badge className="text-xs h-6 bg-red-100 text-red-700 border-red-200 gap-1">
      <AlertCircle className="w-3 h-3" /> Unpaid
    </Badge>
  );
}

export default function PurchaseInvoiceViewClient({ invoiceId }: { invoiceId: number }) {
  const router = useRouter();
  const invoice = useMemo(() => getPurchaseInvoiceById(invoiceId), [invoiceId]);

  if (!invoice) {
    return (
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Purchase Invoices", "Not Found")}
        title="Invoice Not Found"
        description=""
      >
        <div className="flex flex-col items-center py-16">
          <AlertCircle className="w-8 h-8 text-muted-foreground mb-3" />
          <p className="text-sm font-medium">Purchase invoice #{invoiceId} not found.</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 h-9 text-sm font-medium"
            onClick={() => router.push("/accounts/purchase-invoices")}
          >
            Back to List
          </Button>
        </div>
      </AccountsPageShell>
    );
  }

  const outstanding = Math.max(0, invoice.grandTotal - invoice.amountPaid);
  const gst = getPurchaseInvoiceGstBreakup(invoice);

  const impactLines = purchaseInvoiceImpactResolved({
    vendorName: invoice.vendorName,
    taxable: invoice.subtotal,
    taxAmount: invoice.taxAmount,
    grandTotal: invoice.grandTotal,
  });

  return (
    <AccountsPageShell
      layout="form"
      breadcrumbs={accountsBreadcrumb("Purchase Invoices", invoice.invoiceNo)}
      title={invoice.invoiceNo}
      description={`Supplier Invoice: ${invoice.vendorInvoiceNo || "—"} · ${invoice.vendorName}`}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-sm font-medium gap-1.5"
            onClick={() => router.push("/accounts/purchase-invoices")}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          {invoice.source === "manual_entry" && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-sm font-medium gap-1.5"
              onClick={() => router.push(`/accounts/purchase-invoices/${invoice.id}/edit`)}
            >
              <Pencil className="w-4 h-4" />
              Edit
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-sm font-medium gap-1.5 text-amber-700 border-amber-200 hover:bg-amber-50"
            onClick={() => router.push(`${DEBIT_NOTES_LIST_PATH}/new?purchaseInvoiceId=${invoice.id}`)}
          >
            <FileMinus className="w-4 h-4" />
            Debit Note
          </Button>
        </div>
      }
    >
      <div className="w-full space-y-4 pb-6">
        {/* Status banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-muted/60 p-2">
              <Receipt className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-bold">{invoice.invoiceNo}</p>
              <p className="text-xs text-muted-foreground">{invoice.invoiceDate}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {invoice.grnNo && (
              <Badge variant="outline" className="text-xs h-6 text-blue-700 border-blue-200 gap-1">
                <Truck className="w-3 h-3" />
                {invoice.grnNo}
              </Badge>
            )}
            {invoice.source === "po_invoice" ? (
              <Badge variant="outline" className="text-xs h-6 text-blue-700 border-blue-200">
                GRN-Based
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs h-6 text-muted-foreground">
                Manual Entry
              </Badge>
            )}
            <PaymentBadge amountPaid={invoice.amountPaid} grandTotal={invoice.grandTotal} />
          </div>
        </div>

        {/* Vendor & Invoice Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Section title="Supplier Details">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Supplier Name" value={invoice.vendorName} />
              <Field label="GSTIN" value={invoice.vendorGst} />
              <Field label="PO Number" value={invoice.poNumber} />
              <Field label="GRN Number" value={invoice.grnNo} />
            </div>
          </Section>
          <Section title="Invoice Details">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Invoice No (Internal)" value={invoice.invoiceNo} />
              <Field label="Supplier Invoice No" value={invoice.vendorInvoiceNo} />
              <Field label="Invoice Date" value={invoice.invoiceDate} />
              <Field label="Source" value={invoice.source === "po_invoice" ? "GRN-Based" : "Manual Entry"} />
              <Field label="Warehouse" value={invoice.warehouse} />
              {(() => {
                const bank = getBankAccountPrintDetails(invoice.bankAccountId);
                if (!bank) return null;
                return (
                  <>
                    <Field label="Bank Name" value={bank.bankName} />
                    <Field label="Account No." value={bank.accountNumber} />
                    <Field label="IFSC" value={bank.ifsc} />
                    <Field label="Branch" value={bank.branchName} />
                  </>
                );
              })()}
            </div>
          </Section>
        </div>

        {/* Line Items */}
        <Section title="Items Received">
          <div className="-mx-4 -mb-4 overflow-x-auto">
            <table className="w-full text-xs min-w-[1080px]">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  {ITEM_COLUMNS.map((h) => (
                    <th
                      key={h}
                      className={cn(
                        "px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-foreground whitespace-nowrap",
                        h === "#" || h === "Product" || h === "Description" || h === "Unit"
                          ? "text-left"
                          : "text-right",
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={ITEM_COLUMNS.length}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      No line items on this invoice.
                    </td>
                  </tr>
                ) : (
                  invoice.lineItems.map((line, i) => {
                    const split = calcPurchaseLineGstSplit(line, gst.interstate);
                    return (
                      <tr key={line.id} className="border-b border-border/60 hover:bg-muted/20">
                        <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-2 font-medium">{line.productName}</td>
                        <td className="px-3 py-2 text-muted-foreground">{line.description || "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{line.invoiceQty}</td>
                        <td className="px-3 py-2 text-muted-foreground">{line.unit}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatMoney(line.unitPrice)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatMoney(split.taxable)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatMoneyOrDash(split.cgst)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatMoneyOrDash(split.sgst)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatMoneyOrDash(split.igst)}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold">
                          {formatMoney(split.lineTotal)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Financials */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Section title="Invoice Amounts">
            <div className="space-y-2 text-xs">
              <AmountRow label="Taxable Amount" value={formatMoney(gst.taxableValue)} />
              <AmountRow label="CGST" value={formatMoneyOrDash(gst.cgst)} muted />
              <AmountRow label="SGST" value={formatMoneyOrDash(gst.sgst)} muted />
              <AmountRow label="IGST" value={formatMoneyOrDash(gst.igst)} muted />
              <div className="border-t border-border/60 pt-2">
                <AmountRow label="Grand Total" value={formatMoney(gst.invoiceTotal)} bold />
              </div>
            </div>
          </Section>

          <Section title="Payment Status">
            <div className="space-y-2 text-xs">
              <AmountRow label="Invoice Amount" value={formatMoney(invoice.grandTotal)} />
              <AmountRow label="Amount Paid" value={formatMoney(invoice.amountPaid)} muted />
              <div className="border-t border-border/60 pt-2">
                <AmountRow
                  label="Outstanding Balance"
                  value={formatMoney(outstanding)}
                  bold
                  highlight={outstanding > 0}
                />
              </div>
            </div>
            <div className="mt-3">
              <PaymentBadge amountPaid={invoice.amountPaid} grandTotal={invoice.grandTotal} />
            </div>
          </Section>
        </div>

        {/* Supplier Ledger Impact */}
        <Section title="Supplier Ledger Entry">
          <div className="-mx-4 -mb-4 overflow-x-auto">
            <table className="w-full text-xs min-w-[960px]">
              <thead>
                <tr className="border-b border-border/30 bg-muted/50">
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Date</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Voucher</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Narration</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-muted-foreground">Debit</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-muted-foreground">Credit</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-muted-foreground">Balance</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/20 hover:bg-muted/20">
                  <td className="px-3 py-2.5 text-muted-foreground">{invoice.invoiceDate}</td>
                  <td className="px-3 py-2.5 font-mono font-semibold text-brand-700">{invoice.invoiceNo}</td>
                  <td className="px-3 py-2.5">
                    Purchase from {invoice.vendorName}
                    {invoice.grnNo && (
                      <span className="ml-1.5 text-blue-600 font-mono">({invoice.grnNo})</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">—</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-red-600">
                    {formatMoney(invoice.grandTotal)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-bold text-red-600">
                    {formatMoney(invoice.grandTotal)} Cr
                  </td>
                </tr>
                {invoice.amountPaid > 0 && (
                  <tr className="hover:bg-muted/20">
                    <td className="px-3 py-2.5 text-muted-foreground">{invoice.invoiceDate}</td>
                    <td className="px-3 py-2.5 font-mono text-muted-foreground">PYMT</td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      Payment received against {invoice.invoiceNo}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700 font-semibold">
                      {formatMoney(invoice.amountPaid)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">—</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-bold text-red-600">
                      {formatMoney(outstanding)} Cr
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Section>

        {/* COA Posting Impact */}
        <LedgerImpactPreview
          title="COA Posting Impact"
          lines={impactLines}
          className="border border-border rounded-xl shadow-sm"
        />

        {/* Remarks */}
        {invoice.remarks && (
          <Section title="Remarks">
            <p className="text-xs text-muted-foreground">{invoice.remarks}</p>
          </Section>
        )}

        {/* Activity log */}
        {invoice.activity && invoice.activity.length > 0 && (
          <Section title="Activity">
            <div className="space-y-2">
              {invoice.activity.map((a, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-brand-500 flex-shrink-0" />
                  <div>
                    <span className="font-medium">{a.action}</span>
                    <span className="text-muted-foreground ml-2">
                      {a.date} · {a.by}
                    </span>
                    {a.remarks && (
                      <span className="text-muted-foreground ml-2">— {a.remarks}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </AccountsPageShell>
  );
}

function AmountRow({
  label,
  value,
  muted,
  bold,
  highlight,
}: {
  label: string;
  value: string;
  muted?: boolean;
  bold?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between ${muted ? "text-muted-foreground" : ""} ${bold ? "font-bold text-sm" : ""} ${highlight ? "text-red-600" : ""}`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
