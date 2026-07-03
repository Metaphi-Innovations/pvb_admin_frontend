"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AccountsFormLayout } from "../expenses/components/AccountsFormLayout";
import { SearchableSelect } from "./components/SearchableSelect";
import { CreditNoteCustomerSection } from "./components/CreditNoteCustomerSection";
import { CreditNoteSchemeSelector } from "./components/CreditNoteSchemeSelector";
import { buildCreditNoteLedgerImpact } from "./credit-note-accounting";
import {
  buildReferenceFromInvoice,
  calcCreditLineAmounts,
  computeCreditNoteGstSplit,
  computeLineCreditAmount,
  createCreditNote,
  createEmptyCreditLine,
  creditLinesForSchemeSettlement,
  getCreditNoteById,
  getCustomersForCreditNote,
  listInvoicesForReference,
  MANUAL_CREDIT_REASONS,
  normalizeCreditLine,
  postCreditNote,
  previewToFormInput,
  recalcAllCreditLines,
  schemeDiscountPct,
  updateCreditNote,
  type CreditNoteLine,
  type CreditNoteSource,
  type CreditReferencePreview,
  type NoteWorkflowStatus,
} from "./credit-notes-data";
import { customerToInvoiceFields } from "../invoices/invoices-data";
import {
  customerMasterToTransactionFields,
  getProductsForSalesTransaction,
  type CustomerTransactionFields,
  type TransactionProductOption,
} from "@/lib/accounts/transaction-master-fetch";
import { CREDIT_NOTES_BREADCRUMB, CREDIT_NOTES_LIST_PATH, formatINR } from "./note-utils";
import { LedgerImpactPreview } from "@/components/accounts/LedgerImpactPreview";
import { TransactionProductSelect } from "@/components/accounts/master-fetch/TransactionProductSelect";
import {
  isSchemeSettlementAlreadySettled,
  SCHEME_SETTLEMENT_ALREADY_SETTLED_MSG,
  findPendingSchemeSettlement,
  type PendingSchemeSettlementOption,
} from "@/lib/accounts/scheme-settlement-data";

function lineDisplayAmounts(line: CreditNoteLine) {
  if (line.returnQty <= 0 || line.unitPrice <= 0) return null;
  const gross = calcCreditLineAmounts(line);
  if (line.creditAmount <= 0) {
    return { ...gross, amount: 0 };
  }
  if (gross.amount <= 0 || Math.abs(line.creditAmount - gross.amount) < 0.01) {
    return { ...gross, amount: line.creditAmount };
  }
  const ratio = line.creditAmount / gross.amount;
  const taxable = Math.round(gross.taxable * ratio * 100) / 100;
  const taxAmt = Math.round((line.creditAmount - taxable) * 100) / 100;
  const discountAmt = Math.round(gross.discountAmt * ratio * 100) / 100;
  return {
    base: gross.base,
    discountAmt,
    taxable,
    taxAmt,
    amount: line.creditAmount,
  };
}

const CREDIT_NOTE_COLUMNS: {
  key: string;
  label: string;
  align: "left" | "right";
  className?: string;
}[] = [
  { key: "product", label: "Product / Item", align: "left", className: "min-w-[140px]" },
  { key: "sku", label: "SKU", align: "left", className: "min-w-[88px]" },
  { key: "hsn", label: "HSN", align: "left", className: "min-w-[72px]" },
  { key: "qty", label: "Qty", align: "right", className: "min-w-[80px] w-[80px]" },
  { key: "rate", label: "Rate", align: "right", className: "min-w-[88px] w-[88px]" },
  { key: "discPct", label: "Discount %", align: "right", className: "min-w-[80px] w-[80px]" },
  { key: "discAmt", label: "Discount Amount", align: "right", className: "min-w-[100px]" },
  { key: "taxable", label: "Taxable Value", align: "right", className: "min-w-[100px]" },
  { key: "gstPct", label: "GST %", align: "right", className: "min-w-[64px] w-[64px]" },
  { key: "gstAmt", label: "GST Amount", align: "right", className: "min-w-[88px]" },
  { key: "total", label: "Total", align: "right", className: "min-w-[88px]" },
  { key: "action", label: "", align: "right", className: "w-10" },
];

export default function CreditNoteFormPageClient({ creditNoteId }: { creditNoteId?: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEdit = creditNoteId != null;
  const customers = useMemo(() => getCustomersForCreditNote(), []);
  const invoices = useMemo(() => listInvoicesForReference(), []);

  const [creditNoteNo, setCreditNoteNo] = useState("");
  const [creditNoteDate, setCreditNoteDate] = useState(new Date().toISOString().slice(0, 10));
  const [customerId, setCustomerId] = useState("");
  const [referenceInvoiceId, setReferenceInvoiceId] = useState("");
  const [referencePreview, setReferencePreview] = useState<CreditReferencePreview | null>(null);
  const [sourceInvoiceId, setSourceInvoiceId] = useState<number | null>(null);
  const [sourceInvoiceNo, setSourceInvoiceNo] = useState("");
  const [sourceOrderNo, setSourceOrderNo] = useState("");
  const [originalAmount, setOriginalAmount] = useState("");
  const [alreadyAdjusted, setAlreadyAdjusted] = useState("0");
  const [referenceNo, setReferenceNo] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [customerFields, setCustomerFields] = useState<CustomerTransactionFields | null>(null);
  const [billToId, setBillToId] = useState("");
  const [shipToId, setShipToId] = useState("");
  const [lines, setLines] = useState<CreditNoteLine[]>([createEmptyCreditLine()]);
  const [customerNotes, setCustomerNotes] = useState("");
  const [remarks, setRemarks] = useState("");
  const [manualReason, setManualReason] = useState("");
  const [status, setStatus] = useState<NoteWorkflowStatus>("draft");
  const [error, setError] = useState<string | null>(null);
  const [adjustment, setAdjustment] = useState(0);
  const [schemeSettlementKey, setSchemeSettlementKey] = useState("");
  const [schemeSelection, setSchemeSelection] = useState<PendingSchemeSettlementOption | null>(null);

  const products = useMemo(
    () => getProductsForSalesTransaction(customerId ? Number(customerId) : undefined),
    [customerId],
  );

  const readOnly = isEdit && status === "cancelled";
  const isInvoiceLinked = Boolean(referencePreview || sourceInvoiceId);
  const isManualEntry = !lines.some((l) => l.invoiceQty > 0);
  const canApplyScheme = lines.some((l) => l.productName.trim() && l.returnQty > 0);

  const invoiceOptions = useMemo(
    () =>
      invoices.map((inv) => ({
        value: String(inv.id),
        label: inv.invoiceNo,
        sub: `${inv.customerName} · ${inv.invoiceDate} · ${formatINR(inv.grandTotal)}`,
      })),
    [invoices],
  );

  const selectedCustomer = customers.find((c) => c.id === Number(customerId));
  const alreadyAdjustedNum = parseFloat(alreadyAdjusted) || 0;
  const customerLedgerName =
    customerFields?.receivableLedger || selectedCustomer?.customerName || referencePreview?.customerName || "";

  const applyReferencePreview = (preview: CreditReferencePreview) => {
    setReferencePreview(preview);
    const pre = previewToFormInput(preview);
    setSourceInvoiceId(pre.sourceInvoiceId ?? null);
    setSourceInvoiceNo(pre.sourceInvoiceNo ?? "");
    setSourceOrderNo(pre.sourceOrderNo ?? "");
    if (pre.customerId) setCustomerId(String(pre.customerId));
    setOriginalAmount(String(pre.originalAmount ?? ""));
    setAlreadyAdjusted(String(pre.alreadyAdjustedAmount ?? 0));
    if (pre.lineItems?.length) {
      const normalized = pre.lineItems.map((l) => normalizeCreditLine(l));
      setLines(
        normalized.map((l) => ({
          ...l,
          creditAmount: computeLineCreditAmount(l, normalized, preview.alreadyAdjustedAmount),
        })),
      );
    }
  };

  const onCustomerChange = (id: string, fields: CustomerTransactionFields | null) => {
    setCustomerId(id);
    if (!fields) {
      setCustomerFields(null);
      return;
    }
    setCustomerFields(fields);
    setBillToId(fields.defaultBillToId);
    setShipToId(fields.defaultShipToId);
    setBillingAddress(fields.billingAddress);
    setShippingAddress(fields.shippingAddress);
  };

  const onInvoiceSelect = (id: string) => {
    if (schemeSettlementKey) return;
    setReferenceInvoiceId(id);
    if (!id) {
      setReferencePreview(null);
      setSourceInvoiceId(null);
      setSourceInvoiceNo("");
      setSourceOrderNo("");
      setOriginalAmount("");
      setAlreadyAdjusted("0");
      setLines([createEmptyCreditLine()]);
      return;
    }
    const preview = buildReferenceFromInvoice(Number(id));
    if (preview) {
      applyReferencePreview(preview);
      const c = customers.find((x) => x.id === preview.customerId);
      if (c) {
        const fields = customerMasterToTransactionFields(c);
        onCustomerChange(String(c.id), fields);
      }
    }
  };

  const onSchemeChange = (key: string, opt: PendingSchemeSettlementOption | null) => {
    if (!opt) {
      const prevScheme = schemeSelection;
      const prevPct = prevScheme ? schemeDiscountPct(prevScheme) : 0;
      setSchemeSettlementKey("");
      setSchemeSelection(null);
      setLines((prev) =>
        recalcAllCreditLines(
          prev.map((l) =>
            prevPct > 0 && l.discountPct === prevPct ? { ...l, discountPct: 0 } : l,
          ),
          alreadyAdjustedNum,
        ),
      );
      if (prevScheme && referenceInvoiceId === String(prevScheme.invoiceId)) {
        setReferenceInvoiceId("");
        setReferencePreview(null);
        setSourceInvoiceId(null);
        setSourceInvoiceNo("");
        setSourceOrderNo("");
        setOriginalAmount("");
        setAlreadyAdjusted("0");
      }
      return;
    }

    setSchemeSettlementKey(key);
    setSchemeSelection(opt);
    setReferenceInvoiceId(String(opt.invoiceId));
    setSourceInvoiceId(opt.invoiceId);
    setSourceInvoiceNo(opt.invoiceNo);
    setSourceOrderNo(opt.salesOrderNo);

    const preview = buildReferenceFromInvoice(opt.invoiceId);
    const adjustedFromPreview = preview?.alreadyAdjustedAmount ?? alreadyAdjustedNum;
    if (preview) {
      setReferencePreview(preview);
      setOriginalAmount(String(preview.originalAmount));
      setAlreadyAdjusted(String(preview.alreadyAdjustedAmount));
    }

    const discountPct = schemeDiscountPct(opt);
    const productKey = opt.product.trim().toLowerCase();

    setLines((prev) => {
      const hasEnteredLines = prev.some((l) => l.productName.trim() && l.returnQty > 0);
      if (hasEnteredLines) {
        const updated = prev.map((l) => {
          if (!l.productName.trim()) return l;
          const name = l.productName.trim().toLowerCase();
          const matches =
            !productKey ||
            name === productKey ||
            name.includes(productKey) ||
            productKey.includes(name);
          if (!matches) return l;
          return { ...l, discountPct: discountPct > 0 ? discountPct : l.discountPct };
        });
        return recalcAllCreditLines(updated, adjustedFromPreview);
      }
      if (preview) {
        return creditLinesForSchemeSettlement(preview.lineItems, opt);
      }
      return prev;
    });

    const cust = customers.find(
      (c) => c.id === opt.customerId || c.customerName === opt.customerName,
    );
    if (cust) {
      const fields = customerMasterToTransactionFields(cust);
      onCustomerChange(String(cust.id), fields);
    }
  };

  useEffect(() => {
    if (isEdit) return;
    const invId = searchParams.get("invoiceId");
    if (!invId) return;
    setReferenceInvoiceId(invId);
    const preview = buildReferenceFromInvoice(Number(invId));
    if (preview) {
      applyReferencePreview(preview);
      const c = customers.find((x) => x.id === preview.customerId);
      if (c) {
        const fields = customerMasterToTransactionFields(c);
        onCustomerChange(String(c.id), fields);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, searchParams]);

  useEffect(() => {
    if (!isEdit || creditNoteId == null) return;
    const rec = getCreditNoteById(creditNoteId);
    if (!rec) {
      router.replace(CREDIT_NOTES_LIST_PATH);
      return;
    }
    setCreditNoteNo(rec.creditNoteNo);
    setCreditNoteDate(rec.creditNoteDate);
    setCustomerId(rec.customerId ? String(rec.customerId) : "");
    setSourceInvoiceNo(rec.sourceInvoiceNo);
    setSourceOrderNo(rec.sourceOrderNo);
    setSourceInvoiceId(rec.sourceInvoiceId);
    setReferenceInvoiceId(rec.sourceInvoiceId ? String(rec.sourceInvoiceId) : "");
    setOriginalAmount(String(rec.originalAmount));
    setAlreadyAdjusted(String(rec.alreadyAdjustedAmount));
    setBillingAddress(rec.billingAddress ?? "");
    setShippingAddress(rec.shippingAddress ?? "");
    const c = rec.customerId ? customers.find((x) => x.id === rec.customerId) : undefined;
    if (c) {
      const fields = customerMasterToTransactionFields(c);
      setCustomerFields(fields);
      setBillToId(fields.defaultBillToId);
      setShipToId(fields.defaultShipToId);
    }
    setCustomerNotes(rec.customerNotes ?? "");
    setRemarks(rec.remarks);
    setManualReason(rec.source === "manual" ? rec.reason : "");
    setStatus(rec.status);
    const loadedLines = rec.lineItems.length
      ? rec.lineItems.map((l) => normalizeCreditLine(l))
      : [createEmptyCreditLine()];
    setLines(
      loadedLines.map((l) => ({
        ...l,
        creditAmount: computeLineCreditAmount(l, loadedLines, rec.alreadyAdjustedAmount),
      })),
    );
    if (rec.sourceInvoiceId) {
      const p = buildReferenceFromInvoice(rec.sourceInvoiceId);
      if (p) setReferencePreview(p);
    }
    if (rec.schemeSettlementKey) {
      setSchemeSettlementKey(rec.schemeSettlementKey);
      const pending = findPendingSchemeSettlement(rec.schemeSettlementKey);
      if (pending) setSchemeSelection(pending);
    }
  }, [isEdit, creditNoteId, router, customers]);

  const subTotal = lines.reduce((s, l) => s + l.creditAmount, 0);
  const grandTotal = Math.max(0, subTotal + adjustment);
  const gstSplit = computeCreditNoteGstSplit(lines);
  const original = parseFloat(originalAmount) || grandTotal;

  const updateLine = (id: string, patch: Partial<CreditNoteLine>) => {
    setLines((prev) => {
      const merged = prev.map((l) => (l.id === id ? { ...l, ...patch } : l));
      return recalcAllCreditLines(merged, alreadyAdjustedNum);
    });
  };

  const onProductSelect = (lineId: string, product: TransactionProductOption) => {
    updateLine(lineId, {
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      hsn: product.hsn,
      unitPrice: product.unitPrice,
      taxPct: product.taxPct,
    });
  };

  const resolveCustomerName = (): string => {
    if (selectedCustomer) return customerToInvoiceFields(selectedCustomer).customerName;
    if (customerFields?.customerName) return customerFields.customerName;
    if (referencePreview?.customerName) return referencePreview.customerName;
    return "";
  };

  const buildInput = (nextStatus: NoteWorkflowStatus) => {
    const isManual = !schemeSettlementKey && !isInvoiceLinked;
    const source: CreditNoteSource = schemeSettlementKey
      ? "payment_discount_scheme"
      : isManual
        ? "manual"
        : "sales_return";
    return {
    creditNoteDate,
    customerId: customerId ? Number(customerId) : null,
    customerName: resolveCustomerName(),
    receivableLedger: customerLedgerName,
    billingAddress,
    shippingAddress,
    customerNotes,
    sourceInvoiceId,
    sourceInvoiceNo,
    sourceOrderId: null,
    sourceOrderNo,
    originalAmount: original,
    alreadyAdjustedAmount: alreadyAdjustedNum,
    lineItems: lines.filter((l) => l.productName || l.creditAmount > 0),
    reason: schemeSettlementKey
      ? "Near Expiry Scheme Settlement"
      : isManual
        ? manualReason || "Manual Adjustment"
        : "Sales return",
    remarks: remarks || customerNotes,
    status: nextStatus,
    source,
    schemeName: schemeSelection?.schemeName,
    schemeSettlementKey: schemeSettlementKey || undefined,
    schemeCode: schemeSelection?.schemeCode,
    schemeSettlementAmount: schemeSettlementKey ? grandTotal : undefined,
    };
  };

  const postNote = () => {
    setError(null);
    try {
      if (!resolveCustomerName().trim()) {
        setError("Select a customer before posting.");
        return;
      }
      if (!schemeSettlementKey && !isInvoiceLinked && !manualReason.trim()) {
        setError("Select a reason for manual credit note.");
        return;
      }
      if (schemeSettlementKey && schemeSelection) {
        if (isSchemeSettlementAlreadySettled(schemeSettlementKey)) {
          setError(SCHEME_SETTLEMENT_ALREADY_SETTLED_MSG);
          return;
        }
      }
      if (grandTotal <= 0) {
        setError(
          schemeSettlementKey
            ? "Enter return quantity on the scheme line before posting."
            : "Enter quantity on at least one line before posting.",
        );
        return;
      }
      if (isEdit && creditNoteId != null) {
        updateCreditNote(creditNoteId, buildInput("draft"));
        postCreditNote(creditNoteId);
        router.push(`${CREDIT_NOTES_LIST_PATH}/${creditNoteId}`);
      } else {
        const rec = createCreditNote(buildInput("draft"));
        postCreditNote(rec.id);
        router.push(`${CREDIT_NOTES_LIST_PATH}/${rec.id}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not post credit note.");
    }
  };

  const impactLines = buildCreditNoteLedgerImpact({
    customerLedgerName: customerLedgerName,
    customerName: resolveCustomerName(),
    taxable: gstSplit.taxable,
    taxAmount: gstSplit.taxAmount,
    grandTotal,
    isSchemeSettlement: Boolean(schemeSettlementKey),
  });

  return (
    <AccountsFormLayout
      fullWidth
      title={isEdit ? "Edit Credit Note" : "New Credit Note"}
      breadcrumb={[...CREDIT_NOTES_BREADCRUMB]}
      code={creditNoteNo || undefined}
      footer={
        readOnly ? (
          <Button variant="outline" size="sm" className="h-9 text-[13px] font-medium" onClick={() => router.push(CREDIT_NOTES_LIST_PATH)}>
            Back
          </Button>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="h-9 text-[13px] font-medium" onClick={() => router.push(CREDIT_NOTES_LIST_PATH)}>
              Cancel
            </Button>
            <Button size="sm" className="h-9 text-[13px] font-medium bg-brand-600 hover:bg-brand-700 text-white" onClick={postNote}>
              Post Credit Note
            </Button>
          </div>
        )
      }
    >
      <div className="bg-white border border-border/60 rounded-lg shadow-sm">
        {/* Top section */}
        <div className="px-6 py-5 border-b border-border/60 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Credit Note No.</Label>
              <Input className="h-9 text-xs font-mono bg-muted/20" disabled value={isEdit ? creditNoteNo : "Auto-generated"} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Reference No.</Label>
              <Input className="h-9 text-xs" value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} disabled={readOnly} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Credit Note Date</Label>
              <Input type="date" className="h-9 text-xs" value={creditNoteDate} onChange={(e) => setCreditNoteDate(e.target.value)} disabled={readOnly} />
            </div>
            <div className="space-y-1">
              <SearchableSelect
                label="Original Invoice No."
                value={referenceInvoiceId}
                onChange={onInvoiceSelect}
                options={invoiceOptions}
                placeholder="Linked invoice (optional)"
                disabled={readOnly || Boolean(schemeSettlementKey)}
              />
              {referencePreview && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {formatINR(referencePreview.originalAmount)} · Credited {formatINR(referencePreview.alreadyAdjustedAmount)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Customer section */}
        <div className="px-6 py-5 border-b border-border/60">
          <CreditNoteCustomerSection
            customers={customers}
            customerId={customerId}
            onCustomerIdChange={onCustomerChange}
            fields={customerFields}
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
            disabled={readOnly}
          />
        </div>

        {/* Item grid + totals */}
        <div className="px-6 py-4 space-y-4">
          <div className="w-full">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                Credit Note Details
              </h3>
              {!readOnly && isManualEntry && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 text-[13px] font-medium gap-1 shrink-0"
                  onClick={() => setLines([...lines, createEmptyCreditLine()])}
                >
                  <Plus className="w-3 h-3" /> Add Row
                </Button>
              )}
            </div>
            <div className="w-full border border-border/60 rounded-xl bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] text-xs table-fixed">
                <thead className="border-b border-border/60">
                  <tr>
                    {CREDIT_NOTE_COLUMNS.map((col) => (
                      <th
                        key={col.key}
                        className={cn(
                          "px-3 py-2.5 text-[10px] font-semibold uppercase text-muted-foreground whitespace-nowrap",
                          col.align === "right" ? "text-right" : "text-left",
                          col.className,
                        )}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => {
                    const amounts = lineDisplayAmounts(l);
                    return (
                    <tr key={l.id} className="border-b border-border/40 hover:bg-muted/10">
                      <td className={cn("px-3 py-2 align-middle", CREDIT_NOTE_COLUMNS[0].className)}>
                        {isManualEntry && !readOnly ? (
                          <TransactionProductSelect
                            products={products}
                            value={l.productId ?? null}
                            onSelect={(p) => onProductSelect(l.id, p)}
                            disabled={readOnly}
                            placeholder="Select product…"
                          />
                        ) : (
                          <p className="text-xs font-medium">{l.productName || "—"}</p>
                        )}
                      </td>
                      <td className={cn("px-3 py-2 align-middle", CREDIT_NOTE_COLUMNS[1].className)}>
                        <p className="font-mono text-brand-700 text-xs truncate">{l.sku || "—"}</p>
                      </td>
                      <td className={cn("px-3 py-2 align-middle", CREDIT_NOTE_COLUMNS[2].className)}>
                        <p className="font-mono text-xs truncate">{l.hsn || "—"}</p>
                      </td>
                      <td className={cn("px-3 py-2 align-middle text-right", CREDIT_NOTE_COLUMNS[3].className)}>
                        <div className="flex flex-col items-end gap-0.5">
                        <Input
                          type="number"
                          min={0}
                          max={l.invoiceQty > 0 ? l.invoiceQty : undefined}
                          className="h-8 w-full max-w-[72px] text-xs text-right tabular-nums"
                          value={l.returnQty || ""}
                          onChange={(e) => updateLine(l.id, { returnQty: parseFloat(e.target.value) || 0 })}
                          disabled={readOnly || (isInvoiceLinked && !l.productName)}
                          placeholder={isManualEntry ? "0" : ""}
                        />
                        {l.invoiceQty > 0 && (
                          <span className="text-[10px] text-muted-foreground leading-none">of {l.invoiceQty}</span>
                        )}
                        </div>
                      </td>
                      <td className={cn("px-3 py-2 align-middle text-right", CREDIT_NOTE_COLUMNS[4].className)}>
                        {isManualEntry && !readOnly ? (
                          <AccountsMoneyInput
                            className="h-8 w-full max-w-[80px] text-xs text-right tabular-nums ml-auto"
                            value={l.unitPrice || ""}
                            onChange={(v) => updateLine(l.id, { unitPrice: v })}
                          />
                        ) : (
                          <p className="text-xs text-right tabular-nums font-mono">{l.unitPrice > 0 ? l.unitPrice.toFixed(2) : "—"}</p>
                        )}
                      </td>
                      <td className={cn("px-3 py-2 align-middle text-right", CREDIT_NOTE_COLUMNS[5].className)}>
                        {schemeSettlementKey || isInvoiceLinked ? (
                          <p className="text-xs text-right tabular-nums font-mono">
                            {l.discountPct > 0 ? `${l.discountPct}%` : "—"}
                          </p>
                        ) : !readOnly ? (
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            className="h-8 w-full max-w-[64px] text-xs text-right tabular-nums ml-auto"
                            value={l.discountPct || ""}
                            onChange={(e) =>
                              updateLine(l.id, { discountPct: parseFloat(e.target.value) || 0 })
                            }
                          />
                        ) : (
                          <p className="text-xs text-right tabular-nums font-mono">
                            {l.discountPct > 0 ? `${l.discountPct}%` : "—"}
                          </p>
                        )}
                      </td>
                      <td className={cn("px-3 py-2 align-middle text-right font-mono tabular-nums", CREDIT_NOTE_COLUMNS[6].className)}>
                        <p className="text-xs">{amounts ? amounts.discountAmt.toFixed(2) : "—"}</p>
                      </td>
                      <td className={cn("px-3 py-2 align-middle text-right font-mono tabular-nums", CREDIT_NOTE_COLUMNS[7].className)}>
                        <p className="text-xs">{amounts ? amounts.taxable.toFixed(2) : "—"}</p>
                      </td>
                      <td className={cn("px-3 py-2 align-middle text-right font-mono tabular-nums", CREDIT_NOTE_COLUMNS[8].className)}>
                        <p className="text-xs">{l.taxPct > 0 ? `${l.taxPct}%` : "—"}</p>
                      </td>
                      <td className={cn("px-3 py-2 align-middle text-right font-mono tabular-nums", CREDIT_NOTE_COLUMNS[9].className)}>
                        <p className="text-xs">{amounts ? amounts.taxAmt.toFixed(2) : "—"}</p>
                      </td>
                      <td className={cn("px-3 py-2 align-middle text-right font-mono tabular-nums font-semibold text-brand-700", CREDIT_NOTE_COLUMNS[10].className)}>
                        <p className="text-xs">{amounts && amounts.amount > 0 ? amounts.amount.toFixed(2) : "—"}</p>
                      </td>
                      <td className={cn("px-3 py-2 align-middle", CREDIT_NOTE_COLUMNS[11].className)}>
                        {!readOnly && isManualEntry && lines.length > 1 && (
                          <button type="button" className="w-8 h-8 flex items-center justify-center rounded hover:bg-red-50 text-red-600" onClick={() => setLines(lines.filter((x) => x.id !== l.id))}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </div>
          </div>

          <div className="space-y-4 border-t border-border/40 pt-4">
            <div className="max-w-md">
              <CreditNoteSchemeSelector
                value={schemeSettlementKey}
                onChange={onSchemeChange}
                disabled={readOnly || !canApplyScheme}
              />
              {!readOnly && !canApplyScheme && (
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  Add product details and quantities first, then apply a scheme code.
                </p>
              )}
            </div>
            <div className="flex justify-end">
            <div className="w-full sm:w-80 shrink-0">
              <div className="border border-border/60 rounded-lg p-4 bg-muted/5 space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2 text-[10px] uppercase text-muted-foreground font-semibold border-b pb-2">
                <span />
                <span className="text-right">Amount</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Sub Total</span>
                <span className="tabular-nums font-medium">{formatINR(subTotal)}</span>
              </div>
              <div className="flex justify-between items-center py-1 gap-2">
                <span className="text-muted-foreground">Adjustment</span>
                <AccountsMoneyInput
                  className="h-7 w-24 text-xs text-right tabular-nums ml-auto"
                  value={adjustment || ""}
                  onChange={(v) => setAdjustment(v)}
                  disabled={readOnly}
                />
              </div>
              <div className="flex justify-between py-2 border-t border-border/60 font-semibold text-sm">
                <span>Total (₹)</span>
                <span className="tabular-nums text-brand-700">{formatINR(grandTotal)}</span>
              </div>
              {referencePreview && (
                <>
                  <div className="flex justify-between text-[11px] text-muted-foreground pt-1 border-t">
                    <span>Invoice Total</span>
                    <span className="tabular-nums">{formatINR(original)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>Balance After Credit</span>
                    <span className="tabular-nums">{formatINR(Math.max(0, original - alreadyAdjustedNum - grandTotal))}</span>
                  </div>
                </>
              )}
              </div>
            </div>
            </div>
          </div>
        </div>

        {grandTotal > 0 && (
          <div className="px-6 pb-4">
            <LedgerImpactPreview lines={impactLines} />
          </div>
        )}

        <div className="px-6 py-4 border-t border-border/60 space-y-3">
          {!schemeSettlementKey && !isInvoiceLinked && (
            <div className="space-y-1.5 max-w-xs">
              <Label className="text-xs font-medium">
                Reason <span className="text-red-500">*</span>
              </Label>
              <SearchableSelect
                label="Reason"
                value={manualReason}
                onChange={setManualReason}
                options={MANUAL_CREDIT_REASONS.map((r) => ({ value: r, label: r }))}
                placeholder="Select reason…"
                disabled={readOnly}
              />
            </div>
          )}
          <div className="space-y-1 max-w-xl">
            <Label className="text-xs font-medium text-muted-foreground">Customer Notes</Label>
            <Textarea className="min-h-[72px] text-xs resize-none" value={customerNotes} onChange={(e) => setCustomerNotes(e.target.value)} placeholder="Notes visible to customer" disabled={readOnly} />
          </div>
        </div>

        {error && <p className="px-6 pb-4 text-xs text-red-600">{error}</p>}
      </div>
    </AccountsFormLayout>
  );
}
