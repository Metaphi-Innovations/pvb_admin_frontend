"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { AccountsFormLayout } from "../expenses/components/AccountsFormLayout";
import { SearchableSelect } from "./components/SearchableSelect";
import {
  applyReturnQtyToLines,
  buildReferenceFromInvoice,
  computeCreditNoteGstSplit,
  computeLineCreditAmount,
  createCreditNote,
  createEmptyCreditLine,
  getCreditNoteById,
  getCustomersForCreditNote,
  listInvoicesForReference,
  normalizeCreditLine,
  postCreditNote,
  previewToFormInput,
  updateCreditNote,
  type CreditNoteLine,
  type CreditReferencePreview,
  type NoteWorkflowStatus,
} from "./credit-notes-data";
import { customerToInvoiceFields } from "../invoices/invoices-data";
import { CustomerMasterPanel } from "@/components/accounts/master-fetch/CustomerMasterPanel";
import {
  customerMasterToTransactionFields,
  type CustomerTransactionFields,
} from "@/lib/accounts/transaction-master-fetch";
import { CREDIT_NOTES_BREADCRUMB, CREDIT_NOTES_LIST_PATH, formatINR } from "./note-utils";
import { LedgerImpactPreview } from "@/components/accounts/LedgerImpactPreview";
import { creditNoteImpactResolved } from "@/lib/accounts/resolved-impact-previews";
import { getActivePostingLedgers, getLedgersUnderSubGroupName } from "@/lib/accounts/coa-hierarchy";
import { StatusBadge } from "../components/AccountsUI";

export default function CreditNoteFormPageClient({ creditNoteId }: { creditNoteId?: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEdit = creditNoteId != null;
  const customers = useMemo(() => getCustomersForCreditNote(), []);
  const invoices = useMemo(() => listInvoicesForReference(), []);
  const receivableLedgers = useMemo(
    () => getLedgersUnderSubGroupName("Trade Receivables / Sundry Debtors"),
    [],
  );
  const salesReturnAccount = useMemo(
    () =>
      getActivePostingLedgers().find((l) => l.accountName.toLowerCase().includes("sales return"))
        ?.accountName ?? "Sales Return",
    [],
  );

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
  const [receivableLedger, setReceivableLedger] = useState("");
  const [salesperson, setSalesperson] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [subject, setSubject] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [customerFields, setCustomerFields] = useState<CustomerTransactionFields | null>(null);
  const [billToId, setBillToId] = useState("");
  const [shipToId, setShipToId] = useState("");
  const [lines, setLines] = useState<CreditNoteLine[]>([createEmptyCreditLine()]);
  const [customerNotes, setCustomerNotes] = useState("");
  const [termsAndConditions, setTermsAndConditions] = useState("");
  const [remarks, setRemarks] = useState("");
  const [status, setStatus] = useState<NoteWorkflowStatus>("draft");
  const [error, setError] = useState<string | null>(null);
  const [adjustment, setAdjustment] = useState(0);

  const readOnly = status === "approved";

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

  const applyReferencePreview = (preview: CreditReferencePreview) => {
    setReferencePreview(preview);
    const pre = previewToFormInput(preview);
    setSourceInvoiceId(pre.sourceInvoiceId ?? null);
    setSourceInvoiceNo(pre.sourceInvoiceNo ?? "");
    setSourceOrderNo(pre.sourceOrderNo ?? "");
    if (pre.customerId) setCustomerId(String(pre.customerId));
    setOriginalAmount(String(pre.originalAmount ?? ""));
    setAlreadyAdjusted(String(pre.alreadyAdjustedAmount ?? 0));
    if (preview.customerName) {
      setReceivableLedger(preview.customerName);
    }
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
    setReceivableLedger(fields.receivableLedger || fields.customerName);
  };

  const onInvoiceSelect = (id: string) => {
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

  useEffect(() => {
    if (isEdit) return;
    const invId = searchParams.get("invoiceId");
    if (!invId) return;
    setReferenceInvoiceId(invId);
    const preview = buildReferenceFromInvoice(Number(invId));
    if (preview) applyReferencePreview(preview);
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
    setReceivableLedger(rec.receivableLedger ?? rec.customerName);
    setSalesperson(rec.salesperson ?? "");
    setSubject(rec.subject ?? "");
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
    setTermsAndConditions(rec.termsAndConditions ?? "");
    setRemarks(rec.remarks);
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
  }, [isEdit, creditNoteId, router]);

  const subTotal = lines.reduce((s, l) => s + l.creditAmount, 0);
  const grandTotal = Math.max(0, subTotal + adjustment);
  const gstSplit = computeCreditNoteGstSplit(lines);
  const original = parseFloat(originalAmount) || grandTotal;

  const updateLine = (id: string, patch: Partial<CreditNoteLine>) => {
    if ("returnQty" in patch) {
      setLines((prev) => applyReturnQtyToLines(prev, id, patch.returnQty ?? 0, alreadyAdjustedNum));
      return;
    }
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const resolveCustomerName = (): string => {
    if (selectedCustomer) return customerToInvoiceFields(selectedCustomer).customerName;
    if (referencePreview?.customerName) return referencePreview.customerName;
    return receivableLedger || "";
  };

  const buildInput = (nextStatus: NoteWorkflowStatus) => ({
    creditNoteDate,
    customerId: customerId ? Number(customerId) : null,
    customerName: resolveCustomerName(),
    receivableLedger,
    salesperson,
    subject,
    billingAddress,
    shippingAddress,
    customerNotes,
    termsAndConditions,
    sourceInvoiceId,
    sourceInvoiceNo,
    sourceOrderId: null,
    sourceOrderNo,
    originalAmount: original,
    alreadyAdjustedAmount: alreadyAdjustedNum,
    lineItems: lines.filter((l) => l.productName || l.creditAmount > 0),
    reason: "Sales return",
    remarks: remarks || customerNotes,
    status: nextStatus,
  });

  const saveDraft = () => {
    setError(null);
    try {
      if (isEdit && creditNoteId != null) {
        updateCreditNote(creditNoteId, buildInput("draft"));
        router.push(`${CREDIT_NOTES_LIST_PATH}/${creditNoteId}`);
      } else {
        const rec = createCreditNote(buildInput("draft"));
        router.push(`${CREDIT_NOTES_LIST_PATH}/${rec.id}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    }
  };

  const postNote = () => {
    setError(null);
    try {
      if (grandTotal <= 0) {
        setError("Enter return quantity on at least one line before posting.");
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

  const impactLines = creditNoteImpactResolved({
    customerName: resolveCustomerName() || "Customer",
    taxable: gstSplit.taxable,
    taxAmount: gstSplit.taxAmount,
    grandTotal,
  });

  return (
    <AccountsFormLayout
      fullWidth
      title={isEdit ? "Edit Credit Note" : "New Credit Note"}
      breadcrumb={[...CREDIT_NOTES_BREADCRUMB]}
      code={creditNoteNo || undefined}
      footer={
        readOnly ? (
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => router.push(CREDIT_NOTES_LIST_PATH)}>
            Back
          </Button>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => router.push(CREDIT_NOTES_LIST_PATH)}>
              Cancel
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={saveDraft}>
              Save Draft
            </Button>
            <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white" onClick={postNote}>
              Post Credit Note
            </Button>
          </div>
        )
      }
    >
      <div className="bg-white border border-border/60 rounded-lg shadow-sm">
        {/* Customer & header — Zoho-style */}
        <div className="px-6 py-5 border-b border-border/60 space-y-4">
          <CustomerMasterPanel
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
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="px-2 py-0.5 rounded border bg-muted/30 font-medium">INR</span>
            {status && <StatusBadge status={status} />}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Credit Note#</Label>
              <Input className="h-9 text-xs font-mono bg-muted/20" disabled value={isEdit ? creditNoteNo : "Auto-generated"} />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Reference#</Label>
              <Input className="h-9 text-xs" value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} disabled={readOnly} />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Credit Note Date</Label>
              <Input type="date" className="h-9 text-xs" value={creditNoteDate} onChange={(e) => setCreditNoteDate(e.target.value)} disabled={readOnly} />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Accounts Receivable</Label>
              <Select value={receivableLedger} onValueChange={setReceivableLedger} disabled={readOnly}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select ledger" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {receivableLedgers.map((l) => (
                    <SelectItem key={l.id} value={l.accountName} className="text-xs">{l.accountName}</SelectItem>
                  ))}
                  {receivableLedger && !receivableLedgers.some((l) => l.accountName === receivableLedger) && (
                    <SelectItem value={receivableLedger} className="text-xs">{receivableLedger}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Salesperson</Label>
              <Input className="h-9 text-xs" value={salesperson} onChange={(e) => setSalesperson(e.target.value)} placeholder="Salesperson" disabled={readOnly} />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Subject</Label>
            <Input className="h-9 text-xs" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Brief description for this credit note" disabled={readOnly} />
          </div>

          <div className="max-w-md">
            <SearchableSelect
              label="Reference Invoice"
              value={referenceInvoiceId}
              onChange={onInvoiceSelect}
              options={invoiceOptions}
              placeholder="Select invoice to credit against"
              disabled={readOnly}
            />
            {referencePreview && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Invoice {referencePreview.sourceInvoiceNo} · {formatINR(referencePreview.originalAmount)} · Already credited {formatINR(referencePreview.alreadyAdjustedAmount)}
              </p>
            )}
          </div>
        </div>

        {/* Item grid + totals — Zoho layout */}
        <div className="px-6 py-4 flex flex-col lg:flex-row gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground">Item Table</h3>
              {!readOnly && referencePreview && (
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setLines([...lines, createEmptyCreditLine()])}>
                  <Plus className="w-3 h-3" /> Add New Row
                </Button>
              )}
            </div>
            <div className="border border-border/60 rounded-lg overflow-x-auto">
              <table className="w-full text-xs min-w-[900px]">
                <thead className="bg-muted/25 border-b border-border/60">
                  <tr>
                    {["Item Details", "Account", "Inv Qty", "Return Qty", "Rate", "Discount %", "Amount (₹)", ""].map((h) => (
                      <th key={h || "act"} className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase text-muted-foreground whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.id} className="border-b border-border/40 align-top">
                      <td className="px-2 py-2 min-w-[180px]">
                        <Input className="h-8 text-xs font-medium mb-1 bg-muted/10" readOnly value={l.productName} placeholder="Item" />
                        <Textarea className="text-[11px] min-h-[40px] resize-none bg-muted/5" readOnly value={l.description} placeholder="Description" />
                      </td>
                      <td className="px-2 py-2 min-w-[120px]">
                        <Input className="h-8 text-xs bg-muted/10" readOnly value={salesReturnAccount} />
                      </td>
                      <td className="px-2 py-2">
                        <Input className="h-8 w-16 text-xs bg-muted/10 text-right tabular-nums" readOnly value={l.invoiceQty || ""} />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="number"
                          min={0}
                          max={l.invoiceQty || undefined}
                          className="h-8 w-20 text-xs text-right tabular-nums"
                          value={l.returnQty || ""}
                          onChange={(e) => updateLine(l.id, { returnQty: parseFloat(e.target.value) || 0 })}
                          disabled={readOnly || !l.productName}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input className="h-8 w-24 text-xs bg-muted/10 text-right tabular-nums" readOnly value={l.unitPrice || ""} />
                      </td>
                      <td className="px-2 py-2">
                        <Input className="h-8 w-16 text-xs bg-muted/10 text-right tabular-nums" readOnly value={l.discountPct || ""} />
                      </td>
                      <td className="px-2 py-2">
                        <Input className="h-8 w-28 text-xs bg-muted/10 text-right tabular-nums font-medium" readOnly value={l.creditAmount > 0 ? l.creditAmount.toFixed(2) : ""} />
                      </td>
                      <td className="px-2 py-2">
                        {!readOnly && lines.length > 1 && (
                          <button type="button" className="w-8 h-8 flex items-center justify-center rounded hover:bg-red-50 text-red-600" onClick={() => setLines(lines.filter((x) => x.id !== l.id))}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="w-full lg:w-72 flex-shrink-0">
            <div className="border border-border/60 rounded-lg p-4 bg-muted/5 space-y-2 text-xs sticky top-4">
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
                <Input
                  type="number"
                  className="h-7 w-24 text-xs text-right tabular-nums ml-auto"
                  value={adjustment || ""}
                  onChange={(e) => setAdjustment(parseFloat(e.target.value) || 0)}
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

        {/* Ledger impact */}
        {grandTotal > 0 && (
          <div className="px-6 pb-4">
            <LedgerImpactPreview lines={impactLines} />
          </div>
        )}

        {/* Notes */}
        <div className="px-6 py-4 border-t border-border/60 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Customer Notes</Label>
            <Textarea className="min-h-[72px] text-xs resize-none" value={customerNotes} onChange={(e) => setCustomerNotes(e.target.value)} placeholder="Notes visible to customer" disabled={readOnly} />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Terms &amp; Conditions</Label>
            <Textarea className="min-h-[72px] text-xs resize-none" value={termsAndConditions} onChange={(e) => setTermsAndConditions(e.target.value)} placeholder="Terms and conditions" disabled={readOnly} />
          </div>
        </div>

        {error && <p className="px-6 pb-4 text-xs text-red-600">{error}</p>}
      </div>
    </AccountsFormLayout>
  );
}
