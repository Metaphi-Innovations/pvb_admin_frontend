"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { AccountsFormLayout } from "../expenses/components/AccountsFormLayout";
import { SearchableSelect } from "./components/SearchableSelect";
import { CreditNoteCustomerSection } from "./components/CreditNoteCustomerSection";
import { NoteTypeSelector } from "./components/NoteTypeSelector";
import { DirectAdjustmentFields } from "./components/DirectAdjustmentFields";
import { CreditNoteProductTable } from "./components/CreditNoteProductTable";
import { buildCreditNoteLedgerImpact } from "./credit-note-accounting";
import {
  applyReturnQtyToLines,
  buildReferenceFromInvoice,
  buildReferenceFromSalesReturn,
  computeCreditNoteGstSplit,
  createCreditNote,
  createEmptyCreditLine,
  getCreditLineMaxQty,
  getCreditNoteById,
  getCustomersForCreditNote,
  listInvoicesForReference,
  listSalesReturnsForCreditNote,
  MANUAL_CREDIT_REASONS,
  normalizeCreditLine,
  postCreditNote,
  previewToFormInput,
  recalcAllCreditLines,
  updateCreditNote,
  validateCreditNoteLines,
  type CreditNoteCreationMode,
  type CreditReferenceDocType,
  type CreditNoteLine,
  type CreditNoteSource,
  type CreditReferencePreview,
  type NoteWorkflowStatus,
} from "./credit-notes-data";
import {
  customerMasterToTransactionFields,
  type CustomerTransactionFields,
} from "@/lib/accounts/transaction-master-fetch";
import { CREDIT_NOTES_BREADCRUMB, CREDIT_NOTES_LIST_PATH, formatINR } from "./note-utils";
import { LedgerImpactPreview } from "@/components/accounts/LedgerImpactPreview";

const NOTE_TYPE_OPTIONS: { value: CreditNoteCreationMode; label: string }[] = [
  { value: "against_reference", label: "Against Sales Invoice / Sales Return (Quantity Based)" },
  { value: "direct_adjustment", label: "Direct Amount Adjustment" },
];

export default function CreditNoteFormPageClient({ creditNoteId }: { creditNoteId?: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEdit = creditNoteId != null;
  const customers = useMemo(() => getCustomersForCreditNote(), []);
  const invoices = useMemo(() => listInvoicesForReference(), []);
  const salesReturns = useMemo(() => listSalesReturnsForCreditNote(), []);

  const [noteType, setNoteType] = useState<CreditNoteCreationMode>("against_reference");
  const [referenceDocType, setReferenceDocType] = useState<CreditReferenceDocType>("sales_invoice");
  const [creditNoteNo, setCreditNoteNo] = useState("");
  const [creditNoteDate, setCreditNoteDate] = useState(new Date().toISOString().slice(0, 10));
  const [customerId, setCustomerId] = useState("");
  const [referenceInvoiceId, setReferenceInvoiceId] = useState("");
  const [referenceReturnId, setReferenceReturnId] = useState("");
  const [sourceReturnId, setSourceReturnId] = useState("");
  const [sourceReturnNo, setSourceReturnNo] = useState("");
  const [referencePreview, setReferencePreview] = useState<CreditReferencePreview | null>(null);
  const [sourceInvoiceId, setSourceInvoiceId] = useState<number | null>(null);
  const [sourceInvoiceNo, setSourceInvoiceNo] = useState("");
  const [sourceOrderNo, setSourceOrderNo] = useState("");
  const [originalAmount, setOriginalAmount] = useState("");
  const [alreadyAdjusted, setAlreadyAdjusted] = useState("0");
  const [billingAddress, setBillingAddress] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [customerFields, setCustomerFields] = useState<CustomerTransactionFields | null>(null);
  const [billToId, setBillToId] = useState("");
  const [shipToId, setShipToId] = useState("");
  const [lines, setLines] = useState<CreditNoteLine[]>([]);
  const [remarks, setRemarks] = useState("");
  const [status, setStatus] = useState<NoteWorkflowStatus>("draft");
  const [error, setError] = useState<string | null>(null);
  const [adjustment, setAdjustment] = useState(0);

  const [directReason, setDirectReason] = useState("");
  const [directRefInvoiceId, setDirectRefInvoiceId] = useState("");
  const [directAmount, setDirectAmount] = useState("");
  const [directGstApplicable, setDirectGstApplicable] = useState(false);
  const [directGstPct, setDirectGstPct] = useState("18");

  const readOnly = isEdit && status === "cancelled";
  const isAgainstMode = noteType === "against_reference";
  const alreadyAdjustedNum = parseFloat(alreadyAdjusted) || 0;
  const customerLocked = isAgainstMode && Boolean(referencePreview);

  const invoiceOptions = useMemo(
    () =>
      invoices.map((inv) => ({
        value: String(inv.id),
        label: inv.invoiceNo,
        sub: `${inv.customerName} · ${inv.invoiceDate} · ${formatINR(inv.grandTotal)}`,
      })),
    [invoices],
  );

  const salesReturnOptions = useMemo(
    () =>
      salesReturns.map((ret) => ({
        value: ret.id,
        label: ret.returnNumber,
        sub: `${ret.customer} · ${ret.returnDate} · SO ${ret.salesOrderNumber}`,
      })),
    [salesReturns],
  );

  const selectedCustomer = customers.find((c) => c.id === Number(customerId));
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
      setLines(recalcAllCreditLines(pre.lineItems.map((l) => normalizeCreditLine(l)), preview.alreadyAdjustedAmount));
    } else {
      setLines([]);
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

  const clearReference = () => {
    setReferencePreview(null);
    setSourceInvoiceId(null);
    setSourceInvoiceNo("");
    setSourceOrderNo("");
    setSourceReturnId("");
    setSourceReturnNo("");
    setOriginalAmount("");
    setAlreadyAdjusted("0");
    setLines([]);
  };

  const onInvoiceSelect = (id: string) => {
    setReferenceInvoiceId(id);
    setReferenceReturnId("");
    setSourceReturnId("");
    setSourceReturnNo("");
    if (!id) {
      clearReference();
      return;
    }
    const preview = buildReferenceFromInvoice(Number(id));
    if (preview) {
      applyReferencePreview(preview);
      const c = customers.find((x) => x.id === preview.customerId);
      if (c) onCustomerChange(String(c.id), customerMasterToTransactionFields(c));
    }
  };

  const onSalesReturnSelect = (id: string) => {
    setReferenceReturnId(id);
    setReferenceInvoiceId("");
    if (!id) {
      clearReference();
      return;
    }
    const ret = salesReturns.find((r) => r.id === id);
    const preview = buildReferenceFromSalesReturn(id);
    if (preview && ret) {
      setSourceReturnId(ret.id);
      setSourceReturnNo(ret.returnNumber);
      applyReferencePreview(preview);
      const c = customers.find(
        (x) => x.id === preview.customerId || x.customerName === ret.customer,
      );
      if (c) onCustomerChange(String(c.id), customerMasterToTransactionFields(c));
    }
  };

  const onNoteTypeChange = (mode: CreditNoteCreationMode) => {
    setNoteType(mode);
    clearReference();
    setReferenceInvoiceId("");
    setReferenceReturnId("");
    setDirectAmount("");
    setDirectReason("");
    setDirectRefInvoiceId("");
    setDirectGstApplicable(false);
    setLines([]);
    setError(null);
  };

  useEffect(() => {
    if (isEdit) return;
    const invId = searchParams.get("invoiceId");
    if (!invId) return;
    setNoteType("against_reference");
    setReferenceDocType("sales_invoice");
    setReferenceInvoiceId(invId);
    onInvoiceSelect(invId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, searchParams]);

  useEffect(() => {
    if (!isEdit || creditNoteId == null) return;
    const rec = getCreditNoteById(creditNoteId);
    if (!rec) {
      router.replace(CREDIT_NOTES_LIST_PATH);
      return;
    }
    const isDirect =
      rec.source === "manual" && !rec.sourceInvoiceId && rec.lineItems.every((l) => l.invoiceQty <= 0);
    setNoteType(isDirect ? "direct_adjustment" : "against_reference");
    setCreditNoteNo(rec.creditNoteNo);
    setCreditNoteDate(rec.creditNoteDate);
    setCustomerId(rec.customerId ? String(rec.customerId) : "");
    setSourceInvoiceNo(rec.sourceInvoiceNo);
    setSourceOrderNo(rec.sourceOrderNo);
    setSourceInvoiceId(rec.sourceInvoiceId);
    setReferenceInvoiceId(rec.sourceInvoiceId ? String(rec.sourceInvoiceId) : "");
    setSourceReturnId(rec.sourceReturnId ?? "");
    setSourceReturnNo(rec.sourceReturnNo ?? "");
    if (rec.sourceReturnId) {
      setReferenceDocType("sales_return");
      setReferenceReturnId(rec.sourceReturnId);
    }
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
    setRemarks(rec.remarks);
    setStatus(rec.status);
    if (isDirect) {
      setDirectReason(rec.reason);
      const line = rec.lineItems[0];
      const base = line?.unitPrice ?? rec.currentCreditAmount;
      setDirectAmount(String(base));
      setDirectGstApplicable((line?.taxPct ?? 0) > 0);
      setDirectGstPct(String(line?.taxPct ?? 18));
      setDirectRefInvoiceId(rec.sourceInvoiceId ? String(rec.sourceInvoiceId) : "");
    } else {
      const loadedLines = rec.lineItems.length ? rec.lineItems.map((l) => normalizeCreditLine(l)) : [];
      setLines(recalcAllCreditLines(loadedLines, rec.alreadyAdjustedAmount));
      if (rec.sourceInvoiceId) {
        const p = buildReferenceFromInvoice(rec.sourceInvoiceId);
        if (p) setReferencePreview(p);
      }
    }
  }, [isEdit, creditNoteId, router, customers]);

  const directBase = parseFloat(directAmount) || 0;
  const directGst = directGstApplicable ? (directBase * (parseFloat(directGstPct) || 0)) / 100 : 0;
  const directTotal = Math.round((directBase + directGst) * 100) / 100;

  const subTotal = isAgainstMode
    ? lines.reduce((s, l) => s + l.creditAmount, 0)
    : directTotal;
  const grandTotal = Math.max(0, subTotal + (isAgainstMode ? adjustment : 0));
  const gstSplit = isAgainstMode
    ? computeCreditNoteGstSplit(lines)
    : {
        taxable: Math.round(directBase * 100) / 100,
        taxAmount: Math.round(directGst * 100) / 100,
        grandTotal,
      };
  const original = parseFloat(originalAmount) || grandTotal;

  const onCreditQtyChange = (lineId: string, qty: number) => {
    const line = lines.find((l) => l.id === lineId);
    const max = line ? getCreditLineMaxQty(line) : qty;
    const capped = Number.isFinite(max) ? Math.min(qty, max) : qty;
    setLines((prev) => applyReturnQtyToLines(prev, lineId, capped, alreadyAdjustedNum));
  };

  const resolveCustomerName = (): string => {
    if (selectedCustomer) return selectedCustomer.customerName;
    if (customerFields?.customerName) return customerFields.customerName;
    if (referencePreview?.customerName) return referencePreview.customerName;
    return "";
  };

  const buildDirectLineItems = (): CreditNoteLine[] => {
    if (directTotal <= 0) return [];
    return [
      normalizeCreditLine({
        ...createEmptyCreditLine(),
        productName: directReason || "Direct Adjustment",
        returnQty: 1,
        unitPrice: directBase,
        taxPct: directGstApplicable ? parseFloat(directGstPct) || 0 : 0,
        creditAmount: directTotal,
        gstAmount: directGst,
        lineAmount: directTotal,
      }),
    ];
  };

  const buildInput = (nextStatus: NoteWorkflowStatus) => {
    const isDirect = noteType === "direct_adjustment";
    const refInvId = isDirect && directRefInvoiceId ? Number(directRefInvoiceId) : sourceInvoiceId;
    const refInvNo =
      isDirect && directRefInvoiceId
        ? invoices.find((i) => i.id === Number(directRefInvoiceId))?.invoiceNo ?? ""
        : sourceInvoiceNo;

    return {
      creditNoteDate,
      customerId: customerId ? Number(customerId) : null,
      customerName: resolveCustomerName(),
      receivableLedger: customerLedgerName,
      billingAddress,
      shippingAddress,
      sourceInvoiceId: refInvId,
      sourceInvoiceNo: refInvNo,
      sourceOrderId: null,
      sourceOrderNo,
      originalAmount: isDirect ? directTotal : original,
      alreadyAdjustedAmount: isDirect ? 0 : alreadyAdjustedNum,
      lineItems: isDirect
        ? buildDirectLineItems()
        : lines.filter((l) => l.productName && l.returnQty > 0),
      reason: isDirect ? directReason || "Manual Adjustment" : referenceReturnId ? "Sales return" : "Sales return",
      remarks,
      status: nextStatus,
      source: (isDirect ? "manual" : referenceReturnId ? "sales_return" : "sales_return") as CreditNoteSource,
      sourceReturnId: referenceReturnId || sourceReturnId || undefined,
      sourceReturnNo: sourceReturnNo || undefined,
    };
  };

  const postNote = () => {
    setError(null);
    try {
      if (!resolveCustomerName().trim()) {
        setError("Select a customer before posting.");
        return;
      }
      if (noteType === "direct_adjustment") {
        if (!directReason.trim()) {
          setError("Select a reason for the direct adjustment.");
          return;
        }
        if (directTotal <= 0) {
          setError("Enter a valid adjustment amount.");
          return;
        }
      } else {
        if (!referencePreview) {
          setError("Select a sales invoice or sales return.");
          return;
        }
        validateCreditNoteLines(lines);
        if (grandTotal <= 0) {
          setError("Enter credit qty on at least one line.");
          return;
        }
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
    customerLedgerName,
    customerName: resolveCustomerName(),
    taxable: gstSplit.taxable,
    taxAmount: gstSplit.taxAmount,
    grandTotal,
    isSchemeSettlement: false,
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
        <div className="px-6 py-5 border-b border-border/60 space-y-4">
          <NoteTypeSelector
            value={noteType}
            options={NOTE_TYPE_OPTIONS}
            onChange={onNoteTypeChange}
            disabled={readOnly}
          />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Credit Note No.</Label>
              <Input className="h-9 text-xs font-mono bg-muted/20" disabled value={isEdit ? creditNoteNo : "Auto-generated"} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Credit Note Date</Label>
              <Input type="date" className="h-9 text-xs" value={creditNoteDate} onChange={(e) => setCreditNoteDate(e.target.value)} disabled={readOnly} />
            </div>
          </div>
        </div>

        {isAgainstMode ? (
          <>
            <div className="px-6 py-5 border-b border-border/60 space-y-3">
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { value: "sales_invoice" as const, label: "Sales Invoice" },
                    { value: "sales_return" as const, label: "Sales Return" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={readOnly}
                    onClick={() => {
                      setReferenceDocType(opt.value);
                      clearReference();
                      setReferenceInvoiceId("");
                      setReferenceReturnId("");
                    }}
                    className={cn(
                      "h-7 px-2.5 text-xs font-medium rounded-md border",
                      referenceDocType === opt.value
                        ? "border-brand-500 bg-brand-50 text-brand-800"
                        : "border-border text-muted-foreground hover:bg-muted/30",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {referenceDocType === "sales_invoice" ? (
                <SearchableSelect
                  label="Sales Invoice"
                  value={referenceInvoiceId}
                  onChange={onInvoiceSelect}
                  options={invoiceOptions}
                  placeholder="Select invoice…"
                  required
                  disabled={readOnly}
                />
              ) : (
                <SearchableSelect
                  label="Sales Return"
                  value={referenceReturnId}
                  onChange={onSalesReturnSelect}
                  options={salesReturnOptions}
                  placeholder="Select sales return…"
                  required
                  disabled={readOnly}
                />
              )}

              {referencePreview && (
                <p className="text-[11px] text-muted-foreground">
                  Invoice total {formatINR(referencePreview.originalAmount)} · Already credited{" "}
                  {formatINR(referencePreview.alreadyAdjustedAmount)}
                </p>
              )}
            </div>

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
                disabled={readOnly || customerLocked}
              />
            </div>

            <div className="px-6 py-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground">Product Lines</h3>
              {lines.length > 0 ? (
                <CreditNoteProductTable lines={lines} readOnly={readOnly} onQtyChange={onCreditQtyChange} />
              ) : (
                <p className="text-[13px] text-muted-foreground py-6 text-center border border-dashed border-border rounded-xl">
                  Select an invoice or sales return to load product lines.
                </p>
              )}

              {lines.length > 0 && (
                <div className="flex justify-end pt-2">
                  <div className="w-full sm:w-80 border border-border/60 rounded-lg p-4 bg-muted/5 space-y-2 text-[13px]">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sub Total</span>
                      <span className="tabular-nums font-medium">{formatINR(subTotal)}</span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-muted-foreground">Adjustment</span>
                      <AccountsMoneyInput
                        className="h-8 w-24 text-xs text-right tabular-nums ml-auto"
                        value={adjustment || ""}
                        onChange={(v) => setAdjustment(v)}
                        disabled={readOnly}
                      />
                    </div>
                    <div className="flex justify-between font-semibold pt-2 border-t border-border/60">
                      <span>Total</span>
                      <span className="tabular-nums text-brand-700">{formatINR(grandTotal)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="px-6 py-5 space-y-4">
            <DirectAdjustmentFields
              partyLabel="Customer"
              partySelector={
                <SearchableSelect
                  label=""
                  options={customers.map((c) => ({
                    value: String(c.id),
                    label: c.customerName,
                    sub: c.customerCode,
                  }))}
                  value={customerId}
                  onChange={(id) => {
                    const c = customers.find((x) => x.id === Number(id));
                    onCustomerChange(id, c ? customerMasterToTransactionFields(c) : null);
                  }}
                  placeholder="Select customer…"
                  required
                  disabled={readOnly}
                />
              }
              reason={directReason}
              onReasonChange={setDirectReason}
              reasonOptions={MANUAL_CREDIT_REASONS.map((r) => ({ value: r, label: r }))}
              referenceInvoiceValue={directRefInvoiceId}
              onReferenceInvoiceChange={setDirectRefInvoiceId}
              referenceInvoiceOptions={[{ value: "", label: "None" }, ...invoiceOptions]}
              amount={directAmount}
              onAmountChange={setDirectAmount}
              gstApplicable={directGstApplicable}
              onGstApplicableChange={setDirectGstApplicable}
              gstPct={directGstPct}
              onGstPctChange={setDirectGstPct}
              remarks={remarks}
              onRemarksChange={setRemarks}
              disabled={readOnly}
            />
            <div className="flex justify-end">
              <div className="w-full sm:w-72 border border-border/60 rounded-lg p-3 bg-muted/5 text-[13px] flex justify-between font-semibold">
                <span>Total Credit</span>
                <span className="tabular-nums text-brand-700">{formatINR(directTotal)}</span>
              </div>
            </div>
          </div>
        )}

        {grandTotal > 0 && (
          <div className="px-6 pb-4">
            <LedgerImpactPreview lines={impactLines} />
          </div>
        )}

        {error && <p className="px-6 pb-4 text-xs text-red-600">{error}</p>}
      </div>
    </AccountsFormLayout>
  );
}
