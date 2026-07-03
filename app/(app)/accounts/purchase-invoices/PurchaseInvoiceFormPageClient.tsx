"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Truck,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Package,
  Building2,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { formatMoney } from "@/lib/accounts/money-format";
import { purchaseInvoiceImpactResolved } from "@/lib/accounts/resolved-impact-previews";
import { LedgerImpactPreview } from "@/components/accounts/LedgerImpactPreview";
import {
  getVendorsForPurchaseDropdown,
  getGrnsPendingInvoice,
  createPurchaseFromGrn,
  type PurchaseInvoiceLine,
} from "./purchase-invoices-data";
import type { GrnRecord } from "@/app/(app)/warehouse/grn/types";
import { VendorMasterPanel } from "@/components/accounts/master-fetch/VendorMasterPanel";
import { TransactionProductSelect } from "@/components/accounts/master-fetch/TransactionProductSelect";
import {
  findProductByName,
  getProductsForPurchaseTransaction,
  vendorMasterToTransactionFields,
  type VendorTransactionFields,
  type TransactionProductOption,
} from "@/lib/accounts/transaction-master-fetch";

interface LineItem {
  id: string;
  productId: number | null;
  productName: string;
  hsnCode: string;
  qty: number;
  unit: string;
  rate: number;
  discountPct: number;
  gstPct: number;
  taxableAmt: number;
  gstAmt: number;
  total: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function emptyLine(): LineItem {
  return {
    id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    productId: null,
    productName: "",
    hsnCode: "",
    qty: 1,
    unit: "BAG",
    rate: 0,
    discountPct: 0,
    gstPct: 18,
    taxableAmt: 0,
    gstAmt: 0,
    total: 0,
  };
}

function applyProductToLine(line: LineItem, product: TransactionProductOption): LineItem {
  return recalcLine({
    ...line,
    productId: product.id,
    productName: product.name,
    hsnCode: product.hsn,
    unit: product.unit,
    rate: product.unitPrice > 0 ? product.unitPrice : line.rate,
    gstPct: product.taxPct,
  });
}

function recalcLine(l: LineItem): LineItem {
  const gross = l.qty * l.rate;
  const disc = gross * l.discountPct / 100;
  const taxableAmt = Math.round((gross - disc) * 100) / 100;
  const gstAmt = Math.round(taxableAmt * l.gstPct) / 100;
  return { ...l, taxableAmt, gstAmt, total: taxableAmt + gstAmt };
}

function lineFromGrnItem(
  item: GrnRecord["items"][number],
  idx: number,
  vendorId?: number,
): LineItem {
  const matched = findProductByName(item.productName);
  const priced =
    matched && vendorId
      ? getProductsForPurchaseTransaction(vendorId).find((p) => p.id === matched.id) ?? matched
      : matched;
  const base = recalcLine({
    id: `grn-line-${idx}`,
    productId: priced?.id ?? null,
    productName: item.productName,
    hsnCode: priced?.hsn ?? "",
    qty: item.receivedQty,
    unit: item.unit ?? priced?.unit ?? "PCS",
    rate: priced?.unitPrice ?? 0,
    discountPct: 0,
    gstPct: priced?.taxPct ?? 18,
    taxableAmt: 0,
    gstAmt: 0,
    total: 0,
  });
  return base;
}

function toPurchaseInvoiceLine(l: LineItem): PurchaseInvoiceLine {
  return {
    id: l.id,
    productId: l.productId,
    productName: l.productName,
    description: l.hsnCode ? `HSN: ${l.hsnCode}` : "",
    invoiceQty: l.qty,
    unit: l.unit,
    unitPrice: l.rate,
    taxPct: l.gstPct,
    lineAmount: l.taxableAmt,
    taxAmount: l.gstAmt,
    debitedQty: 0,
    debitedAmount: 0,
  };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-border/60 p-4 space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      {children}
    </div>
  );
}

// ─── GRN Selector ────────────────────────────────────────────────────────────

function GrnSelector({
  grns,
  selectedId,
  onSelect,
}: {
  grns: GrnRecord[];
  selectedId: string | null;
  onSelect: (grn: GrnRecord) => void;
}) {
  if (grns.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
        <p className="text-sm font-medium">No pending GRNs</p>
        <p className="text-xs text-muted-foreground mt-1">
          All completed GRNs already have purchase invoices.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground mb-3">
        Select a received GRN to auto-populate the invoice:
      </p>
      {grns.map((grn) => {
        const active = selectedId === grn.id;
        return (
          <button
            key={grn.id}
            onClick={() => onSelect(grn)}
            className={`w-full flex items-start gap-3 rounded-lg border-2 p-3 text-left transition-all ${
              active
                ? "border-brand-600 bg-brand-50"
                : "border-border bg-white hover:border-muted-foreground/30"
            }`}
          >
            <div className={`mt-0.5 rounded p-1.5 ${active ? "bg-brand-600 text-white" : "bg-blue-100 text-blue-700"}`}>
              <Truck className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold font-mono text-blue-700">{grn.grnNo}</span>
                <Badge variant="outline" className="text-[10px] h-4 text-emerald-700 border-emerald-200">
                  QC Completed
                </Badge>
              </div>
              <p className="text-xs font-medium mt-0.5">{grn.vendorName}</p>
              <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{grn.grnDate}</span>
                <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{grn.warehouse}</span>
                <span className="flex items-center gap-1"><Package className="w-3 h-3" />{grn.totalQty} qty · {grn.totalProducts} items</span>
              </div>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {grn.items.map((item) => (
                  <span
                    key={item.productId}
                    className="inline-flex items-center rounded bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                  >
                    {item.productName} × {item.receivedQty} {item.unit}
                  </span>
                ))}
              </div>
            </div>
            {active && <CheckCircle2 className="w-4 h-4 text-brand-600 mt-1 flex-shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main Form Component ──────────────────────────────────────────────────────

export default function PurchaseInvoiceFormPageClient({ invoiceId }: { invoiceId?: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEdit = invoiceId != null;
  const preselectedGrnId = searchParams.get("grnId");

  const [selectedGrn, setSelectedGrn] = useState<GrnRecord | null>(null);
  const [showGrnSelector, setShowGrnSelector] = useState(true);

  const vendors = useMemo(() => getVendorsForPurchaseDropdown(), []);
  const pendingGrns = useMemo(() => getGrnsPendingInvoice(), []);

  useEffect(() => {
    if (isEdit && invoiceId) {
      router.replace(`/accounts/purchase-invoices/${invoiceId}`);
    }
  }, [isEdit, invoiceId, router]);

  useEffect(() => {
    if (searchParams.get("mode") === "manual") {
      const grnId = searchParams.get("grnId");
      router.replace(
        grnId
          ? `/accounts/purchase-invoices/new?mode=grn&grnId=${grnId}`
          : "/accounts/purchase-invoices/new?mode=grn",
      );
    }
  }, [router, searchParams]);

  // Vendor fields
  const [vendorId, setVendorId] = useState("");
  const [vendorFields, setVendorFields] = useState<VendorTransactionFields | null>(null);
  const [billToId, setBillToId] = useState("");
  const [shipToId, setShipToId] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [vendorInvoiceNo, setVendorInvoiceNo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [remarks, setRemarks] = useState("");

  const [lines, setLines] = useState<LineItem[]>(() => [recalcLine(emptyLine())]);

  const products = useMemo(
    () => getProductsForPurchaseTransaction(vendorId ? Number(vendorId) : undefined),
    [vendorId],
  );

  // Auto-select GRN from query param
  useEffect(() => {
    if (preselectedGrnId && pendingGrns.length > 0) {
      const grn = pendingGrns.find((g) => g.id === preselectedGrnId);
      if (grn) {
        handleGrnSelect(grn);
        setShowGrnSelector(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedGrnId, pendingGrns.length]);

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const onVendorMasterSelect = (id: string, fields: VendorTransactionFields | null) => {
    setVendorId(id);
    if (!fields) {
      setVendorFields(null);
      return;
    }
    setVendorFields(fields);
    setBillToId(fields.defaultBillToId);
    setShipToId(fields.defaultShipToId);
    setBillingAddress(fields.billingAddress);
    setShippingAddress(fields.shippingAddress);
    // Re-price lines when vendor changes (vendor product pricing)
    if (id) {
      const priced = getProductsForPurchaseTransaction(Number(id));
      setLines((prev) =>
        prev.map((line) => {
          if (!line.productId) return line;
          const p = priced.find((x) => x.id === line.productId);
          return p ? applyProductToLine(line, p) : line;
        }),
      );
    }
  };
  const subtotal = lines.reduce((s, l) => s + l.taxableAmt, 0);
  const totalGst = lines.reduce((s, l) => s + l.gstAmt, 0);
  const grandTotal = subtotal + totalGst;
  const roundOff = Math.round(grandTotal) - grandTotal;
  const finalTotal = Math.round(grandTotal);

  // Handlers
  const updateLine = (idx: number, patch: Partial<LineItem>) =>
    setLines((prev) => prev.map((l, i) => (i === idx ? recalcLine({ ...l, ...patch }) : l)));
  const addLine = () => setLines((prev) => [...prev, recalcLine(emptyLine())]);
  const removeLine = (idx: number) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  function handleGrnSelect(grn: GrnRecord) {
    setSelectedGrn(grn);
    const matchedVendor = vendors.find(
      (v) => v.vendorName.toLowerCase() === grn.vendorName.toLowerCase(),
    );
    if (matchedVendor) {
      onVendorMasterSelect(String(matchedVendor.id), vendorMasterToTransactionFields(matchedVendor));
    }
    setInvoiceDate(new Date().toISOString().slice(0, 10));
    const vid = matchedVendor?.id;
    setLines(grn.items.map((item, i) => lineFromGrnItem(item, i, vid)));
    setShowGrnSelector(false);
  }

  // Totals — computed above

  const doSave = () => {
    setError("");
    if (!selectedGrn) return setError("Select a completed GRN to create the purchase invoice.");
    if (!vendorId) return setError("Select a vendor.");
    if (!vendorInvoiceNo.trim()) return setError("Enter supplier invoice number.");
    if (lines.some((l) => !l.productName.trim())) return setError("All line items need a product from master.");
    if (grandTotal <= 0) return setError("Total must be greater than zero.");

    setSaving(true);
    try {
      const created = createPurchaseFromGrn({
        grnId: selectedGrn.id,
        grnNo: selectedGrn.grnNo,
        vendorId: Number(vendorId),
        vendorInvoiceNo,
        invoiceDate,
        remarks,
        lineItems: lines.map(toPurchaseInvoiceLine),
      });
      router.push(`/accounts/purchase-invoices/${created.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  if (isEdit) return null;

  const title = selectedGrn ? `Invoice from ${selectedGrn.grnNo}` : "New Purchase Invoice";

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Transactions", "New Purchase Invoice")}
      title={title}
      description="Create a purchase invoice from a completed GRN."
    >
      <div className="space-y-4 max-w-5xl pb-10">
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <Section title={selectedGrn ? "Selected GRN" : "Select GRN"}>
            {selectedGrn && !showGrnSelector ? (
              <div className="flex items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 p-3">
                <div className="rounded p-1.5 bg-brand-600 text-white">
                  <Truck className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold font-mono text-blue-700 text-sm">{selectedGrn.grnNo}</span>
                    <Badge className="text-[10px] h-4 bg-emerald-100 text-emerald-700 border-emerald-200">
                      QC Completed
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedGrn.vendorName} · {selectedGrn.warehouse} · {selectedGrn.grnDate}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-[13px] font-medium"
                  onClick={() => {
                    setSelectedGrn(null);
                    setShowGrnSelector(true);
                    setLines([recalcLine(emptyLine())]);
                  }}
                >
                  Change GRN
                </Button>
              </div>
            ) : (
              <GrnSelector
                grns={pendingGrns}
                selectedId={selectedGrn?.id ?? null}
                onSelect={handleGrnSelect}
              />
            )}
        </Section>

        {/* Supplier Info */}
        <Section title="Supplier Info">
          <VendorMasterPanel
            vendors={vendors}
            vendorId={vendorId}
            onVendorIdChange={onVendorMasterSelect}
            fields={vendorFields}
            billToId={billToId}
            shipToId={shipToId}
            onBillToChange={(id, addr) => {
              setBillToId(id);
              setBillingAddress(addr);
            }}
            onShipToChange={(id, addr) => {
              setShipToId(id);
              setShippingAddress(addr);
            }}
            billingAddress={billingAddress}
            shippingAddress={shippingAddress}
            disabled={!!selectedGrn}
          />
        </Section>

        {/* Invoice Info */}
        <Section title="Invoice Details">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Invoice Date *</Label>
              <Input
                type="date"
                className="h-9 text-[13px] font-medium mt-1"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Supplier Invoice No *</Label>
              <Input
                className="h-9 text-[13px] font-medium mt-1"
                value={vendorInvoiceNo}
                onChange={(e) => setVendorInvoiceNo(e.target.value)}
                placeholder="e.g. INV/AC/2026/001"
              />
            </div>
            <div>
              <Label className="text-xs">Due Date</Label>
              <Input
                type="date"
                className="h-9 text-[13px] font-medium mt-1"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          {selectedGrn && (
            <div className="flex items-center gap-4 rounded-md bg-muted/30 border border-border/40 px-3 py-2 text-xs text-muted-foreground">
              <span>
                <span className="font-medium text-foreground">GRN: </span>
                <span className="font-mono text-blue-700">{selectedGrn.grnNo}</span>
              </span>
              {selectedGrn.poNumber && (
                <span>
                  <span className="font-medium text-foreground">PO: </span>
                  <span className="font-mono">{selectedGrn.poNumber}</span>
                </span>
              )}
              <span>
                <span className="font-medium text-foreground">Warehouse: </span>
                {selectedGrn.warehouse}
              </span>
            </div>
          )}
        </Section>

        {/* Line Items */}
        <Section title="Item Details">
          <p className="text-[11px] text-muted-foreground mb-2">
            Products from Product Master — HSN and GST auto-fill; edit qty, rate, and discount only.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[800px]">
              <thead>
                <tr className="border-b border-border/60">
                  <Th w="w-48">Item / Product</Th>
                  <Th w="w-20">HSN</Th>
                  <Th w="w-16 text-right">Qty</Th>
                  <Th w="w-16">Unit</Th>
                  <Th w="w-24 text-right">Rate (₹)</Th>
                  <Th w="w-16 text-right">Disc %</Th>
                  <Th w="w-16 text-right">GST %</Th>
                  <Th w="w-24 text-right">Taxable</Th>
                  <Th w="w-20 text-right">GST Amt</Th>
                  <Th w="w-24 text-right">Total</Th>
                  <Th w="w-10" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => (
                  <tr key={line.id} className="border-b border-border/20 hover:bg-muted/10">
                    <td className="py-1.5 pr-2">
                      <TransactionProductSelect
                        products={products}
                        value={line.productId}
                        onSelect={(p) =>
                          setLines((prev) =>
                            prev.map((l, i) => (i === idx ? applyProductToLine(l, p) : l)),
                          )
                        }
                        disabled={!vendorId}
                        placeholder={vendorId ? "Select product…" : "Select supplier first"}
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <Input
                        className="h-9 text-[13px] font-medium font-mono bg-muted/25"
                        readOnly
                        value={line.hsnCode}
                        placeholder="HSN"
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <Input
                        type="number"
                        className="h-9 text-[13px] font-medium text-right"
                        value={line.qty}
                        onChange={(e) => updateLine(idx, { qty: Number(e.target.value) || 0 })}
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <Input
                        className="h-9 text-[13px] font-medium bg-muted/25"
                        readOnly
                        value={line.unit}
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <AccountsMoneyInput
                        className="h-9 text-[13px] font-medium text-right"
                        value={line.rate}
                        onChange={(v) => updateLine(idx, { rate: v })}
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <Input
                        type="number"
                        className="h-9 text-[13px] font-medium text-right"
                        value={line.discountPct}
                        onChange={(e) => updateLine(idx, { discountPct: Number(e.target.value) || 0 })}
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <Input
                        type="number"
                        className="h-9 text-[13px] font-medium text-right bg-muted/25"
                        readOnly
                        value={line.gstPct}
                      />
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{formatMoney(line.taxableAmt)}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums text-amber-700">{formatMoney(line.gstAmt)}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums font-semibold">{formatMoney(line.total)}</td>
                    <td className="py-1.5">
                      {lines.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-red-600"
                          onClick={() => removeLine(idx)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-[13px] font-medium gap-1 mt-2"
            onClick={addLine}
          >
            <Plus className="w-4 h-4" /> Add Line
          </Button>
        </Section>

        {/* Totals */}
        <Section title="Invoice Summary">
          <div className="flex justify-end">
            <div className="w-72 space-y-1.5 text-xs">
              <SummaryRow label="Subtotal (Taxable)" value={formatMoney(subtotal)} />
              <SummaryRow
                label="CGST"
                value={formatMoney(Math.round(totalGst / 2))}
                muted
              />
              <SummaryRow
                label="SGST"
                value={formatMoney(totalGst - Math.round(totalGst / 2))}
                muted
              />
              {Math.abs(roundOff) > 0.001 && (
                <SummaryRow label="Round Off" value={formatMoney(roundOff)} muted />
              )}
              <div className="border-t border-border/60 pt-2 mt-1">
                <SummaryRow label="Grand Total" value={formatMoney(finalTotal)} bold />
              </div>
            </div>
          </div>
        </Section>

        {/* Remarks */}
        <Section title="Remarks">
          <Textarea
            className="text-xs min-h-[60px]"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Internal notes, reference, etc."
          />
        </Section>

        {/* Accounting Preview */}
        <LedgerImpactPreview
          title="Accounting Impact Preview"
          lines={purchaseInvoiceImpactResolved({
            vendorName: vendorFields?.vendorName ?? "Supplier",
            taxable: subtotal,
            taxAmount: totalGst,
            grandTotal: finalTotal,
          })}
        />

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs"
            onClick={() => router.push("/accounts/purchase-invoices")}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-9 text-xs bg-brand-600 text-white gap-1.5"
            onClick={doSave}
            disabled={saving || !selectedGrn}
          >
            <CheckCircle2 className="w-4 h-4" />
            Create & Post Invoice
          </Button>
        </div>
      </div>
    </AccountsPageShell>
  );
}

// ── Tiny helpers ──────────────────────────────────────────────────────────────

function Th({ children, w = "" }: { children?: React.ReactNode; w?: string }) {
  return (
    <th
      className={`pb-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground ${w}`}
    >
      {children}
    </th>
  );
}

function SummaryRow({
  label,
  value,
  muted,
  bold,
}: {
  label: string;
  value: string;
  muted?: boolean;
  bold?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between ${muted ? "text-muted-foreground" : ""} ${bold ? "font-bold text-sm" : ""}`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

