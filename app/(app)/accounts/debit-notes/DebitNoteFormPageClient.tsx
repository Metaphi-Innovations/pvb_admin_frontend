"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFormDirtySnapshot } from "@/lib/accounts/use-form-dirty-snapshot";
import { useTransactionFormCancel } from "@/components/accounts/TransactionFormCancel";
import { AccountsFormLayout } from "../expenses/components/AccountsFormLayout";
import { SearchableSelect } from "../credit-notes/components/SearchableSelect";
import { DebitNoteProductTable } from "./components/DebitNoteProductTable";
import { FreshDebitNoteForm, computeFreshDebitTotals } from "./components/FreshDebitNoteForm";
import {
  applyReturnQtyToDebitLines,
  buildReferenceFromPurchaseInvoice,
  buildReferenceFromPurchaseReturn,
  computeDebitTotals,
  createDebitNote,
  DEBIT_REASONS,
  getDebitNoteById,
  getDebitLineMaxQty,
  getPendingDebitNoteRow,
  getVendorsForDebitNote,
  newDebitAttachmentId,
  normalizeDebitLine,
  postDebitNoteRecord,
  previewToDebitForm,
  updateDebitNote,
  validateDebitNoteLines,
  type DebitNoteAttachment,
  type DebitNoteLine,
  type DebitReferencePreview,
  type NoteWorkflowStatus,
} from "./debit-notes-data";
import { DEBIT_NOTES_BREADCRUMB, DEBIT_NOTES_LIST_PATH, formatINR } from "./note-utils";
import { dispatchAccountsDataChanged } from "@/lib/accounts/accounts-data-events";
import { AccountsToast, useAccountsToast } from "@/components/accounts/AccountsToast";
import { AccountsDateInput } from "@/components/accounts/AccountsDateInput";
import { LedgerImpactPreview } from "@/components/accounts/LedgerImpactPreview";
import { debitNoteImpactResolved } from "@/lib/accounts/resolved-impact-previews";
import { VendorMasterPanel } from "@/components/accounts/master-fetch/VendorMasterPanel";
import {
  vendorMasterToTransactionFields,
  type VendorTransactionFields,
} from "@/lib/accounts/transaction-master-fetch";
import { Download, Eye, Save, Trash2, Upload } from "lucide-react";

type FormMode = "fresh" | "return" | "purchase_invoice";

export default function DebitNoteFormPageClient({
  debitNoteId,
  returnId,
  purchaseInvoiceId,
  mode,
}: {
  debitNoteId?: number;
  returnId?: number;
  purchaseInvoiceId?: number;
  mode?: FormMode;
}) {
  const router = useRouter();
  const { toast, showToast, dismissToast } = useAccountsToast();
  const isEdit = debitNoteId != null;
  const isFresh = !isEdit && mode === "fresh";
  const isReturn = !isEdit && (mode === "return" || returnId != null);
  const isPurchaseInvoice =
    !isEdit && (mode === "purchase_invoice" || purchaseInvoiceId != null);

  const vendors = useMemo(() => getVendorsForDebitNote(), []);

  const [debitNoteNo, setDebitNoteNo] = useState("");
  const [debitNoteDate, setDebitNoteDate] = useState(new Date().toISOString().slice(0, 10));
  const [vendorId, setVendorId] = useState("");
  const [vendorFields, setVendorFields] = useState<VendorTransactionFields | null>(null);
  const [billToId, setBillToId] = useState("");
  const [shipToId, setShipToId] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [referencePreview, setReferencePreview] = useState<DebitReferencePreview | null>(null);
  const [sourceInvoiceId, setSourceInvoiceId] = useState<number | null>(null);
  const [sourcePoId, setSourcePoId] = useState<number | null>(null);
  const [sourceReturnId, setSourceReturnId] = useState("");
  const [sourceReturnNo, setSourceReturnNo] = useState("");
  const [sourcePackingNo, setSourcePackingNo] = useState("");
  const [sourceDispatchNo, setSourceDispatchNo] = useState("");
  const [originalAmount, setOriginalAmount] = useState("");
  const [alreadyAdjusted, setAlreadyAdjusted] = useState("0");
  const [lines, setLines] = useState<DebitNoteLine[]>([]);
  const [reason, setReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [attachments, setAttachments] = useState<DebitNoteAttachment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [referenceNo, setReferenceNo] = useState("");
  const [adjustmentLedgerId, setAdjustmentLedgerId] = useState<number | null>(null);
  const [adjustmentLedgerName, setAdjustmentLedgerName] = useState("");
  const [taxableAmount, setTaxableAmount] = useState("");
  const [gstApplicable, setGstApplicable] = useState(false);
  const [gstPct, setGstPct] = useState("18");
  const [narration, setNarration] = useState("");

  const vendorLocked = (isReturn || isPurchaseInvoice) && Boolean(referencePreview);
  const alreadyAdjustedNum = parseFloat(alreadyAdjusted) || 0;

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

  const applyPreview = (preview: DebitReferencePreview, retId: number, retNo: string) => {
    setReferencePreview(preview);
    const pre = previewToDebitForm(preview);
    setSourceInvoiceId(pre.sourceInvoiceId ?? null);
    setSourcePoId(pre.sourcePoId ?? null);
    setSourceReturnId(String(retId));
    setSourceReturnNo(retNo);
    setSourcePackingNo(preview.sourcePackingNo ?? "");
    setSourceDispatchNo(preview.sourceDispatchNo ?? "");
    if (pre.vendorId) {
      const v = vendors.find((x) => x.id === pre.vendorId);
      if (v) onVendorChange(String(pre.vendorId), vendorMasterToTransactionFields(v));
      else setVendorId(String(pre.vendorId));
    }
    setOriginalAmount(String(pre.originalAmount ?? ""));
    setAlreadyAdjusted(String(pre.alreadyAdjustedAmount ?? 0));
    setReason("Purchase Return");
    setRemarks(preview.dispatchStatus ? `Dispatch: ${preview.dispatchStatus}` : "");
    if (pre.lineItems?.length) {
      const withQty = pre.lineItems.map((l) => {
        const normalized = normalizeDebitLine(l);
        const qty = normalized.eligibleReturnQty ?? normalized.purchaseReturnQty ?? 0;
        return applyReturnQtyToDebitLines([normalized], normalized.id, qty, alreadyAdjustedNum)[0];
      });
      setLines(withQty);
    }
  };

  const applyPurchaseInvoicePreview = (preview: DebitReferencePreview, invoiceId: number) => {
    setReferencePreview(preview);
    const pre = previewToDebitForm(preview);
    setSourceInvoiceId(pre.sourceInvoiceId ?? invoiceId);
    setSourcePoId(pre.sourcePoId ?? null);
    setSourceReturnId("");
    setSourceReturnNo("");
    setSourcePackingNo(preview.sourcePackingNo ?? "");
    setSourceDispatchNo(preview.sourceDispatchNo ?? "");
    if (pre.vendorId) {
      const v = vendors.find((x) => x.id === pre.vendorId);
      if (v) onVendorChange(String(pre.vendorId), vendorMasterToTransactionFields(v));
      else setVendorId(String(pre.vendorId));
    }
    setOriginalAmount(String(pre.originalAmount ?? ""));
    setAlreadyAdjusted(String(pre.alreadyAdjustedAmount ?? 0));
    setReason("Purchase Invoice Adjustment");
    setRemarks(`Against PI ${preview.sourceInvoiceNo ?? invoiceId}`);
    if (pre.lineItems?.length) {
      setLines(pre.lineItems.map((l) => normalizeDebitLine(l)));
    }
  };

  useEffect(() => {
    if (!isReturn || returnId == null || isEdit) return;
    const pending = getPendingDebitNoteRow(returnId);
    const preview = buildReferenceFromPurchaseReturn(returnId);
    if (preview && pending) {
      applyPreview(preview, returnId, pending.returnNumber);
    } else if (preview) {
      applyPreview(preview, returnId, `PRET-${returnId}`);
    }
  }, [isReturn, returnId, isEdit, vendors]);

  useEffect(() => {
    if (!isPurchaseInvoice || purchaseInvoiceId == null || isEdit) return;
    const preview = buildReferenceFromPurchaseInvoice(purchaseInvoiceId);
    if (preview) {
      applyPurchaseInvoicePreview(preview, purchaseInvoiceId);
    }
  }, [isPurchaseInvoice, purchaseInvoiceId, isEdit, vendors]);

  useEffect(() => {
    if (!isEdit || debitNoteId == null) return;
    const rec = getDebitNoteById(debitNoteId);
    if (!rec) {
      router.replace(DEBIT_NOTES_LIST_PATH);
      return;
    }
    const fresh = rec.againstType === "standalone_adjustment";
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
    setSourcePackingNo(rec.sourcePackingNo ?? "");
    setSourceDispatchNo(rec.sourceDispatchNo ?? "");
    setOriginalAmount(String(rec.originalAmount));
    setAlreadyAdjusted(String(rec.alreadyAdjustedAmount));
    setReason(rec.reason);
    setRemarks(rec.remarks);
    setAttachments(rec.attachments ?? []);
    if (fresh) {
      setReferenceNo(rec.referenceNo ?? "");
      setAdjustmentLedgerId(rec.adjustmentLedgerId ?? null);
      setAdjustmentLedgerName(rec.adjustmentLedgerName ?? "");
      setTaxableAmount(String(rec.taxableAmount || rec.standaloneDebitAmount));
      setGstApplicable((rec.gstAmount ?? 0) > 0);
      setGstPct(String(rec.freshGstPct ?? 18));
      setNarration(rec.remarks);
    } else {
      setLines(rec.lineItems.map((l) => normalizeDebitLine(l)));
      if (rec.sourceReturnId) {
        const p = buildReferenceFromPurchaseReturn(Number(rec.sourceReturnId));
        if (p) setReferencePreview(p);
      }
    }
  }, [isEdit, debitNoteId, router, vendors]);

  const freshTotals = computeFreshDebitTotals(taxableAmount, gstApplicable, gstPct);
  const lineTotals = useMemo(() => computeDebitTotals(lines), [lines]);
  const totalDebit = isFresh ? freshTotals.total : lineTotals.total;

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

  const buildInput = (status: NoteWorkflowStatus) => {
    if (isFresh) {
      return {
        debitNoteDate,
        againstType: "standalone_adjustment" as const,
        vendorId: vendorId ? Number(vendorId) : null,
        vendorName: resolveVendorName(),
        sourceInvoiceId: null,
        sourceInvoiceNo: "",
        sourcePoId: null,
        sourcePoNo: "",
        sourceGrnNo: "",
        sourceQcNo: "",
        originalAmount: freshTotals.total,
        alreadyAdjustedAmount: 0,
        standaloneDebitAmount: freshTotals.total,
        taxableAmount: freshTotals.taxable,
        gstAmount: freshTotals.gstAmount,
        freshGstPct: gstApplicable ? freshTotals.rate : 0,
        lineItems: [] as DebitNoteLine[],
        reason,
        remarks: narration || remarks,
        referenceNo,
        adjustmentLedgerId,
        adjustmentLedgerName,
        attachments,
        status,
        source: "manual" as const,
      };
    }

    return {
      debitNoteDate,
      againstType: "purchase_invoice" as const,
      vendorId: vendorId ? Number(vendorId) : null,
      vendorName: resolveVendorName(),
      sourceInvoiceId,
      sourceInvoiceNo: referencePreview?.sourceInvoiceNo ?? "",
      sourcePoId: sourcePoId ?? referencePreview?.sourcePoId ?? null,
      sourcePoNo: referencePreview?.sourcePoNo ?? "",
      sourceGrnNo: referencePreview?.sourceGrnNo ?? "",
      sourceQcNo: referencePreview?.sourceQcNo ?? "",
      sourcePackingNo,
      sourceDispatchNo,
      originalAmount: parseFloat(originalAmount) || totalDebit,
      alreadyAdjustedAmount: alreadyAdjustedNum,
      standaloneDebitAmount: 0,
      lineItems: lines.filter((l) => l.productName && l.returnQty > 0),
      reason,
      remarks,
      attachments,
      status,
      source: "purchase_return" as const,
      sourceReturnId: sourceReturnId || undefined,
      sourceReturnNo: sourceReturnNo || undefined,
    };
  };

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

  const validateForm = (): boolean => {
    if (!resolveVendorName().trim()) {
      setError("Select a supplier before saving.");
      return false;
    }
    if (!reason.trim()) {
      setError("Select a reason / adjustment type.");
      return false;
    }
    if (isFresh) {
      if (!adjustmentLedgerId) {
        setError("Select an adjustment ledger.");
        return false;
      }
      if (freshTotals.total <= 0) {
        setError("Enter a valid debit amount.");
        return false;
      }
    } else {
      if (!referencePreview) {
        setError(isPurchaseInvoice ? "Purchase invoice reference is missing." : "Purchase return reference is missing.");
        return false;
      }
      validateDebitNoteLines(lines);
      if (totalDebit <= 0) {
        setError("Enter debit qty on at least one line.");
        return false;
      }
    }
    return true;
  };

  const saveDraft = (redirect: "view" | "list" = "view") => {
    setError(null);
    try {
      if (!validateForm()) return;
      if (isEdit && debitNoteId != null) {
        updateDebitNote(debitNoteId, buildInput("draft"));
        dispatchAccountsDataChanged("debit-notes");
        showToast("Debit note saved as draft");
        router.push(redirect === "list" ? DEBIT_NOTES_LIST_PATH : `${DEBIT_NOTES_LIST_PATH}/${debitNoteId}`);
      } else {
        const rec = createDebitNote(buildInput("draft"));
        dispatchAccountsDataChanged("debit-notes");
        showToast("Debit note saved as draft");
        router.push(redirect === "list" ? DEBIT_NOTES_LIST_PATH : `${DEBIT_NOTES_LIST_PATH}/${rec.id}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save debit note.");
    }
  };

  const postNote = (redirect: "view" | "list" = "view") => {
    setError(null);
    try {
      if (!validateForm()) return;
      let id = debitNoteId;
      if (isEdit && debitNoteId != null) {
        updateDebitNote(debitNoteId, buildInput("draft"));
      } else {
        const rec = createDebitNote(buildInput("draft"));
        id = rec.id;
      }
      if (id != null) {
        postDebitNoteRecord(id);
        dispatchAccountsDataChanged("debit-notes");
        showToast("Debit note posted successfully");
        router.push(redirect === "list" ? DEBIT_NOTES_LIST_PATH : `${DEBIT_NOTES_LIST_PATH}/${id}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not post debit note.");
    }
  };

  const title = isEdit
    ? "Edit Debit Note"
    : isFresh
      ? "Create Debit Note"
      : isPurchaseInvoice
        ? "Create Debit Note from Purchase Invoice"
        : "Create Debit Note from Purchase Return";

  const [baselineReady, setBaselineReady] = useState(false);
  useEffect(() => {
    setBaselineReady(false);
    const id = window.setTimeout(() => setBaselineReady(true), 350);
    return () => window.clearTimeout(id);
  }, [debitNoteId, isFresh, returnId]);

  const formSnapshot = useMemo(
    () => ({
      debitNoteDate,
      vendorId,
      lines,
      remarks,
      reason,
      referenceNo,
      taxableAmount,
      gstApplicable,
      gstPct,
      narration,
      attachments,
      adjustmentLedgerId,
    }),
    [
      debitNoteDate,
      vendorId,
      lines,
      remarks,
      reason,
      referenceNo,
      taxableAmount,
      gstApplicable,
      gstPct,
      narration,
      attachments,
      adjustmentLedgerId,
    ],
  );
  const isDirty = useFormDirtySnapshot(formSnapshot, { ready: baselineReady });
  const { requestCancel, discardDialog } = useTransactionFormCancel({
    listHref: DEBIT_NOTES_LIST_PATH,
    isDirty,
  });

  return (
    <>
    <AccountsFormLayout
      onBackClick={requestCancel}
      title={title}
      breadcrumb={[...DEBIT_NOTES_BREADCRUMB]}
      code={debitNoteNo || undefined}
      footer={
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 text-sm font-medium"
            onClick={requestCancel}
          >
            Cancel
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => saveDraft("view")}>
            <Save className="w-3.5 h-3.5" /> Save & View
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => saveDraft("list")}>
            Save & Back to List
          </Button>
          <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white" onClick={() => postNote("view")}>
            Post Debit Note
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => postNote("list")}>
            Post & Back to List
          </Button>
        </div>
      }
    >
      <div className="space-y-4 pb-8 w-full">
        <div className="bg-white border border-border/60 rounded-lg shadow-sm">
          <div className="px-6 py-5 border-b border-border/60">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Debit Note No.</Label>
                <Input className="h-9 text-sm font-mono bg-muted/30" disabled value={isEdit ? debitNoteNo : "Auto-generated"} />
              </div>
              {!isFresh && (
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Debit Note Date</Label>
                  <AccountsDateInput
                    value={debitNoteDate}
                    onChange={setDebitNoteDate}
                    aria-label="Debit note date"
                    className="h-9 text-sm"
                  />
                </div>
              )}
            </div>
          </div>

          {isFresh ? (
            <div className="px-6 py-5">
              <FreshDebitNoteForm
                vendorSelector={
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
                debitNoteDate={debitNoteDate}
                onDebitNoteDateChange={setDebitNoteDate}
                reason={reason}
                onReasonChange={setReason}
                referenceNo={referenceNo}
                onReferenceNoChange={setReferenceNo}
                adjustmentLedgerId={adjustmentLedgerId}
                adjustmentLedgerName={adjustmentLedgerName}
                onAdjustmentLedgerChange={(l) => {
                  setAdjustmentLedgerId(l.id);
                  setAdjustmentLedgerName(l.accountName);
                }}
                taxableAmount={taxableAmount}
                onTaxableAmountChange={setTaxableAmount}
                gstPct={gstPct}
                onGstPctChange={setGstPct}
                gstApplicable={gstApplicable}
                onGstApplicableChange={setGstApplicable}
                narration={narration}
                onNarrationChange={setNarration}
              />
            </div>
          ) : (
            <>
              {referencePreview && (
                <div className="px-6 py-4 border-b border-border/60 bg-muted/10">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Purchase Return Reference</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div><span className="text-muted-foreground">Return No.</span><p className="font-mono font-medium">{sourceReturnNo}</p></div>
                    <div><span className="text-muted-foreground">PO No.</span><p className="font-mono font-medium">{referencePreview.sourcePoNo}</p></div>
                    <div><span className="text-muted-foreground">GRN No.</span><p className="font-mono font-medium">{referencePreview.sourceGrnNo || "—"}</p></div>
                    <div><span className="text-muted-foreground">Dispatch</span><p className="font-mono font-medium">{sourceDispatchNo || sourcePackingNo || "—"}</p></div>
                    <div><span className="text-muted-foreground">Invoice</span><p className="font-mono font-medium">{referencePreview.sourceInvoiceNo || "—"}</p></div>
                    <div><span className="text-muted-foreground">Dispatch Status</span><p className="font-medium">{referencePreview.dispatchStatus || "—"}</p></div>
                  </div>
                </div>
              )}

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
                  options={DEBIT_REASONS.map((r) => ({ value: r, label: r }))}
                  placeholder="Select reason…"
                  required
                />

                <h3 className="text-xs font-semibold uppercase text-muted-foreground pt-1">Product Lines</h3>
                {lines.length > 0 ? (
                  <DebitNoteProductTable lines={lines} onQtyChange={onDebitQtyChange} />
                ) : (
                  <p className="text-xs text-muted-foreground py-6 text-center border border-dashed border-border rounded-xl">
                    Loading purchase return lines…
                  </p>
                )}
              </div>
            </>
          )}

          <div className="px-6 py-4 border-t border-border/60 space-y-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Attachments (Optional)</p>
            <div className="flex flex-wrap gap-2 items-end">
              <div className="space-y-1 flex-1 min-w-[140px]">
                <Label className="text-xs">Document Name</Label>
                <Input id="dn-doc-name" className="h-9 text-sm" placeholder="e.g. Supplier memo" />
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
          <div className="rounded-lg border border-border/60 bg-white p-4 space-y-2 text-xs">
            <h2 className="text-xs font-semibold uppercase text-muted-foreground">Summary</h2>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Taxable Amount</span>
              <span className="tabular-nums">{formatINR(isFresh ? freshTotals.taxable : lineTotals.taxableAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">GST Amount</span>
              <span className="tabular-nums">{formatINR(isFresh ? freshTotals.gstAmount : lineTotals.gstAmount)}</span>
            </div>
            <div className="flex justify-between font-semibold text-brand-700 pt-2 border-t">
              <span>Total Debit</span>
              <span className="tabular-nums">{formatINR(totalDebit)}</span>
            </div>
          </div>
          <LedgerImpactPreview
            lines={debitNoteImpactResolved({
              vendorName: resolveVendorName() || "Supplier",
              taxable: isFresh ? freshTotals.taxable : lineTotals.taxableAmount,
              taxAmount: isFresh ? freshTotals.gstAmount : lineTotals.gstAmount,
              grandTotal: totalDebit,
              adjustmentLedgerName: isFresh ? adjustmentLedgerName : undefined,
            })}
          />
        </div>
      </div>
    </AccountsFormLayout>
    {discardDialog}
    <AccountsToast toast={toast} onDismiss={dismissToast} />
    </>
  );
}
