"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { LedgerImpactPreview } from "@/components/accounts/LedgerImpactPreview";
import { purchaseInvoiceImpactResolved } from "@/lib/accounts/resolved-impact-previews";
import { formatMoney } from "@/lib/accounts/money-format";
import { splitInvoiceGst } from "@/lib/accounts/invoice-gst-breakup";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { VendorMasterPanel } from "@/components/accounts/master-fetch/VendorMasterPanel";
import { TransactionProductSelect } from "@/components/accounts/master-fetch/TransactionProductSelect";
import {
  vendorMasterToTransactionFields,
  getProductsForPurchaseTransaction,
  type VendorTransactionFields,
} from "@/lib/accounts/transaction-master-fetch";
import {
  InvoiceFormCard,
  InvoiceFormField,
  InvoiceFormInput,
  InvoiceFormItemTable,
  InvoiceFormItemTableHead,
  InvoiceFormLayout,
  InvoiceFormReadOnly,
  InvoiceFormSection,
  InvoiceFormTextarea,
  INVOICE_FORM_GRID_CLASS,
  INVOICE_FORM_INPUT_CLASS,
  INVOICE_FORM_TABLE_TD_CLASS,
} from "@/app/(app)/accounts/components/InvoiceFormLayout";
import {
  createManualPurchaseEntry,
  updateManualPurchaseEntry,
  getPurchaseInvoiceById,
  getVendorsForPurchaseDropdown,
  type PurchaseInvoiceLine,
} from "@/app/(app)/accounts/purchase-invoices/purchase-invoices-data";
import { maybePostPurchaseInvoice } from "@/lib/accounts/document-posting-bridge";
import { loadAccountItems } from "@/lib/accounts/account-items-data";

const PURCHASE_LIST_PATH = "/accounts/transactions/purchase";

interface LineItem {
  id: string;
  productId: number | null;
  productName: string;
  hsnCode: string;
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
    productId: null,
    productName: "",
    hsnCode: "",
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
  const [vendorFields, setVendorFields] = useState<VendorTransactionFields | null>(() => {
    if (!existing?.vendorId) return null;
    const v = vendors.find((x) => x.id === existing.vendorId);
    return v ? vendorMasterToTransactionFields(v) : null;
  });
  const [billToId, setBillToId] = useState("");
  const [shipToId, setShipToId] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(existing?.invoiceDate ?? new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [vendorInvoiceNo, setVendorInvoiceNo] = useState(existing?.vendorInvoiceNo ?? "");
  const [purchaseperson, setPurchaseperson] = useState("Admin");
  const [remarks, setRemarks] = useState(existing?.remarks ?? "");
  const [lines, setLines] = useState<LineItem[]>(() => {
    if (existing?.lineItems?.length) {
      return existing.lineItems.map((l) =>
        recalcLine({
          id: l.id,
          productId: l.productId,
          productName: l.productName,
          hsnCode: l.description?.replace(/^HSN:\s*/, "") ?? "",
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

  useEffect(() => {
    const d = new Date(invoiceDate);
    d.setDate(d.getDate() + (vendorFields?.creditDays ?? 30));
    setDueDate(d.toISOString().slice(0, 10));
  }, [invoiceDate, vendorFields?.creditDays]);

  const purchaseProducts = useMemo(
    () => getProductsForPurchaseTransaction(vendorId ? Number(vendorId) : undefined),
    [vendorId],
  );

  const subtotal = lines.reduce((s, l) => s + l.taxableAmt, 0);
  const totalGst = lines.reduce((s, l) => s + l.gstAmt, 0);
  const grandTotal = subtotal + totalGst;
  const gstSplit = splitInvoiceGst(totalGst, false);

  const impactLines = purchaseInvoiceImpactResolved({
    vendorName: vendorFields?.vendorName ?? "Supplier",
    taxable: subtotal,
    taxAmount: totalGst,
    grandTotal,
  });

  const onVendorSelect = (id: string, fields: VendorTransactionFields | null) => {
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
  };

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
      productId: l.productId ?? products.find((p) => p.itemName === l.productName)?.id ?? 0,
      productName: l.productName,
      description: l.hsnCode ? `HSN: ${l.hsnCode}` : "",
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
      router.push(PURCHASE_LIST_PATH);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const itemColumns = [
    { key: "product", label: "Product", align: "left" as const },
    { key: "hsn", label: "HSN", align: "left" as const },
    { key: "qty", label: "Qty", align: "right" as const },
    { key: "rate", label: "Rate", align: "right" as const },
    { key: "taxable", label: "Taxable", align: "right" as const },
    { key: "cgst", label: "Input CGST", align: "right" as const },
    { key: "sgst", label: "Input SGST", align: "right" as const },
    { key: "igst", label: "Input IGST", align: "right" as const },
    { key: "total", label: "Total", align: "right" as const },
    { key: "action", label: "", align: "right" as const },
  ];

  return (
    <InvoiceFormLayout
      title={isEdit ? `Edit ${existing?.invoiceNo ?? "Purchase Invoice"}` : "New Purchase Invoice"}
      subtitle="Create a purchase bill with vendor details, line items, GST and ledger impact preview."
      breadcrumb={accountsBreadcrumb(
        "Transactions",
        isEdit ? "Edit Purchase Invoice" : "New Purchase Invoice",
        PURCHASE_LIST_PATH,
      )}
      backHref={PURCHASE_LIST_PATH}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className={INVOICE_FORM_INPUT_CLASS}
            onClick={() => router.push(PURCHASE_LIST_PATH)}
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={INVOICE_FORM_INPUT_CLASS}
            disabled={saving}
            onClick={() => doSave(false)}
          >
            Save Draft
          </Button>
          <Button
            size="sm"
            className={cn(INVOICE_FORM_INPUT_CLASS, "bg-brand-600 hover:bg-brand-700 text-white border-0")}
            disabled={saving}
            onClick={() => doSave(true)}
          >
            Post Invoice
          </Button>
        </div>
      }
    >
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
        <InvoiceFormCard title="Vendor Information">
          <VendorMasterPanel
            vendors={vendors}
            vendorId={vendorId}
            onVendorIdChange={onVendorSelect}
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
            title="Vendor"
          />
        </InvoiceFormCard>

        <InvoiceFormCard title="Invoice Information">
          <div className={INVOICE_FORM_GRID_CLASS}>
            <InvoiceFormField label="Purchase Invoice No.">
              <InvoiceFormInput
                disabled
                className="bg-slate-50 text-slate-700"
                value={isEdit ? existing?.invoiceNo ?? "" : "Auto-generated"}
              />
            </InvoiceFormField>
            <InvoiceFormField label="Vendor Invoice No." required>
              <InvoiceFormInput
                value={vendorInvoiceNo}
                onChange={(e) => setVendorInvoiceNo(e.target.value)}
                placeholder="e.g. GF-4521"
              />
            </InvoiceFormField>
            <InvoiceFormField label="Invoice Date" required>
              <InvoiceFormInput
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </InvoiceFormField>
            <InvoiceFormField label="Due Date">
              <InvoiceFormInput type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </InvoiceFormField>
            <InvoiceFormReadOnly label="GRN No." value={existing?.grnNo} mono />
            <InvoiceFormReadOnly label="Branch" value="Head Office" />
            <InvoiceFormReadOnly label="Warehouse" value="Central Warehouse" />
            <InvoiceFormReadOnly
              label="Place of Supply"
              value={vendorFields?.billingAddress?.split("\n").pop()?.trim() ?? "—"}
            />
            <InvoiceFormReadOnly
              label="GST Treatment"
              value={vendorFields?.vendorGst ? "Registered — CGST + SGST" : "Unregistered"}
            />
            <InvoiceFormField label="Purchaseperson / Created By" className="sm:col-span-2 lg:col-span-3">
              <InvoiceFormInput
                value={purchaseperson}
                onChange={(e) => setPurchaseperson(e.target.value)}
                placeholder="Name"
              />
            </InvoiceFormField>
          </div>
        </InvoiceFormCard>
      </div>

      <InvoiceFormSection
        title="Product / Item Details"
        action={
          <Button
            variant="outline"
            size="sm"
            className={cn(INVOICE_FORM_INPUT_CLASS, "gap-1.5")}
            onClick={addLine}
          >
            <Plus className="w-4 h-4" /> Add Line
          </Button>
        }
      >
        <InvoiceFormItemTable minWidth={960}>
          <InvoiceFormItemTableHead columns={itemColumns} />
          <tbody>
            {lines.map((line, idx) => {
              const lineGst = splitInvoiceGst(line.gstAmt, false);
              return (
                <tr key={line.id} className="border-b border-slate-100 last:border-b-0">
                  <td className={cn(INVOICE_FORM_TABLE_TD_CLASS, "min-w-[200px]")}>
                    <TransactionProductSelect
                      products={purchaseProducts}
                      value={line.productId}
                      onSelect={(p) => {
                        setLines((prev) =>
                          prev.map((l, i) =>
                            i === idx
                              ? recalcLine({
                                  ...l,
                                  productId: p.id,
                                  productName: p.name,
                                  hsnCode: p.hsn,
                                  rate: p.unitPrice > 0 ? p.unitPrice : l.rate,
                                  gstPct: p.taxPct,
                                })
                              : l,
                          ),
                        );
                      }}
                      disabled={!vendorId}
                      placeholder={vendorId ? "Select product…" : "Select vendor first"}
                    />
                  </td>
                  <td className={INVOICE_FORM_TABLE_TD_CLASS}>
                    <InvoiceFormInput
                      readOnly
                      className="bg-slate-50 font-mono text-sm"
                      value={line.hsnCode}
                      placeholder="HSN"
                    />
                  </td>
                  <td className={INVOICE_FORM_TABLE_TD_CLASS}>
                    <InvoiceFormInput
                      type="number"
                      className="text-right tabular-nums"
                      value={line.qty}
                      onChange={(e) => updateLine(idx, { qty: Number(e.target.value) || 0 })}
                    />
                  </td>
                  <td className={INVOICE_FORM_TABLE_TD_CLASS}>
                    <AccountsMoneyInput
                      className={cn(INVOICE_FORM_INPUT_CLASS, "text-right tabular-nums")}
                      value={line.rate}
                      onChange={(v) => updateLine(idx, { rate: v })}
                    />
                  </td>
                  <td className={cn(INVOICE_FORM_TABLE_TD_CLASS, "text-right tabular-nums")}>
                    {formatMoney(line.taxableAmt)}
                  </td>
                  <td className={cn(INVOICE_FORM_TABLE_TD_CLASS, "text-right tabular-nums text-slate-600")}>
                    {formatMoney(lineGst.cgst)}
                  </td>
                  <td className={cn(INVOICE_FORM_TABLE_TD_CLASS, "text-right tabular-nums text-slate-600")}>
                    {formatMoney(lineGst.sgst)}
                  </td>
                  <td className={cn(INVOICE_FORM_TABLE_TD_CLASS, "text-right tabular-nums text-slate-600")}>
                    {formatMoney(lineGst.igst)}
                  </td>
                  <td className={cn(INVOICE_FORM_TABLE_TD_CLASS, "text-right tabular-nums font-medium")}>
                    {formatMoney(line.total)}
                  </td>
                  <td className={INVOICE_FORM_TABLE_TD_CLASS}>
                    {lines.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-slate-500 hover:text-red-600"
                        onClick={() => removeLine(idx)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </InvoiceFormItemTable>
      </InvoiceFormSection>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4 items-start">
        <InvoiceFormSection title="Remarks">
          <InvoiceFormTextarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Optional remarks…"
          />
        </InvoiceFormSection>

        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2">
          <h2 className="text-[15px] font-semibold text-slate-900">Invoice Summary</h2>
          <div className="space-y-1.5 text-sm text-slate-700">
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Taxable Amount</span>
              <span className="tabular-nums font-medium">{formatMoney(subtotal)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Input CGST</span>
              <span className="tabular-nums">{formatMoney(gstSplit.cgst)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Input SGST</span>
              <span className="tabular-nums">{formatMoney(gstSplit.sgst)}</span>
            </div>
            <div className="flex justify-between gap-4 border-t border-slate-200 pt-2 mt-2">
              <span className="font-semibold text-slate-900">Grand Total</span>
              <span className="tabular-nums font-bold text-brand-700">{formatMoney(grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      <LedgerImpactPreview
        title="Ledger Impact Preview"
        lines={impactLines}
        className="border border-slate-200 rounded-lg"
      />
    </InvoiceFormLayout>
  );
}
