"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { Label } from "@/components/ui/label";
import { AccountsFormLayout } from "../expenses/components/AccountsFormLayout";
import { SearchableSelect } from "../credit-notes/components/SearchableSelect";
import { NoteTypeSelector } from "../credit-notes/components/NoteTypeSelector";
import { DirectAdjustmentFields } from "../credit-notes/components/DirectAdjustmentFields";
import { DebitNoteProductTable } from "./components/DebitNoteProductTable";
import {
  applyReturnQtyToDebitLines,
  buildReferenceFromPurchaseReturn,
  canUseStandaloneDebit,
  computeDebitTotals,
  createDebitNote,
  getDebitLineMaxQty,
  getDebitNoteById,
  getVendorsForDebitNote,
  listCreditablePurchaseInvoices,
  listPurchaseReturnsForDebitNote,
  MANUAL_DEBIT_REASONS,
  newDebitAttachmentId,
  normalizeDebitLine,
  previewToDebitForm,
  updateDebitNote,
  approveDebitNote,
  validateDebitNoteLines,
  type DebitNoteAttachment,
  type DebitNoteCreationMode,
  type DebitNoteLine,
  type DebitReferencePreview,
  type NoteWorkflowStatus,
} from "./debit-notes-data";
import { DEBIT_NOTES_BREADCRUMB, DEBIT_NOTES_LIST_PATH, formatINR } from "./note-utils";
import { LedgerImpactPreview } from "@/components/accounts/LedgerImpactPreview";
import { debitNoteImpactResolved } from "@/lib/accounts/resolved-impact-previews";
import { VendorMasterPanel } from "@/components/accounts/master-fetch/VendorMasterPanel";
import {
  vendorMasterToTransactionFields,
  type VendorTransactionFields,
} from "@/lib/accounts/transaction-master-fetch";
import { Download, Eye, Trash2, Upload } from "lucide-react";

const NOTE_TYPE_OPTIONS: { value: DebitNoteCreationMode; label: string }[] = [
  { value: "against_return", label: "Against Purchase Return (Quantity Based)" },
  { value: "direct_adjustment", label: "Direct Amount Adjustment" },
];

export default function DebitNoteFormPageClient({ debitNoteId }: { debitNoteId?: number }) {
  const router = useRouter();
  const isEdit = debitNoteId != null;
  const vendors = useMemo(() => getVendorsForDebitNote(), []);
  const purchaseReturns = useMemo(() => listPurchaseReturnsForDebitNote(), []);
  const invoices = useMemo(() => listCreditablePurchaseInvoices(), []);

  const [noteType, setNoteType] = useState<DebitNoteCreationMode>("against_return");
  const [debitNoteNo, setDebitNoteNo] = useState("");
  const [debitNoteDate, setDebitNoteDate] = useState(new Date().toISOString().slice(0, 10));
  const [vendorId, setVendorId] = useState("");
  const [vendorFields, setVendorFields] = useState<VendorTransactionFields | null>(null);
  const [billToId, setBillToId] = useState("");
  const [shipToId, setShipToId] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [referenceReturnId, setReferenceReturnId] = useState("");
  const [sourceReturnId, setSourceReturnId] = useState("");
  const [sourceReturnNo, setSourceReturnNo] = useState("");
  const [referencePreview, setReferencePreview] = useState<DebitReferencePreview | null>(null);
  const [sourceInvoiceId, setSourceInvoiceId] = useState<number | null>(null);
  const [sourcePoId, setSourcePoId] = useState<number | null>(null);
  const [originalAmount, setOriginalAmount] = useState("");
  const [alreadyAdjusted, setAlreadyAdjusted] = useState("0");
  const [lines, setLines] = useState<DebitNoteLine[]>([]);
  const [reason, setReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [attachments, setAttachments] = useState<DebitNoteAttachment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [directAmount, setDirectAmount] = useState("");
  const [directGstApplicable, setDirectGstApplicable] = useState(false);
  const [directGstPct, setDirectGstPct] = useState("18");
  const [directRefInvoiceId, setDirectRefInvoiceId] = useState("");

  const isAgainstMode = noteType === "against_return";
  const vendorLocked = isAgainstMode && Boolean(referencePreview);
  const alreadyAdjustedNum = parseFloat(alreadyAdjusted) || 0;

  const returnOptions = useMemo(
    () =>
      purchaseReturns.map((ret) => ({
        value: String(ret.id),
        label: ret.returnNumber,
        sub: `${ret.supplierName} · ${ret.poNumber} · ${ret.returnDate}`,
      })),
    [purchaseReturns],
  );

  const invoiceOptions = useMemo(
    () =>
      invoices.map((inv) => ({
        value: String(inv.id),
        label: inv.vendorInvoiceNo ? `${inv.vendorInvoiceNo} (${inv.invoiceNo})` : inv.invoiceNo,
        sub: `${inv.vendorName} · ${formatINR(inv.grandTotal)}`,
      })),
    [invoices],
  );

  const onVendorChange = (id: string, fields: VendorTransactionFields | null) => {
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

  const clearReference = () => {
    setReferenceReturnId("");
    setReferencePreview(null);
    setSourceInvoiceId(null);
    setSourcePoId(null);
    setSourceReturnId("");
    setSourceReturnNo("");
    setOriginalAmount("");
    setAlreadyAdjusted("0");
    setLines([]);
  };

  const applyPreview = (preview: DebitReferencePreview) => {
    setReferencePreview(preview);
    const pre = previewToDebitForm(preview);
    setSourceInvoiceId(pre.sourceInvoiceId ?? null);
    setSourcePoId(pre.sourcePoId ?? null);
    if (pre.vendorId) {
      const v = vendors.find((x) => x.id === pre.vendorId);
      if (v) onVendorChange(String(pre.vendorId), vendorMasterToTransactionFields(v));
      else setVendorId(String(pre.vendorId));
    }
    setOriginalAmount(String(pre.originalAmount ?? ""));
    setAlreadyAdjusted(String(pre.alreadyAdjustedAmount ?? 0));
    if (pre.lineItems?.length) {
      setLines(pre.lineItems.map((l) => normalizeDebitLine(l)));
    }
  };

  const onPurchaseReturnSelect = (id: string) => {
    setReferenceReturnId(id);
    if (!id) {
      clearReference();
      return;
    }
    const ret = purchaseReturns.find((r) => String(r.id) === id);
    const preview = buildReferenceFromPurchaseReturn(Number(id));
    if (preview && ret) {
      setSourceReturnId(String(ret.id));
      setSourceReturnNo(ret.returnNumber);
      applyPreview(preview);
    }
  };

  const onNoteTypeChange = (mode: DebitNoteCreationMode) => {
    if (mode === "direct_adjustment" && !canUseStandaloneDebit()) return;
    setNoteType(mode);
    clearReference();
    setDirectAmount("");
    setReason("");
    setDirectRefInvoiceId("");
    setDirectGstApplicable(false);
    setError(null);
  };

  useEffect(() => {
    if (!isEdit || debitNoteId == null) return;
    const rec = getDebitNoteById(debitNoteId);
    if (!rec) {
      router.replace(DEBIT_NOTES_LIST_PATH);
      return;
    }
    const isDirect = rec.againstType === "standalone_adjustment";
    setNoteType(isDirect ? "direct_adjustment" : "against_return");
    setDebitNoteNo(rec.debitNoteNo);
    setDebitNoteDate(rec.debitNoteDate);
    setVendorId(rec.vendorId ? String(rec.vendorId) : "");
    if (rec.vendorId) {
      const v = vendors.find((x) => x.id === rec.vendorId);
      if (v) onVendorChange(String(rec.vendorId), vendorMasterToTransactionFields(v));
    }
    setSourceInvoiceId(rec.sourceInvoiceId);
    setSourcePoId(rec.sourcePoId);
    setSourceReturnId(rec.sourceReturnId ?? "");
    setSourceReturnNo(rec.sourceReturnNo ?? "");
    if (rec.sourceReturnId) setReferenceReturnId(rec.sourceReturnId);
    setOriginalAmount(String(rec.originalAmount));
    setAlreadyAdjusted(String(rec.alreadyAdjustedAmount));
    setReason(rec.reason);
    setRemarks(rec.remarks);
    setAttachments(rec.attachments ?? []);
    if (isDirect) {
      setDirectAmount(String(rec.standaloneDebitAmount || rec.currentDebitAmount));
      setDirectRefInvoiceId(rec.sourceInvoiceId ? String(rec.sourceInvoiceId) : "");
    } else {
      setLines(rec.lineItems.map((l) => normalizeDebitLine(l)));
      if (rec.sourceReturnId) {
        const p = buildReferenceFromPurchaseReturn(Number(rec.sourceReturnId));
        if (p) setReferencePreview(p);
      }
    }
  }, [isEdit, debitNoteId, router, vendors]);

  const directBase = parseFloat(directAmount) || 0;
  const directGst = directGstApplicable ? (directBase * (parseFloat(directGstPct) || 0)) / 100 : 0;
  const directTotal = Math.round((directBase + directGst) * 100) / 100;

  const lineTotals = useMemo(() => computeDebitTotals(lines), [lines]);
  const totalDebit = isAgainstMode ? lineTotals.total : directTotal;
  const original = parseFloat(originalAmount) || totalDebit;

  const onDebitQtyChange = (lineId: string, qty: number) => {
    const line = lines.find((l) => l.id === lineId);
    const max = line ? getDebitLineMaxQty(line) : qty;
    const capped = Number.isFinite(max) ? Math.min(qty, max) : qty;
    setLines((prev) => applyReturnQtyToDebitLines(prev, lineId, capped, alreadyAdjustedNum));
  };

  const resolveVendorName = (): string => {
    const v = vendors.find((x) => x.id === Number(vendorId));
    if (v) return v.vendorName;
    if (referencePreview?.vendorName) return referencePreview.vendorName;
    return "";
  };

  const buildInput = (status: NoteWorkflowStatus) => ({
    debitNoteDate,
    againstType: isAgainstMode ? ("purchase_invoice" as const) : ("standalone_adjustment" as const),
    vendorId: vendorId ? Number(vendorId) : null,
    vendorName: resolveVendorName(),
    sourceInvoiceId: isAgainstMode ? sourceInvoiceId : directRefInvoiceId ? Number(directRefInvoiceId) : null,
    sourceInvoiceNo: referencePreview?.sourceInvoiceNo ?? "",
    sourcePoId: sourcePoId ?? referencePreview?.sourcePoId ?? null,
    sourcePoNo: referencePreview?.sourcePoNo ?? "",
    sourceGrnNo: referencePreview?.sourceGrnNo ?? "",
    sourceQcNo: referencePreview?.sourceQcNo ?? "",
    originalAmount: isAgainstMode ? original : directTotal,
    alreadyAdjustedAmount: isAgainstMode ? alreadyAdjustedNum : 0,
    standaloneDebitAmount: isAgainstMode ? 0 : directTotal,
    lineItems: isAgainstMode ? lines.filter((l) => l.productName && l.returnQty > 0) : [],
    reason,
    remarks,
    attachments,
    status,
    source: isAgainstMode && sourceReturnNo ? ("purchase_return" as const) : ("manual" as const),
    sourceReturnId: sourceReturnId || undefined,
    sourceReturnNo: sourceReturnNo || undefined,
  });

  const handleFile = (file: File, documentName: string) => {
    const reader = new FileReader();
    reader.onload = () => {
      setAttachments((prev) => [
        ...prev,
        {
          id: newDebitAttachmentId(),
          documentName: documentName.trim() || file.name,
          fileName: file.name,
          dataUrl: reader.result as string,
          uploadedAt: new Date().toISOString(),
        },
      ]);
    };
    reader.readAsDataURL(file);
  };

  const postNote = () => {
    setError(null);
    try {
      if (!resolveVendorName().trim()) {
        setError("Select a supplier before posting.");
        return;
      }
      if (!reason.trim()) {
        setError("Select a reason before posting.");
        return;
      }
      if (isAgainstMode) {
        if (!referencePreview) {
          setError("Select a purchase return.");
          return;
        }
        validateDebitNoteLines(lines);
        if (totalDebit <= 0) {
          setError("Enter debit qty on at least one line.");
          return;
        }
      } else if (directTotal <= 0) {
        setError("Enter a valid debit amount.");
        return;
      }
      if (isEdit && debitNoteId != null) {
        updateDebitNote(debitNoteId, buildInput("draft"));
        approveDebitNote(debitNoteId);
        router.push(`${DEBIT_NOTES_LIST_PATH}/${debitNoteId}`);
      } else {
        const rec = createDebitNote(buildInput("draft"));
        approveDebitNote(rec.id);
        router.push(`${DEBIT_NOTES_LIST_PATH}/${rec.id}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not post debit note.");
    }
  };

  const noteOptions = canUseStandaloneDebit()
    ? NOTE_TYPE_OPTIONS
    : NOTE_TYPE_OPTIONS.filter((o) => o.value === "against_return");

  return (
    <AccountsFormLayout
      title={isEdit ? "Edit Debit Note" : "Create Debit Note"}
      breadcrumb={[...DEBIT_NOTES_BREADCRUMB]}
      code={debitNoteNo || undefined}
      footer={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="h-9 text-[13px] font-medium" onClick={() => router.push(DEBIT_NOTES_LIST_PATH)}>
            Cancel
          </Button>
          <Button size="sm" className="h-9 text-[13px] font-medium bg-brand-600 hover:bg-brand-700 text-white" onClick={postNote}>
            Post Debit Note
          </Button>
        </div>
      }
    >
      <div className="space-y-4 pb-8 w-full">
        <div className="bg-white border border-border/60 rounded-lg shadow-sm">
          <div className="px-6 py-5 border-b border-border/60 space-y-4">
            <NoteTypeSelector value={noteType} options={noteOptions} onChange={onNoteTypeChange} />

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Debit Note No.</Label>
                <Input className="h-9 text-[13px] font-mono bg-muted/30" disabled value={isEdit ? debitNoteNo : "Auto-generated"} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Debit Note Date</Label>
                <Input type="date" className="h-9 text-[13px]" value={debitNoteDate} onChange={(e) => setDebitNoteDate(e.target.value)} />
              </div>
            </div>
          </div>

          {isAgainstMode ? (
            <>
              <div className="px-6 py-5 border-b border-border/60 space-y-3">
                <SearchableSelect
                  label="Purchase Return"
                  value={referenceReturnId}
                  onChange={onPurchaseReturnSelect}
                  options={returnOptions}
                  placeholder="Select purchase return…"
                  required
                />
                {referencePreview && (
                  <p className="text-[11px] text-muted-foreground">
                    PO {referencePreview.sourcePoNo} · Invoice {referencePreview.sourceInvoiceNo || "—"} ·{" "}
                    {formatINR(referencePreview.originalAmount)}
                  </p>
                )}
              </div>

              <div className="px-6 py-5 border-b border-border/60">
                <VendorMasterPanel
                  vendors={vendors}
                  vendorId={vendorId}
                  onVendorIdChange={onVendorChange}
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
                  disabled={vendorLocked}
                />
              </div>

              <div className="px-6 py-4 space-y-3">
                <SearchableSelect
                  label="Reason"
                  value={reason}
                  onChange={setReason}
                  options={MANUAL_DEBIT_REASONS.map((r) => ({ value: r, label: r }))}
                  placeholder="Select reason…"
                  required
                />

                <h3 className="text-xs font-semibold uppercase text-muted-foreground pt-1">Product Lines</h3>
                {lines.length > 0 ? (
                  <DebitNoteProductTable lines={lines} onQtyChange={onDebitQtyChange} />
                ) : (
                  <p className="text-[13px] text-muted-foreground py-6 text-center border border-dashed border-border rounded-xl">
                    Select a purchase return to load product lines.
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="px-6 py-5 space-y-4">
              <DirectAdjustmentFields
                partyLabel="Supplier"
                partySelector={
                  <SearchableSelect
                    label=""
                    options={vendors.map((v) => ({
                      value: String(v.id),
                      label: v.vendorName,
                      sub: v.vendorCode,
                    }))}
                    value={vendorId}
                    onChange={(id) => {
                      const v = vendors.find((x) => x.id === Number(id));
                      onVendorChange(id, v ? vendorMasterToTransactionFields(v) : null);
                    }}
                    placeholder="Select supplier…"
                    required
                  />
                }
                reason={reason}
                onReasonChange={setReason}
                reasonOptions={MANUAL_DEBIT_REASONS.map((r) => ({ value: r, label: r }))}
                referenceInvoiceLabel="Reference Purchase Invoice (Optional)"
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
              />
              <div className="flex justify-end">
                <div className="w-full sm:w-72 border border-border/60 rounded-lg p-3 bg-muted/5 text-[13px] flex justify-between font-semibold">
                  <span>Total Debit</span>
                  <span className="tabular-nums text-brand-700">{formatINR(directTotal)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="px-6 py-4 border-t border-border/60 space-y-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Attachments</p>
            <div className="flex flex-wrap gap-2 items-end">
              <div className="space-y-1 flex-1 min-w-[140px]">
                <Label className="text-xs">Document Name</Label>
                <Input id="dn-doc-name" className="h-9 text-[13px]" placeholder="e.g. Return proof" />
              </div>
              <label className="inline-flex items-center gap-1.5 h-8 px-3 text-xs border rounded-lg cursor-pointer hover:bg-muted/40">
                <Upload className="w-4 h-4" /> Upload
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const name = (document.getElementById("dn-doc-name") as HTMLInputElement)?.value;
                    handleFile(f, name);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            {attachments.length > 0 && (
              <div className="space-y-1.5">
                {attachments.map((att) => (
                  <div key={att.id} className="flex items-center gap-2 py-1.5 px-2 border rounded text-xs">
                    <span className="font-medium">{att.documentName}</span>
                    <span className="text-muted-foreground flex-1">{att.fileName}</span>
                    {att.dataUrl && (
                      <>
                        <button type="button" className="p-1 hover:bg-muted rounded" onClick={() => window.open(att.dataUrl, "_blank")}>
                          <Eye className="w-4 h-4" />
                        </button>
                        <a href={att.dataUrl} download={att.fileName} className="p-1 hover:bg-muted rounded">
                          <Download className="w-4 h-4" />
                        </a>
                      </>
                    )}
                    <button type="button" className="p-1 hover:bg-red-50 text-red-600 rounded" onClick={() => setAttachments((p) => p.filter((a) => a.id !== att.id))}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="px-6 pb-4 text-xs text-red-600">{error}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-border/60 bg-white p-4 space-y-2 text-[13px]">
            <h2 className="text-xs font-semibold uppercase text-muted-foreground">Summary</h2>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Taxable Amount</span>
              <span className="tabular-nums">{formatINR(isAgainstMode ? lineTotals.taxableAmount : directBase)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">GST Amount</span>
              <span className="tabular-nums">{formatINR(isAgainstMode ? lineTotals.gstAmount : directGst)}</span>
            </div>
            <div className="flex justify-between font-semibold text-brand-700 pt-2 border-t">
              <span>Total Debit</span>
              <span className="tabular-nums">{formatINR(totalDebit)}</span>
            </div>
            {isAgainstMode && original > 0 && (
              <div className="flex justify-between text-muted-foreground pt-1">
                <span>Balance After</span>
                <span className="tabular-nums">{formatINR(Math.max(0, original - alreadyAdjustedNum - totalDebit))}</span>
              </div>
            )}
          </div>
          <LedgerImpactPreview
            lines={debitNoteImpactResolved({
              vendorName: resolveVendorName() || "Supplier",
              taxable: isAgainstMode ? lineTotals.taxableAmount : directBase,
              taxAmount: isAgainstMode ? lineTotals.gstAmount : directGst,
              grandTotal: totalDebit,
            })}
          />
        </div>
      </div>
    </AccountsFormLayout>
  );
}
