"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Truck,
  FileText,
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
  getPurchaseInvoiceById,
  getGrnsPendingInvoice,
  createPurchaseFromGrn,
  createManualPurchaseEntry,
  updateManualPurchaseEntry,
  type PurchaseInvoiceLine,
} from "./purchase-invoices-data";
import { maybePostPurchaseInvoice } from "@/lib/accounts/document-posting-bridge";
import type { GrnRecord } from "@/app/(app)/warehouse/grnqc/grn/types";
import { VendorMasterPanel } from "@/components/accounts/master-fetch/VendorMasterPanel";
import { TransactionProductSelect } from "@/components/accounts/master-fetch/TransactionProductSelect";
import { MasterFetchedBadge } from "@/components/accounts/master-fetch/MasterFetchedBadge";
import {
  findProductByName,
  getProductsForPurchaseTransaction,
  vendorMasterToTransactionFields,
  type VendorTransactionFields,
  type TransactionProductOption,
} from "@/lib/accounts/transaction-master-fetch";

// ─── Types ───────────────────────────────────────────────────────────────────

type Mode = "grn" | "manual";

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

// ─── Mode Selector ────────────────────────────────────────────────────────────

function ModeSelector({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {(["grn", "manual"] as Mode[]).map((m) => {
        const active = mode === m;
        return (
          <button
            key={m}
            onClick={() => onChange(m)}
            className={`flex items-start gap-3 rounded-lg border-2 p-4 text-left transition-all ${
              active
                ? "border-brand-600 bg-brand-50"
                : "border-border bg-white hover:border-border/80 hover:bg-muted/20"
            }`}
          >
            <div
              className={`mt-0.5 rounded-full p-1.5 ${active ? "bg-brand-600 text-white" : "bg-muted/60 text-muted-foreground"}`}
            >
              {m === "grn" ? <Truck className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            </div>
            <div>
              <p className={`text-sm font-semibold ${active ? "text-brand-700" : "text-foreground"}`}>
                {m === "grn" ? "Create From GRN" : "Manual Entry"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {m === "grn"
                  ? "Auto-populate from received GRN. Preferred method."
                  : "Enter supplier invoice details manually without a GRN."}
              </p>
            </div>
            {m === "grn" && (
              <Badge className="ml-auto text-[10px] h-5 bg-brand-100 text-brand-700 border-brand-200">
                Recommended
              </Badge>
            )}
          </button>
        );
      })}
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
        <p className="text-xs text-muted-foreground mt-1">All received GRNs already have invoices. Use manual entry.</p>
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
              <Truck className="w-3.5 h-3.5" />
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

  const defaultMode: Mode =
    (searchParams.get("mode") as Mode) === "manual" ? "manual" : "grn";
  const preselectedGrnId = searchParams.get("grnId");

  const [mode, setMode] = useState<Mode>(isEdit ? "manual" : defaultMode);
  const [selectedGrn, setSelectedGrn] = useState<GrnRecord | null>(null);
  const [showGrnSelector, setShowGrnSelector] = useState(true);

  const vendors = useMemo(() => getVendorsForPurchaseDropdown(), []);
  const pendingGrns = useMemo(() => getGrnsPendingInvoice(), []);
  const existing = useMemo(
    () => (invoiceId ? getPurchaseInvoiceById(invoiceId) : null),
    [invoiceId],
  );

  // Vendor fields
  const [vendorId, setVendorId] = useState(existing?.vendorId?.toString() ?? "");
  const [vendorFields, setVendorFields] = useState<VendorTransactionFields | null>(null);
  const [billToId, setBillToId] = useState("");
  const [shipToId, setShipToId] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    existing?.invoiceDate ?? new Date().toISOString().slice(0, 10),
  );
  const [vendorInvoiceNo, setVendorInvoiceNo] = useState(existing?.vendorInvoiceNo ?? "");
  const [dueDate, setDueDate] = useState("");
  const [remarks, setRemarks] = useState(existing?.remarks ?? "");

  // Line items
  const [lines, setLines] = useState<LineItem[]>(() => {
    if (existing?.lineItems?.length) {
      return existing.lineItems.map((l) =>
        recalcLine({
          id: l.id,
          productId: l.productId,
          productName: l.productName,
          hsnCode: "",
          qty: l.invoiceQty,
          unit: l.unit,
          rate: l.unitPrice,
          discountPct: 0,
          gstPct: l.taxPct,
          taxableAmt: 0,
          gstAmt: 0,
          total: 0,
        }),
      );
    }
    return [recalcLine(emptyLine())];
  });

  const products = useMemo(
    () => getProductsForPurchaseTransaction(vendorId ? Number(vendorId) : undefined),
    [vendorId],
  );

  useEffect(() => {
    if (!existing?.vendorId) return;
    const v = vendors.find((x) => x.id === existing.vendorId);
    if (v) {
      const fields = vendorMasterToTransactionFields(v);
      setVendorFields(fields);
      setBillToId(fields.defaultBillToId);
      setShipToId(fields.defaultShipToId);
      setBillingAddress(fields.billingAddress);
      setShippingAddress(fields.shippingAddress);
    }
  }, [existing?.vendorId, vendors]);

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

  const doSave = (post: boolean) => {
    setError("");
    if (!vendorId) return setError("Select a vendor.");
    if (!vendorInvoiceNo.trim()) return setError("Enter supplier invoice number.");
    if (lines.some((l) => !l.productName.trim())) return setError("All line items need a product from master.");
    if (grandTotal <= 0) return setError("Total must be greater than zero.");

    setSaving(true);
    try {
      if (mode === "grn" && selectedGrn) {
        const created = createPurchaseFromGrn({
          grnId: selectedGrn.id,
          grnNo: selectedGrn.grnNo,
          vendorId: Number(vendorId),
          vendorInvoiceNo,
          invoiceDate,
          remarks,
          lineItems: lines.map(toPurchaseInvoiceLine),
        });
        if (!post) {
          // posting is auto; but navigate anyway
        }
        router.push(`/accounts/purchase-invoices/${created.id}`);
        return;
      }

      if (isEdit && existing) {
        const updated = updateManualPurchaseEntry(invoiceId!, {
          vendorId: Number(vendorId),
          vendorInvoiceNo,
          invoiceDate,
          invoiceAmount: subtotal,
          taxAmount: totalGst,
          totalAmount: finalTotal,
          remarks,
          attachment: null,
          lineItems: lines.map(toPurchaseInvoiceLine),
        });
        if (post) maybePostPurchaseInvoice(updated);
        router.push(`/accounts/purchase-invoices/${updated.id}`);
        return;
      }

      const created = createManualPurchaseEntry({
        vendorId: Number(vendorId),
        vendorInvoiceNo,
        invoiceDate,
        invoiceAmount: subtotal,
        taxAmount: totalGst,
        totalAmount: finalTotal,
        remarks,
        attachment: null,
        lineItems: lines.map(toPurchaseInvoiceLine),
      });
      if (post) maybePostPurchaseInvoice(created);
      router.push(`/accounts/purchase-invoices/${created.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const title = isEdit
    ? `Edit ${existing?.invoiceNo ?? ""}`
    : mode === "grn" && selectedGrn
      ? `Invoice from ${selectedGrn.grnNo}`
      : "New Purchase Invoice";

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb(
        "Purchase Invoices",
        isEdit ? "Edit Invoice" : "New Invoice",
      )}
      title={title}
      description={
        isEdit
          ? "Edit manual purchase entry."
          : "Create a purchase invoice from a GRN or enter manually."
      }
    >
      <div className="space-y-4 max-w-5xl pb-10">
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 font-medium">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Mode selector (new only) */}
        {!isEdit && (
          <Section title="Creation Method">
            <ModeSelector
              mode={mode}
              onChange={(m) => {
                setMode(m);
                setSelectedGrn(null);
                setShowGrnSelector(true);
                setLines([recalcLine(emptyLine())]);
                setVendorId("");
              }}
            />
          </Section>
        )}

        {/* GRN Selector */}
        {!isEdit && mode === "grn" && (
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
                  className="h-7 text-xs"
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
        )}

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
            disabled={mode === "grn" && !!selectedGrn}
          />
        </Section>

        {/* Invoice Info */}
        <Section title="Invoice Details">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Invoice Date *</Label>
              <Input
                type="date"
                className="h-8 text-xs mt-1"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Supplier Invoice No *</Label>
              <Input
                className="h-8 text-xs mt-1"
                value={vendorInvoiceNo}
                onChange={(e) => setVendorInvoiceNo(e.target.value)}
                placeholder="e.g. INV/AC/2026/001"
              />
            </div>
            <div>
              <Label className="text-xs">Due Date</Label>
              <Input
                type="date"
                className="h-8 text-xs mt-1"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          {mode === "grn" && selectedGrn && (
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
          <div className="flex items-center gap-2 mb-2">
            <MasterFetchedBadge />
            <span className="text-[11px] text-muted-foreground">
              Products from Product Master — HSN and GST auto-fill; edit qty, rate, and discount only.
            </span>
          </div>
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
                        className="h-7 text-xs font-mono bg-muted/25"
                        readOnly
                        value={line.hsnCode}
                        placeholder="HSN"
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <Input
                        type="number"
                        className="h-7 text-xs text-right"
                        value={line.qty}
                        onChange={(e) => updateLine(idx, { qty: Number(e.target.value) || 0 })}
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <Input
                        className="h-7 text-xs bg-muted/25"
                        readOnly
                        value={line.unit}
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <Input
                        type="number"
                        className="h-7 text-xs text-right"
                        value={line.rate}
                        onChange={(e) => updateLine(idx, { rate: Number(e.target.value) || 0 })}
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <Input
                        type="number"
                        className="h-7 text-xs text-right"
                        value={line.discountPct}
                        onChange={(e) => updateLine(idx, { discountPct: Number(e.target.value) || 0 })}
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <Input
                        type="number"
                        className="h-7 text-xs text-right bg-muted/25"
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
            className="h-7 text-xs gap-1 mt-2"
            onClick={addLine}
          >
            <Plus className="w-3.5 h-3.5" /> Add Line
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
          {mode !== "grn" && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs"
              disabled={saving}
              onClick={() => doSave(false)}
            >
              Save Draft
            </Button>
          )}
          <Button
            size="sm"
            className="h-9 text-xs bg-brand-600 text-white gap-1.5"
            disabled={saving}
            onClick={() => doSave(true)}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {mode === "grn" ? "Create & Post Invoice" : "Post Invoice"}
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

