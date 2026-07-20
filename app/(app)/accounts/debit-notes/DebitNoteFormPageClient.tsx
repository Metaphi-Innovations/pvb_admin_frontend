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
  FRESH_DEBIT_REASONS,
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
import {
  vendorMasterToTransactionFields,
  type VendorTransactionFields,
} from "@/lib/accounts/transaction-master-fetch";
import { Download, Eye, Save, Trash2, Upload } from "lucide-react";
import { getPurchaseInvoiceById } from "@/app/(app)/accounts/purchase-invoices/purchase-invoices-data";
import { resolveWarehouseFromGrnNo } from "@/lib/accounts/bank-warehouse-mapping";
import { WarehouseMappedBankAccountSelect } from "@/components/accounts/WarehouseMappedBankAccountSelect";
import { Textarea } from "@/components/ui/textarea";
import { GroupedLedgerSelect } from "@/components/accounts/GroupedLedgerSelect";
import "../credit-notes/credit-note-workspace.css";

type FormMode = "fresh" | "return" | "purchase_invoice";
type DebitBasis = "amount" | "quantity";

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
  const [bankAccountId, setBankAccountId] = useState<number | null>(null);

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
    setBankAccountId(rec.bankAccountId ?? null);
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

  const warehouseRef = useMemo(() => {
    if (referencePreview?.sourceGrnNo) {
      return resolveWarehouseFromGrnNo(referencePreview.sourceGrnNo);
    }
    if (sourceInvoiceId) {
      return getPurchaseInvoiceById(sourceInvoiceId)?.warehouse ?? null;
    }
    return null;
  }, [referencePreview?.sourceGrnNo, sourceInvoiceId]);

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
        warehouse: warehouseRef ?? undefined,
        bankAccountId,
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
      warehouse: warehouseRef ?? undefined,
      bankAccountId,
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

  const gstAmountDisplay = isFresh ? freshTotals.gstAmount : lineTotals.gstAmount;
  const taxableDisplay = isFresh ? freshTotals.taxable : lineTotals.taxableAmount;
  const cgstDisplay = Math.round((gstAmountDisplay / 2) * 100) / 100;
  const sgstDisplay = cgstDisplay;
  const igstDisplay = 0;
  const basis: DebitBasis = isFresh ? "amount" : "quantity";

  const stickyActions = (
    <div className="flex items-center justify-between w-full gap-2 flex-wrap">
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => router.push(DEBIT_NOTES_LIST_PATH)}
        >
          Back
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={requestCancel}
        >
          Cancel
        </Button>
      </div>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs font-medium gap-1.5"
          onClick={() => saveDraft("view")}
        >
          <Save className="w-3.5 h-3.5" /> Save Draft
        </Button>
        <Button
          size="sm"
          className="h-8 text-xs font-medium bg-brand-600 hover:bg-brand-700 text-white"
          onClick={() => postNote("view")}
        >
          Save & Post
        </Button>
      </div>
    </div>
  );

  return (
    <>
    <AccountsFormLayout
      fullWidth
      onBackClick={requestCancel}
      title={title}
      breadcrumb={[...DEBIT_NOTES_BREADCRUMB]}
      code={debitNoteNo || undefined}
      headerMeta={
        <>
          <span className="cn-ws__badge is-draft">{isEdit ? "Edit" : "Draft"}</span>
          <span className="cn-ws__badge">
            {basis === "amount" ? "Amount Based" : "Quantity Based"}
          </span>
          {debitNoteNo ? (
            <span className="font-mono text-[11px] text-muted-foreground">{debitNoteNo}</span>
          ) : (
            <span className="text-[11px] text-muted-foreground">Auto number on save</span>
          )}
        </>
      }
      stickyFooter={stickyActions}
    >
      <div className="cn-ws">
        {error ? <p className="cn-ws__error">{error}</p> : null}

        {/* Basic Information */}
        <section className="cn-ws__section">
          <p className="cn-ws__label">Basic Information</p>
          <div className="cn-ws__grid-3">
            <div className="cn-ws__field" style={{ gridColumn: "span 1" }}>
              <Label className="text-[11px] font-medium text-muted-foreground">Vendor</Label>
              {vendorLocked ? (
                <p className="cn-ws__ro font-medium truncate">{resolveVendorName() || "—"}</p>
              ) : (
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
              )}
            </div>
            <div className="cn-ws__field">
              <Label className="text-[11px] font-medium text-muted-foreground">
                Debit Note Date
              </Label>
              <AccountsDateInput
                value={debitNoteDate}
                onChange={setDebitNoteDate}
                aria-label="Debit note date"
                className="h-9 text-sm"
              />
            </div>
            <div className="cn-ws__field">
              <Label className="text-[11px] font-medium text-muted-foreground">
                Debit Note No.
              </Label>
              <Input
                className="h-9 text-sm font-mono bg-muted/20"
                disabled
                value={isEdit ? debitNoteNo : "Auto-generated"}
              />
            </div>
            <div className="cn-ws__field">
              <Label className="text-[11px] font-medium text-muted-foreground">
                Reference No.
              </Label>
              <Input
                className="h-9 text-sm"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="Optional"
                disabled={!isFresh}
              />
            </div>
            <div className="cn-ws__field">
              <Label className="text-[11px] font-medium text-muted-foreground">
                Accounts Payable
              </Label>
              <p className="cn-ws__ro truncate">
                {vendorFields?.payableLedger || resolveVendorName() || "—"}
              </p>
            </div>
            <div className="cn-ws__field">
              <Label className="text-[11px] font-medium text-muted-foreground">Status</Label>
              <p className="cn-ws__ro capitalize">{isEdit ? "Draft / loaded" : "New"}</p>
            </div>
            {warehouseRef ? (
              <div className="cn-ws__field" style={{ gridColumn: "1 / -1" }}>
                <WarehouseMappedBankAccountSelect
                  warehouseRef={warehouseRef}
                  value={bankAccountId}
                  onChange={(id) => setBankAccountId(id)}
                  label="Bank Account (optional)"
                />
              </div>
            ) : null}
          </div>
        </section>

        {/* Basis */}
        <section className="cn-ws__section">
          <p className="cn-ws__label">Debit Note Basis</p>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="cn-ws__badge">
              {basis === "amount" ? "Amount Based" : "Quantity Based"}
            </span>
            <span className="cn-ws__hint">
              Source:{" "}
              {isFresh
                ? "Manual"
                : isPurchaseInvoice
                  ? "Purchase Invoice"
                  : isReturn
                    ? "Purchase Return"
                    : "Reference document"}
            </span>
          </div>
          {isFresh ? (
            <p className="cn-ws__hint mt-1.5">
              Quantity-based Debit Notes continue to be created from Purchase Return /
              Purchase Invoice — this path is amount-based only.
            </p>
          ) : null}
        </section>

        {/* Reference */}
        {isFresh ? (
          <section className="cn-ws__section">
            <p className="cn-ws__label">Reference Information</p>
            <div className="cn-ws__grid-3">
              <SearchableSelect
                label="Reason"
                value={reason}
                onChange={setReason}
                options={FRESH_DEBIT_REASONS.map((r) => ({ value: r, label: r }))}
                placeholder="Select reason…"
                required
              />
              <div className="cn-ws__field">
                <Label className="text-[11px] font-medium text-muted-foreground">
                  Adjustment Ledger <span className="text-red-500">*</span>
                </Label>
                <GroupedLedgerSelect
                  value={adjustmentLedgerId}
                  onChange={(ledger) => {
                    setAdjustmentLedgerId(ledger.id);
                    setAdjustmentLedgerName(ledger.accountName);
                  }}
                  placeholder="Select adjustment ledger…"
                  required
                />
              </div>
              <div className="cn-ws__field">
                <Label className="text-[11px] font-medium text-muted-foreground">
                  Reference No.
                </Label>
                <Input
                  className="h-9 text-sm"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  placeholder="Invoice / PO / memo…"
                />
              </div>
            </div>
          </section>
        ) : (
          <section className="cn-ws__section">
            <p className="cn-ws__label">
              {isPurchaseInvoice ? "Purchase Invoice Reference" : "Purchase Return Reference"}
            </p>
            <div className="cn-ws__grid-4">
              {sourceReturnNo ? (
                <div className="cn-ws__field">
                  <span className="cn-ws__flabel">Return No.</span>
                  <p className="cn-ws__ro font-mono">{sourceReturnNo}</p>
                </div>
              ) : null}
              <div className="cn-ws__field">
                <span className="cn-ws__flabel">Purchase Invoice</span>
                <p className="cn-ws__ro font-mono">
                  {referencePreview?.sourceInvoiceNo || "—"}
                </p>
              </div>
              <div className="cn-ws__field">
                <span className="cn-ws__flabel">PO No.</span>
                <p className="cn-ws__ro font-mono">
                  {referencePreview?.sourcePoNo || "—"}
                </p>
              </div>
              <div className="cn-ws__field">
                <span className="cn-ws__flabel">GRN No.</span>
                <p className="cn-ws__ro font-mono">
                  {referencePreview?.sourceGrnNo || "—"}
                </p>
              </div>
              <div className="cn-ws__field">
                <span className="cn-ws__flabel">Invoice Amount</span>
                <p className="cn-ws__ro tabular-nums">
                  {referencePreview
                    ? formatINR(referencePreview.originalAmount)
                    : "—"}
                </p>
              </div>
              <div className="cn-ws__field">
                <span className="cn-ws__flabel">Already Debited</span>
                <p className="cn-ws__ro tabular-nums">
                  {referencePreview
                    ? formatINR(referencePreview.alreadyAdjustedAmount)
                    : "—"}
                </p>
              </div>
              <div className="cn-ws__field">
                <span className="cn-ws__flabel">Dispatch</span>
                <p className="cn-ws__ro font-mono">
                  {sourceDispatchNo || sourcePackingNo || "—"}
                </p>
              </div>
              <div className="cn-ws__field">
                <SearchableSelect
                  label="Reason"
                  value={reason}
                  onChange={setReason}
                  options={DEBIT_REASONS.map((r) => ({ value: r, label: r }))}
                  placeholder="Select reason…"
                  required
                />
              </div>
            </div>
            {(vendorFields || resolveVendorName()) && (
              <p className="text-[11px] text-muted-foreground mt-2 truncate">
                Vendor: {resolveVendorName()}
                {billingAddress ? ` · Bill: ${billingAddress}` : ""}
              </p>
            )}
          </section>
        )}

        {/* Particulars */}
        <section className="cn-ws__section cn-ws__section--flush">
          <div className="px-4 pt-2.5 pb-1">
            <p className="cn-ws__label mb-0">
              {isFresh ? "Particulars" : "Item Particulars"}
            </p>
          </div>
          {isFresh ? (
            <div className="px-4 pb-3">
              <FreshDebitNoteForm
                particularsOnly
                vendorSelector={null}
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
          ) : lines.length > 0 ? (
            <DebitNoteProductTable lines={lines} onQtyChange={onDebitQtyChange} />
          ) : (
            <p className="text-xs text-muted-foreground py-8 text-center border-t border-dashed border-border">
              {isPurchaseInvoice
                ? "Loading purchase invoice lines…"
                : "Loading purchase return lines…"}
            </p>
          )}
        </section>

        {/* Tax & Summary */}
        <div className="cn-ws__summary">
          <div className="space-y-2">
            <p className="cn-ws__hint">
              {isFresh
                ? "GST controls apply to the amount-based particular above."
                : "Debit qty is capped at available quantity. Amounts follow existing GST logic."}
            </p>
            {totalDebit > 0 ? (
              <LedgerImpactPreview
                lines={debitNoteImpactResolved({
                  vendorName: resolveVendorName() || "Supplier",
                  taxable: taxableDisplay,
                  taxAmount: gstAmountDisplay,
                  grandTotal: totalDebit,
                  adjustmentLedgerName: isFresh ? adjustmentLedgerName : undefined,
                })}
              />
            ) : null}
          </div>
          <div className="cn-ws__summary-rows">
            <div>
              <span className="cn-muted">Subtotal</span>
              <span className="tabular-nums">{formatINR(taxableDisplay)}</span>
            </div>
            <div>
              <span className="cn-muted">Discount</span>
              <span className="tabular-nums">{formatINR(0)}</span>
            </div>
            <div>
              <span className="cn-muted">CGST</span>
              <span className="tabular-nums">{formatINR(cgstDisplay)}</span>
            </div>
            <div>
              <span className="cn-muted">SGST</span>
              <span className="tabular-nums">{formatINR(sgstDisplay)}</span>
            </div>
            <div>
              <span className="cn-muted">IGST</span>
              <span className="tabular-nums">{formatINR(igstDisplay)}</span>
            </div>
            <div>
              <span className="cn-muted">Round Off</span>
              <span className="tabular-nums">{formatINR(0)}</span>
            </div>
            <div className="cn-total">
              <span>Grand Total</span>
              <span className="tabular-nums">{formatINR(totalDebit)}</span>
            </div>
          </div>
        </div>

        {/* Narration & Attachments */}
        <section className="cn-ws__section">
          <p className="cn-ws__label">Narration &amp; Attachments</p>
          <div className="cn-ws__grid-3">
            <div className="cn-ws__field">
              <Label className="text-[11px] font-medium text-muted-foreground">
                Reason Summary
              </Label>
              <Input className="h-9 text-sm" value={reason || "—"} disabled />
            </div>
            <div className="cn-ws__field">
              <Label className="text-[11px] font-medium text-muted-foreground">
                Internal Reference
              </Label>
              <Input
                className="h-9 text-sm"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="Optional…"
                disabled={!isFresh}
              />
            </div>
            <div className="cn-ws__field">
              <Label className="text-[11px] font-medium text-muted-foreground">
                Attachment
              </Label>
              <div className="flex items-center gap-1.5">
                <label className="inline-flex items-center gap-1 h-7 px-2 text-[11px] border rounded-md cursor-pointer hover:bg-muted/40">
                  <Upload className="w-3.5 h-3.5" /> Upload
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      handleFile(f, f.name);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            </div>
            <div className="cn-ws__field" style={{ gridColumn: "1 / -1" }}>
              <Label className="text-[11px] font-medium text-muted-foreground">
                Narration
              </Label>
              <Textarea
                className="min-h-[64px] text-xs resize-none"
                value={isFresh ? narration : remarks}
                onChange={(e) => {
                  if (isFresh) setNarration(e.target.value);
                  else setRemarks(e.target.value);
                }}
                placeholder="Narration…"
              />
            </div>
          </div>
          {attachments.length > 0 ? (
            <div className="mt-2 space-y-1">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-2 py-1 px-2 border rounded text-[11px]"
                >
                  <span className="font-medium">{att.documentName}</span>
                  <span className="text-muted-foreground flex-1 truncate">{att.fileName}</span>
                  {att.dataUrl ? (
                    <>
                      <button
                        type="button"
                        className="p-1 hover:bg-muted rounded"
                        onClick={() => window.open(att.dataUrl, "_blank")}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <a
                        href={att.dataUrl}
                        download={att.fileName}
                        className="p-1 hover:bg-muted rounded"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </>
                  ) : null}
                  <button
                    type="button"
                    className="p-1 hover:bg-red-50 text-red-600 rounded"
                    onClick={() =>
                      setAttachments((p) => p.filter((a) => a.id !== att.id))
                    }
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </AccountsFormLayout>
    {discardDialog}
    <AccountsToast toast={toast} onDismiss={dismissToast} />
    </>
  );
}
