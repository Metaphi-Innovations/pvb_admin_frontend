"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { LedgerImpactPreview } from "@/components/accounts/LedgerImpactPreview";
import { purchaseInvoiceImpactResolved } from "@/lib/accounts/resolved-impact-previews";
import { formatMoney } from "@/lib/accounts/money-format";
import {
  createManualPurchaseEntry,
  updateManualPurchaseEntry,
  getPurchaseInvoiceById,
  getVendorsForPurchaseDropdown,
  loadPurchaseInvoices,
  savePurchaseInvoices,
  type PurchaseInvoiceLine,
} from "@/app/(app)/accounts/purchase-invoices/purchase-invoices-data";
import { maybePostPurchaseInvoice } from "@/lib/accounts/document-posting-bridge";
import { loadAccountItems } from "@/lib/accounts/account-items-data";

interface LineItem {
  id: string;
  productName: string;
  qty: number;
  rate: number;
  gstPct: number;
  taxableAmt: number;
  gstAmt: number;
  total: number;
}

function emptyLine(): LineItem {
  return {
    id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    productName: "",
    qty: 1,
    rate: 0,
    gstPct: 18,
    taxableAmt: 0,
    gstAmt: 0,
    total: 0,
  };
}

function recalcLine(l: LineItem): LineItem {
  const taxableAmt = l.qty * l.rate;
  const gstAmt = Math.round(taxableAmt * l.gstPct) / 100;
  return { ...l, taxableAmt, gstAmt, total: taxableAmt + gstAmt };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-border/60 p-4 space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      {children}
    </div>
  );
}

export default function PurchaseInvoiceFormClient({ invoiceId }: { invoiceId?: number }) {
  const router = useRouter();
  const isEdit = invoiceId != null;
  const vendors = useMemo(() => getVendorsForPurchaseDropdown(), []);
  const products = useMemo(() => loadAccountItems(), []);
  const existing = useMemo(
    () => (invoiceId ? getPurchaseInvoiceById(invoiceId) : null),
    [invoiceId],
  );

  const [vendorId, setVendorId] = useState(existing?.vendorId?.toString() ?? "");
  const [invoiceDate, setInvoiceDate] = useState(existing?.invoiceDate ?? new Date().toISOString().slice(0, 10));
  const [vendorInvoiceNo, setVendorInvoiceNo] = useState(existing?.vendorInvoiceNo ?? "");
  const [remarks, setRemarks] = useState(existing?.remarks ?? "");
  const [lines, setLines] = useState<LineItem[]>(() => {
    if (existing?.lineItems?.length) {
      return existing.lineItems.map((l) =>
        recalcLine({
          id: l.id,
          productName: l.productName,
          qty: l.invoiceQty,
          rate: l.unitPrice,
          gstPct: l.taxPct,
          taxableAmt: 0,
          gstAmt: 0,
          total: 0,
        }),
      );
    }
    return [recalcLine(emptyLine())];
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const vendor = vendors.find((v) => v.id === Number(vendorId));
  const subtotal = lines.reduce((s, l) => s + l.taxableAmt, 0);
  const totalGst = lines.reduce((s, l) => s + l.gstAmt, 0);
  const grandTotal = subtotal + totalGst;

  const impactLines = purchaseInvoiceImpactResolved({
    vendorName: vendor?.vendorName ?? "Supplier",
    taxable: subtotal,
    taxAmount: totalGst,
    grandTotal,
  });

  const updateLine = (idx: number, patch: Partial<LineItem>) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? recalcLine({ ...l, ...patch }) : l)));
  };
  const addLine = () => setLines((prev) => [...prev, recalcLine(emptyLine())]);
  const removeLine = (idx: number) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const buildLineItems = (): PurchaseInvoiceLine[] =>
    lines.map((l) => ({
      id: l.id,
      productId: products.find((p) => p.itemName === l.productName)?.id ?? 0,
      productName: l.productName,
      description: "",
      invoiceQty: l.qty,
      unit: "PCS",
      unitPrice: l.rate,
      taxPct: l.gstPct,
      lineAmount: l.taxableAmt,
      taxAmount: l.gstAmt,
      debitedQty: 0,
      debitedAmount: 0,
    }));

  const doSave = (post: boolean) => {
    setError("");
    if (!vendorId) return setError("Select a vendor.");
    if (!vendorInvoiceNo.trim()) return setError("Enter supplier invoice number.");
    if (lines.some((l) => !l.productName)) return setError("All lines need a product name.");
    if (grandTotal <= 0) return setError("Total must be greater than zero.");
    setSaving(true);
    try {
      if (isEdit && existing) {
        const updated = updateManualPurchaseEntry(invoiceId!, {
          vendorId: Number(vendorId),
          vendorInvoiceNo,
          invoiceDate,
          invoiceAmount: subtotal,
          taxAmount: totalGst,
          totalAmount: grandTotal,
          remarks,
          attachment: null,
          lineItems: buildLineItems(),
        });
        if (post) maybePostPurchaseInvoice(updated);
      } else {
        const created = createManualPurchaseEntry({
          vendorId: Number(vendorId),
          vendorInvoiceNo,
          invoiceDate,
          invoiceAmount: subtotal,
          taxAmount: totalGst,
          totalAmount: grandTotal,
          remarks,
          attachment: null,
          lineItems: buildLineItems(),
        });
        if (post) maybePostPurchaseInvoice(created);
      }
      router.push("/accounts/transactions/purchase");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Transactions", isEdit ? "Edit Purchase Invoice" : "New Purchase Invoice")}
      title={isEdit ? `Edit ${existing?.invoiceNo ?? ""}` : "New Purchase Invoice"}
      description="Create a purchase bill with vendor details, line items, GST and ledger impact preview."
    >
      <div className="space-y-4 max-w-4xl">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 font-medium">{error}</div>
        )}

        <Section title="Supplier Info">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Supplier *</Label>
              <select
                className="mt-1 h-8 w-full rounded-md border border-border bg-white px-2.5 text-xs"
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
              >
                <option value="">Select supplier...</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.vendorName}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">GSTIN</Label>
              <Input className="h-8 text-xs mt-1 bg-muted/25" readOnly value={vendor?.gstNumber ?? "—"} />
            </div>
            <div>
              <Label className="text-xs">State</Label>
              <Input className="h-8 text-xs mt-1 bg-muted/25" readOnly value={vendor?.billingAddress?.state ?? "—"} />
            </div>
          </div>
        </Section>

        <Section title="Invoice Info">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Invoice Date *</Label>
              <Input type="date" className="h-8 text-xs mt-1" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Supplier Invoice No *</Label>
              <Input className="h-8 text-xs mt-1" value={vendorInvoiceNo} onChange={(e) => setVendorInvoiceNo(e.target.value)} placeholder="e.g. GF-4521" />
            </div>
          </div>
        </Section>

        <Section title="Line Items">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/60">
                <th className="text-left py-2 text-[10px] font-semibold uppercase text-muted-foreground">Product</th>
                <th className="text-right py-2 text-[10px] font-semibold uppercase text-muted-foreground w-20">Qty</th>
                <th className="text-right py-2 text-[10px] font-semibold uppercase text-muted-foreground w-24">Rate</th>
                <th className="text-right py-2 text-[10px] font-semibold uppercase text-muted-foreground w-20">GST %</th>
                <th className="text-right py-2 text-[10px] font-semibold uppercase text-muted-foreground w-24">Taxable</th>
                <th className="text-right py-2 text-[10px] font-semibold uppercase text-muted-foreground w-20">GST</th>
                <th className="text-right py-2 text-[10px] font-semibold uppercase text-muted-foreground w-24">Total</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => (
                <tr key={line.id} className="border-b border-border/30">
                  <td className="py-1.5 pr-2">
                    <select
                      className="h-8 w-full rounded-md border border-border bg-white px-2 text-xs"
                      value={line.productName}
                      onChange={(e) => {
                        const prod = products.find((p) => p.itemName === e.target.value);
                        updateLine(idx, {
                          productName: e.target.value,
                          rate: prod?.openingRate ?? line.rate,
                          gstPct: prod ? parseFloat(prod.gstRate) || 18 : line.gstPct,
                        });
                      }}
                    >
                      <option value="">Select...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.itemName}>{p.itemName}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1.5"><Input type="number" className="h-8 text-xs text-right" value={line.qty} onChange={(e) => updateLine(idx, { qty: Number(e.target.value) || 0 })} /></td>
                  <td className="py-1.5"><Input type="number" className="h-8 text-xs text-right" value={line.rate} onChange={(e) => updateLine(idx, { rate: Number(e.target.value) || 0 })} /></td>
                  <td className="py-1.5"><Input type="number" className="h-8 text-xs text-right" value={line.gstPct} onChange={(e) => updateLine(idx, { gstPct: Number(e.target.value) || 0 })} /></td>
                  <td className="py-1.5 text-right tabular-nums">{formatMoney(line.taxableAmt)}</td>
                  <td className="py-1.5 text-right tabular-nums">{formatMoney(line.gstAmt)}</td>
                  <td className="py-1.5 text-right tabular-nums font-semibold">{formatMoney(line.total)}</td>
                  <td className="py-1.5">
                    {lines.length > 1 && (
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600" onClick={() => removeLine(idx)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1 mt-2" onClick={addLine}>
            <Plus className="w-3.5 h-3.5" /> Add Line
          </Button>
        </Section>

        <Section title="Totals">
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <p className="text-muted-foreground">Taxable Amount</p>
              <p className="text-sm font-semibold tabular-nums mt-0.5">{formatMoney(subtotal)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">GST Amount</p>
              <p className="text-sm font-semibold tabular-nums mt-0.5">{formatMoney(totalGst)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Grand Total</p>
              <p className="text-lg font-bold tabular-nums text-brand-700 mt-0.5">{formatMoney(grandTotal)}</p>
            </div>
          </div>
        </Section>

        <Section title="Remarks">
          <Textarea className="text-xs min-h-[60px]" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional remarks..." />
        </Section>

        <LedgerImpactPreview title="Ledger Impact Preview" lines={impactLines} className="border border-border/60 rounded-lg" />

        <div className="flex items-center gap-3 pt-2 pb-6">
          <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => router.push("/accounts/transactions/purchase")}>
            Cancel
          </Button>
          <Button variant="outline" size="sm" className="h-9 text-xs" disabled={saving} onClick={() => doSave(false)}>
            Save Draft
          </Button>
          <Button size="sm" className="h-9 text-xs bg-brand-600 text-white" disabled={saving} onClick={() => doSave(true)}>
            Post Invoice
          </Button>
        </div>
      </div>
    </AccountsPageShell>
  );
}
