"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { useFormDirtySnapshot } from "@/lib/accounts/use-form-dirty-snapshot";
import { useTransactionFormCancel } from "@/components/accounts/TransactionFormCancel";
import { AccountsFormLayout } from "../expenses/components/AccountsFormLayout";
import { SearchableSelect } from "../credit-notes/components/SearchableSelect";
import {
  buildReferenceFromPurchaseInvoice,
  buildReferenceFromPurchaseReturn,
  createDebitNote,
  createEmptyDebitLine,
  getDebitNoteById,
  getPendingDebitNoteRow,
  getVendorsForDebitNote,
  listCreditablePurchaseInvoices,
  listPurchaseReturnsForDebitNote,
  newDebitAttachmentId,
  normalizeDebitLine,
  postDebitNoteRecord,
  previewToDebitForm,
  updateDebitNote,
  type DebitNoteAttachment,
  type DebitNoteLine,
  type DebitReferencePreview,
  type NoteWorkflowStatus,
} from "./debit-notes-data";
import { DEBIT_NOTES_BREADCRUMB, DEBIT_NOTES_LIST_PATH, formatINR } from "./note-utils";
import { dispatchAccountsDataChanged } from "@/lib/accounts/accounts-data-events";
import { AccountsToast, useAccountsToast } from "@/components/accounts/AccountsToast";
import { AccountsDateInput } from "@/components/accounts/AccountsDateInput";
import { roundMoney } from "@/lib/accounts/money-format";
import { VoucherFormSectionCard } from "@/components/accounts/voucher-form/VoucherFormSectionCard";
import { VoucherGstSummaryCard } from "@/components/accounts/voucher-form/VoucherGstSummaryCard";
import { VoucherSignedRoundOffInput } from "@/components/accounts/voucher-form/VoucherSignedRoundOffInput";
import { VoucherAccountingPostingSummary } from "@/components/accounts/voucher-form/VoucherAccountingPostingSummary";
import { VoucherNarrationAttachmentsSection } from "@/components/accounts/voucher-form/VoucherNarrationAttachmentsSection";
import {
  VoucherNoteField,
  VoucherNoteFieldGrid,
  VoucherNoteReadOnly,
} from "@/components/accounts/voucher-form/VoucherNoteFieldGrid";
import { VoucherFormActionBar } from "@/components/accounts/voucher-form/VoucherFormActionBar";
import { VoucherNoteSegmentControl } from "@/components/accounts/voucher-form/VoucherNoteSegmentControl";
import {
  NoteParticularsTable,
  computeNoteParticularTotals,
} from "@/components/accounts/voucher-form/NoteParticularsTable";
import { NoteReferenceDocumentDetails } from "@/components/accounts/voucher-form/NoteReferenceDocumentDetails";
import {
  adaptPurchaseInvoiceReference,
  adaptPurchaseReturnReference,
} from "@/components/accounts/voucher-form/note-reference-model";
import { defaultVisibilityForType } from "@/components/accounts/voucher-form/voucher-form-shell";
import "@/components/accounts/voucher-form/note-form-compact.css";
import {
  vendorMasterToTransactionFields,
  type VendorTransactionFields,
} from "@/lib/accounts/transaction-master-fetch";
import { getPurchaseInvoiceById } from "@/app/(app)/accounts/purchase-invoices/purchase-invoices-data";
import { resolveWarehouseFromGrnNo } from "@/lib/accounts/bank-warehouse-mapping";
import { WarehouseMappedBankAccountSelect } from "@/components/accounts/WarehouseMappedBankAccountSelect";
import "../credit-notes/credit-note-tx.css";

type FormMode = "fresh" | "return" | "purchase_invoice";
type UiRefType = "direct" | "purchase_invoice" | "purchase_return";

const REF_TYPE_OPTIONS: { value: UiRefType; label: string }[] = [
  { value: "direct", label: "Direct" },
  { value: "purchase_invoice", label: "Purchase Invoice" },
  { value: "purchase_return", label: "Purchase Return" },
];

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
  const purchaseInvoices = useMemo(() => listCreditablePurchaseInvoices(), []);
  const purchaseReturns = useMemo(() => listPurchaseReturnsForDebitNote(), []);

  const [uiRefType, setUiRefType] = useState<UiRefType>(() => {
    if (isFresh || (!isReturn && !isPurchaseInvoice)) return "direct";
    if (isReturn) return "purchase_return";
    if (isPurchaseInvoice) return "purchase_invoice";
    return "direct";
  });

  const isSourceRefMode =
    uiRefType === "purchase_invoice" || uiRefType === "purchase_return";
  const isDirectMode = uiRefType === "direct";

  const [particular, setParticular] = useState("");
  const [particularQty, setParticularQty] = useState("1");
  const [particularRate, setParticularRate] = useState("");
  const [referenceInvoiceId, setReferenceInvoiceId] = useState("");
  const [referenceReturnId, setReferenceReturnId] = useState("");

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
  const [remarks, setRemarks] = useState("");
  const [attachments, setAttachments] = useState<DebitNoteAttachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [bankAccountId, setBankAccountId] = useState<number | null>(null);
  const [roundOff, setRoundOff] = useState(0);

  const [referenceNo, setReferenceNo] = useState("");
  const [adjustmentLedgerId, setAdjustmentLedgerId] = useState<number | null>(null);
  const [adjustmentLedgerName, setAdjustmentLedgerName] = useState("");
  const [gstApplicable, setGstApplicable] = useState(false);
  const [gstPct, setGstPct] = useState("18");
  const [narration, setNarration] = useState("");

  const vendorLocked = Boolean(referencePreview) || isReturn || isPurchaseInvoice;
  const refControlsLocked = isReturn || isPurchaseInvoice;
  const alreadyAdjustedNum = parseFloat(alreadyAdjusted) || 0;

  const purchaseInvoiceOptions = useMemo(
    () =>
      purchaseInvoices.map((inv) => ({
        value: String(inv.id),
        label: inv.invoiceNo,
        sub: `${inv.vendorName} · ${inv.invoiceDate} · ${formatINR(inv.grandTotal)}`,
      })),
    [purchaseInvoices],
  );

  const purchaseReturnOptions = useMemo(
    () =>
      purchaseReturns.map((ret) => ({
        value: String(ret.id),
        label: ret.returnNumber,
        sub: `${ret.supplierName} · ${ret.returnDate} · PO ${ret.poNumber}`,
      })),
    [purchaseReturns],
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
    if (isReturn || isPurchaseInvoice) return;
    setReferencePreview(null);
    setSourceInvoiceId(null);
    setSourcePoId(null);
    setSourceReturnId("");
    setSourceReturnNo("");
    setSourcePackingNo("");
    setSourceDispatchNo("");
    setOriginalAmount("");
    setAlreadyAdjusted("0");
    setLines([]);
  };

  const prefillParticularsFromPreview = (preview: DebitReferencePreview, fallbackName: string) => {
    if (!particular.trim()) {
      setParticular(preview.lineItems[0]?.productName || fallbackName);
    }
    const first = preview.lineItems[0];
    if (first && !particularRate.trim()) {
      const qty =
        (first.purchaseReturnQty && first.purchaseReturnQty > 0
          ? first.purchaseReturnQty
          : first.eligibleReturnQty && first.eligibleReturnQty > 0
            ? first.eligibleReturnQty
            : first.invoiceQty) || 1;
      setParticularQty(String(qty));
      setParticularRate(String(first.unitPrice || ""));
      const gstOn = (first.taxPct || 0) > 0 || (first.gstAmount || 0) > 0;
      setGstApplicable(gstOn);
      if (gstOn && first.taxPct > 0) setGstPct(String(first.taxPct));
    }
  };

  /** Reference preview is display-only — do not load editable source lines by default. */
  const applyPreview = (
    preview: DebitReferencePreview,
    retId: number,
    retNo: string,
    loadLines = false,
  ) => {
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
    if (loadLines && pre.lineItems?.length) {
      setLines(pre.lineItems.map((l) => normalizeDebitLine(l)));
    } else {
      setLines([]);
    }
  };

  const applyPurchaseInvoicePreview = (
    preview: DebitReferencePreview,
    invoiceId: number,
    loadLines = false,
  ) => {
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
    if (loadLines && pre.lineItems?.length) {
      setLines(pre.lineItems.map((l) => normalizeDebitLine(l)));
    } else {
      setLines([]);
    }
  };

  const onPurchaseInvoiceSelect = (id: string) => {
    setReferenceInvoiceId(id);
    setReferenceReturnId("");
    if (!id) {
      clearReference();
      return;
    }
    const preview = buildReferenceFromPurchaseInvoice(Number(id));
    if (preview) {
      applyPurchaseInvoicePreview(preview, Number(id), false);
      prefillParticularsFromPreview(preview, "Purchase invoice adjustment");
    }
  };

  const onPurchaseReturnSelect = (id: string) => {
    setReferenceReturnId(id);
    setReferenceInvoiceId("");
    if (!id) {
      clearReference();
      return;
    }
    const retId = Number(id);
    const ret = purchaseReturns.find((r) => r.id === retId);
    const pending = getPendingDebitNoteRow(retId);
    const preview = buildReferenceFromPurchaseReturn(retId);
    if (preview) {
      applyPreview(
        preview,
        retId,
        pending?.returnNumber ?? ret?.returnNumber ?? `PRET-${retId}`,
        false,
      );
      prefillParticularsFromPreview(preview, "Purchase return");
    }
  };

  const onUiRefTypeChange = (next: UiRefType) => {
    if (isReturn || isPurchaseInvoice) return;
    setUiRefType(next);
    clearReference();
    setReferenceInvoiceId("");
    setReferenceReturnId("");
    // #region agent log
    fetch("http://127.0.0.1:7502/ingest/b60215f3-a2ea-4dec-b0ac-4488ce88b732", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "e2f165",
      },
      body: JSON.stringify({
        sessionId: "e2f165",
        location: "DebitNoteFormPageClient.tsx:onUiRefTypeChange",
        message: "DN ref type change",
        data: { next, prev: uiRefType },
        timestamp: Date.now(),
        hypothesisId: "B",
        runId: "pre-fix",
      }),
    }).catch(() => {});
    // #endregion
  };

  useEffect(() => {
    if (!isReturn || returnId == null || isEdit) return;
    setUiRefType("purchase_return");
    setReferenceReturnId(String(returnId));
    const pending = getPendingDebitNoteRow(returnId);
    const preview = buildReferenceFromPurchaseReturn(returnId);
    if (!preview) return;
    const retNo = pending?.returnNumber ?? `PRET-${returnId}`;
    applyPreview(preview, returnId, retNo, false);
    if (pending?.returnDate) setDebitNoteDate(pending.returnDate);
    const first = preview.lineItems[0];
    if (first) {
      const qty =
        (first.purchaseReturnQty && first.purchaseReturnQty > 0
          ? first.purchaseReturnQty
          : first.invoiceQty) || 1;
      setParticularQty(String(qty));
      setParticularRate(String(first.unitPrice || ""));
      setGstApplicable((first.taxPct || 0) > 0 || (first.gstAmount || 0) > 0);
      if ((first.taxPct || 0) > 0) setGstPct(String(first.taxPct));
    }
    setParticular((prev) => (prev.trim() ? prev : first?.productName || "Purchase return"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReturn, returnId, isEdit, vendors]);

  useEffect(() => {
    if (!isPurchaseInvoice || purchaseInvoiceId == null || isEdit) return;
    setUiRefType("purchase_invoice");
    setReferenceInvoiceId(String(purchaseInvoiceId));
    const preview = buildReferenceFromPurchaseInvoice(purchaseInvoiceId);
    if (preview) {
      applyPurchaseInvoicePreview(preview, purchaseInvoiceId, false);
      prefillParticularsFromPreview(preview, "Purchase invoice adjustment");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setRemarks(rec.remarks);
    setNarration(rec.remarks);
    setBankAccountId(rec.bankAccountId ?? null);
    setAttachments(rec.attachments ?? []);
    setReferenceNo(rec.referenceNo ?? "");
    setAdjustmentLedgerId(rec.adjustmentLedgerId ?? null);
    setAdjustmentLedgerName(rec.adjustmentLedgerName ?? "");

    if (fresh) {
      setUiRefType(
        rec.sourceReturnId
          ? "purchase_return"
          : rec.sourceInvoiceId
            ? "purchase_invoice"
            : "direct",
      );
      if (rec.sourceInvoiceId) setReferenceInvoiceId(String(rec.sourceInvoiceId));
      if (rec.sourceReturnId) setReferenceReturnId(String(rec.sourceReturnId));
      const line = rec.lineItems[0];
      const taxable = rec.taxableAmount ?? 0;
      const gstOn = (rec.gstAmount ?? 0) > 0 || (line?.taxPct ?? 0) > 0;
      const gstPctStr = String(rec.freshGstPct ?? line?.taxPct ?? 18);
      if (line && line.returnQty > 0 && line.unitPrice > 0) {
        setParticularQty(String(line.returnQty));
        setParticularRate(String(line.unitPrice));
      } else {
        setParticularQty("1");
        setParticularRate(
          String(
            taxable > 0
              ? taxable
              : Math.max(0, (rec.standaloneDebitAmount || 0) - (rec.gstAmount || 0)),
          ),
        );
      }
      setGstApplicable(gstOn);
      setGstPct(gstPctStr);
      const qtyStr = line && line.returnQty > 0 ? String(line.returnQty) : "1";
      const rateStr =
        line && line.unitPrice > 0
          ? String(line.unitPrice)
          : String(
              taxable > 0
                ? taxable
                : Math.max(0, (rec.standaloneDebitAmount || 0) - (rec.gstAmount || 0)),
            );
      const expected = computeNoteParticularTotals(qtyStr, rateStr, gstOn, gstPctStr, false).total;
      const savedTotal = rec.standaloneDebitAmount || rec.currentDebitAmount || expected;
      setRoundOff(roundMoney(savedTotal - expected));
      setParticular(rec.reason || line?.productName || "");
      if (rec.sourceInvoiceId) {
        const p = buildReferenceFromPurchaseInvoice(rec.sourceInvoiceId);
        if (p) setReferencePreview(p);
      } else if (rec.sourceReturnId) {
        const p = buildReferenceFromPurchaseReturn(Number(rec.sourceReturnId));
        if (p) setReferencePreview(p);
      }
      setLines([]);
    } else {
      setUiRefType(rec.sourceReturnId ? "purchase_return" : "purchase_invoice");
      if (rec.sourceInvoiceId) setReferenceInvoiceId(String(rec.sourceInvoiceId));
      if (rec.sourceReturnId) setReferenceReturnId(String(rec.sourceReturnId));
      const line = rec.lineItems[0];
      const taxable = rec.taxableAmount || 0;
      const gstOn = (rec.gstAmount ?? 0) > 0 || (line?.taxPct ?? 0) > 0;
      const gstPctStr =
        line?.taxPct && line.taxPct > 0
          ? String(line.taxPct)
          : taxable > 0 && gstOn
            ? String(Math.round(((rec.gstAmount ?? 0) / taxable) * 10000) / 100)
            : "18";
      if (line && line.returnQty > 0 && line.unitPrice > 0) {
        setParticularQty(String(line.returnQty));
        setParticularRate(String(line.unitPrice));
      } else {
        setParticularQty("1");
        setParticularRate(String(taxable || line?.unitPrice || rec.currentDebitAmount || ""));
      }
      setGstApplicable(gstOn);
      setGstPct(gstPctStr);
      setParticular(line?.productName || rec.reason || "");
      const qtyStr = line && line.returnQty > 0 ? String(line.returnQty) : "1";
      const rateStr =
        line && line.unitPrice > 0
          ? String(line.unitPrice)
          : String(taxable || rec.currentDebitAmount || "");
      const expected = computeNoteParticularTotals(qtyStr, rateStr, gstOn, gstPctStr, false).total;
      setRoundOff(roundMoney((rec.currentDebitAmount ?? expected) - expected));
      if (rec.sourceReturnId) {
        const p = buildReferenceFromPurchaseReturn(Number(rec.sourceReturnId));
        if (p) setReferencePreview(p);
      } else if (rec.sourceInvoiceId) {
        const p = buildReferenceFromPurchaseInvoice(rec.sourceInvoiceId);
        if (p) setReferencePreview(p);
      }
      // Against-reference edit: keep preview for read-only display; clear lines so particulars drive amounts.
      setLines([]);
    }
  }, [isEdit, debitNoteId, router, vendors]);

  const particularTotals = computeNoteParticularTotals(
    particularQty,
    particularRate,
    gstApplicable,
    gstPct,
    false,
  );

  const displayTaxable = particularTotals.basicAmount;
  const cgstDisplay = particularTotals.cgst;
  const sgstDisplay = particularTotals.sgst;
  const igstDisplay = particularTotals.igst;
  const totalDebit = Math.max(0, particularTotals.total + roundOff);
  const showGst = gstApplicable;

  const referenceDocumentView = useMemo(() => {
    if (!isSourceRefMode || !referencePreview) return null;
    const base = {
      documentDate: referencePreview.documentDate,
      partyName: referencePreview.vendorName,
      grandTotal: referencePreview.originalAmount,
      lines: referencePreview.lineItems,
    };
    if (uiRefType === "purchase_return") {
      return adaptPurchaseReturnReference({
        ...base,
        documentNumber: sourceReturnNo || referencePreview.sourceInvoiceNo,
      });
    }
    return adaptPurchaseInvoiceReference({
      ...base,
      documentNumber: referencePreview.sourceInvoiceNo,
    });
  }, [isSourceRefMode, referencePreview, uiRefType, sourceReturnNo]);

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

  const buildParticularLineItems = (): DebitNoteLine[] => {
    if (particularTotals.total <= 0 && Math.abs(roundOff) < 0.005) return [];
    const name = particular.trim() || "Adjustment";
    const lineTotal = roundMoney(particularTotals.total + roundOff);
    return [
      normalizeDebitLine({
        ...createEmptyDebitLine(),
        productName: name,
        returnQty: particularTotals.qty || 1,
        unitPrice: particularTotals.rate || particularTotals.basicAmount,
        taxPct: gstApplicable ? parseFloat(gstPct) || 0 : 0,
        gstApplicable,
        debitAmount: lineTotal,
        gstAmount: particularTotals.gstAmount,
        lineAmount: lineTotal,
        adjustmentLedgerId: adjustmentLedgerId ?? undefined,
        adjustmentLedgerName: adjustmentLedgerName || undefined,
        lineRemarks: narration.trim() || remarks.trim(),
      }),
    ];
  };

  const buildInput = (status: NoteWorkflowStatus) => {
    const resolvedReason =
      particular.trim() ||
      narration.trim() ||
      remarks.trim() ||
      (isDirectMode
        ? "Other"
        : uiRefType === "purchase_return"
          ? "Purchase Return"
          : "Purchase Invoice Adjustment");

    return {
      debitNoteDate,
      againstType: isDirectMode
        ? ("standalone_adjustment" as const)
        : ("purchase_invoice" as const),
      vendorId: vendorId ? Number(vendorId) : null,
      vendorName: resolveVendorName(),
      sourceInvoiceId: sourceInvoiceId,
      sourceInvoiceNo: referencePreview?.sourceInvoiceNo ?? "",
      sourcePoId: sourcePoId ?? referencePreview?.sourcePoId ?? null,
      sourcePoNo: referencePreview?.sourcePoNo ?? "",
      sourceGrnNo: referencePreview?.sourceGrnNo ?? "",
      sourceQcNo: referencePreview?.sourceQcNo ?? "",
      sourcePackingNo: sourcePackingNo || undefined,
      sourceDispatchNo: sourceDispatchNo || undefined,
      originalAmount: roundMoney(particularTotals.total + roundOff),
      alreadyAdjustedAmount: isDirectMode ? 0 : alreadyAdjustedNum,
      standaloneDebitAmount: isDirectMode
        ? roundMoney(particularTotals.total + roundOff)
        : 0,
      taxableAmount: particularTotals.basicAmount,
      gstAmount: particularTotals.gstAmount,
      freshGstPct: isDirectMode ? (gstApplicable ? particularTotals.ratePct : 0) : undefined,
      lineItems: isDirectMode ? ([] as DebitNoteLine[]) : buildParticularLineItems(),
      reason: resolvedReason,
      remarks: narration || remarks,
      referenceNo,
      adjustmentLedgerId,
      adjustmentLedgerName,
      attachments,
      status,
      source:
        sourceReturnId || uiRefType === "purchase_return"
          ? ("purchase_return" as const)
          : ("manual" as const),
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
    if (!adjustmentLedgerId && !adjustmentLedgerName) {
      setError("Select an adjustment ledger.");
      return false;
    }
    if (!particular.trim()) {
      setError("Enter a particular / description for the adjustment.");
      return false;
    }
    if (particularTotals.total <= 0) {
      setError("Enter a valid Qty and Rate for the particular.");
      return false;
    }
    if (isSourceRefMode) {
      if (!referencePreview) {
        setError(
          uiRefType === "purchase_return"
            ? "Select a purchase return."
            : "Select a purchase invoice.",
        );
        return false;
      }
      if (!(narration || remarks).trim()) {
        setError("Narration is required.");
        return false;
      }
    }
    return true;
  };

  const saveDraft = () => {
    setError(null);
    try {
      if (!validateForm()) return;
      if (isEdit && debitNoteId != null) {
        updateDebitNote(debitNoteId, buildInput("draft"));
        dispatchAccountsDataChanged("debit-notes");
        showToast("Debit note saved as draft");
        router.push(`${DEBIT_NOTES_LIST_PATH}/${debitNoteId}`);
      } else {
        const rec = createDebitNote(buildInput("draft"));
        dispatchAccountsDataChanged("debit-notes");
        showToast("Debit note saved as draft");
        router.push(`${DEBIT_NOTES_LIST_PATH}/${rec.id}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save debit note.");
    }
  };

  const postNote = () => {
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
        router.push(`${DEBIT_NOTES_LIST_PATH}/${id}`);
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
  }, [debitNoteId, isFresh, returnId, purchaseInvoiceId]);

  const formSnapshot = useMemo(
    () => ({
      debitNoteDate,
      vendorId,
      remarks,
      particular,
      particularQty,
      particularRate,
      referenceNo,
      gstApplicable,
      gstPct,
      narration,
      attachments,
      adjustmentLedgerId,
      uiRefType,
      referenceInvoiceId,
      referenceReturnId,
      roundOff,
    }),
    [
      debitNoteDate,
      vendorId,
      remarks,
      particular,
      particularQty,
      particularRate,
      referenceNo,
      gstApplicable,
      gstPct,
      narration,
      attachments,
      adjustmentLedgerId,
      uiRefType,
      referenceInvoiceId,
      referenceReturnId,
      roundOff,
    ],
  );
  const isDirty = useFormDirtySnapshot(formSnapshot, { ready: baselineReady });
  const { requestCancel, discardDialog } = useTransactionFormCancel({
    listHref: DEBIT_NOTES_LIST_PATH,
    isDirty,
  });

  const stickyActions = (
    <VoucherFormActionBar
      onCancel={requestCancel}
      onSaveDraft={saveDraft}
      onSaveAndPost={postNote}
    />
  );

  const vendorLedgerName = vendorFields?.payableLedger || resolveVendorName() || "Not selected";
  const creditAdjLedger = adjustmentLedgerName || "Not selected";

  const postingSummary = (
    <VoucherAccountingPostingSummary
      embedded
      compact
      voucherTypeLabel="Debit Note"
      debitLedgerLabel="Debit"
      debitLedgerName={vendorLedgerName || "Not selected"}
      creditLedgerLabel="Credit"
      creditLedgerName={creditAdjLedger || "Not selected"}
      voucherAmount={totalDebit}
      voucherAmountLabel="Debit Note Amount"
      gstAdjustments={
        showGst
          ? {
              cgstLabel: "Input CGST Adjustment",
              cgstAmount: cgstDisplay,
              sgstLabel: "Input SGST Adjustment",
              sgstAmount: sgstDisplay,
              igstLabel: "Input IGST Adjustment",
              igstAmount: igstDisplay,
            }
          : undefined
      }
      visibilityItems={defaultVisibilityForType("debit_note", {
        gstApplicable: showGst,
      })}
    />
  );

  // #region agent log
  useEffect(() => {
    fetch("http://127.0.0.1:7502/ingest/b60215f3-a2ea-4dec-b0ac-4488ce88b732", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "e2f165",
      },
      body: JSON.stringify({
        sessionId: "e2f165",
        location: "DebitNoteFormPageClient.tsx:render",
        message: "DN render branch",
        data: {
          uiRefType,
          isSourceRefMode,
          hasPreview: Boolean(referencePreview),
          hasRefDoc: Boolean(referenceDocumentView),
          gstOn: gstApplicable,
          particularQty,
          particularRate,
          usesSharedParticulars: true,
        },
        timestamp: Date.now(),
        hypothesisId: "A",
        runId: "pre-fix",
      }),
    }).catch(() => {});
  }, [
    uiRefType,
    isSourceRefMode,
    referencePreview,
    referenceDocumentView,
    gstApplicable,
    particularQty,
    particularRate,
  ]);
  // #endregion

  return (
    <>
      <div className="credit-debit-note-form h-full min-h-0 flex flex-col">
        <AccountsFormLayout
          fullWidth
          onBackClick={requestCancel}
          title={title}
          breadcrumb={[...DEBIT_NOTES_BREADCRUMB]}
          code={debitNoteNo || undefined}
          headerMeta={
            <div className="flex items-center gap-1.5">
              <span className="cdn-chip inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                Draft
              </span>
              {debitNoteNo ? (
                <span className="cdn-chip cdn-chip--code inline-flex items-center h-5 px-1.5 rounded border font-mono text-[10px]">
                  {debitNoteNo}
                </span>
              ) : null}
            </div>
          }
          stickyFooter={stickyActions}
        >
          <div className="cdn-stack pb-20">
            {error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 text-xs text-red-700">
                {error}
              </div>
            ) : null}

            <VoucherFormSectionCard title="Basic & Reference Details" compact>
              <VoucherNoteFieldGrid columns={4}>
                <VoucherNoteField label="Debit Note Number" width="sm">
                  <VoucherNoteReadOnly mono>
                    {isEdit ? debitNoteNo : debitNoteNo || "…"}
                  </VoucherNoteReadOnly>
                </VoucherNoteField>
                <VoucherNoteField label="Debit Note Date" width="sm">
                  <AccountsDateInput
                    value={debitNoteDate}
                    onChange={setDebitNoteDate}
                    aria-label="Debit note date"
                    className="h-[30px] text-xs cdn-control"
                  />
                </VoucherNoteField>
                <VoucherNoteField label="Reference Number" width="md">
                  <Input
                    className="h-[30px] text-xs cdn-control"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    placeholder="Optional"
                  />
                </VoucherNoteField>
                {warehouseRef ? (
                  <VoucherNoteField label="Bank Account" width="lg">
                    <WarehouseMappedBankAccountSelect
                      warehouseRef={warehouseRef}
                      value={bankAccountId}
                      onChange={(id) => setBankAccountId(id)}
                      label=""
                    />
                  </VoucherNoteField>
                ) : null}
                <VoucherNoteField label="Vendor" required width="md">
                  {vendorLocked ? (
                    <VoucherNoteReadOnly>{resolveVendorName() || "—"}</VoucherNoteReadOnly>
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
                </VoucherNoteField>
                <VoucherNoteField label="Vendor GSTIN" width="md">
                  <VoucherNoteReadOnly mono>
                    {vendorFields?.vendorGst || referencePreview?.vendorGstin || "—"}
                  </VoucherNoteReadOnly>
                </VoucherNoteField>
                <VoucherNoteField label="AP Ledger" width="md">
                  <VoucherNoteReadOnly>
                    {vendorFields?.payableLedger || resolveVendorName() || "—"}
                  </VoucherNoteReadOnly>
                </VoucherNoteField>
                <VoucherNoteField label="Reference Type" span={2} width="ref">
                  {refControlsLocked ? (
                    <VoucherNoteReadOnly>
                      {isReturn
                        ? `Purchase Return${sourceReturnNo ? ` · ${sourceReturnNo}` : ""}`
                        : `Purchase Invoice${
                            referencePreview?.sourceInvoiceNo
                              ? ` · ${referencePreview.sourceInvoiceNo}`
                              : ""
                          }`}
                    </VoucherNoteReadOnly>
                  ) : (
                    <VoucherNoteSegmentControl
                      hideLabel
                      label="Reference Type"
                      name="dn-ref-type"
                      value={uiRefType}
                      options={REF_TYPE_OPTIONS}
                      onChange={onUiRefTypeChange}
                    />
                  )}
                </VoucherNoteField>
                {!refControlsLocked && uiRefType === "purchase_invoice" ? (
                  <VoucherNoteField label="Reference Document" span={2} width="ref">
                    <SearchableSelect
                      label=""
                      value={referenceInvoiceId}
                      onChange={onPurchaseInvoiceSelect}
                      options={purchaseInvoiceOptions}
                      placeholder="Select purchase invoice"
                      required
                    />
                  </VoucherNoteField>
                ) : null}
                {!refControlsLocked && uiRefType === "purchase_return" ? (
                  <VoucherNoteField label="Reference Document" span={2} width="ref">
                    <SearchableSelect
                      label=""
                      value={referenceReturnId}
                      onChange={onPurchaseReturnSelect}
                      options={purchaseReturnOptions}
                      placeholder="Select purchase return"
                      required
                    />
                  </VoucherNoteField>
                ) : null}
              </VoucherNoteFieldGrid>
            </VoucherFormSectionCard>

            {isSourceRefMode ? (
              <NoteReferenceDocumentDetails
                document={referenceDocumentView}
                emptyMessage={
                  uiRefType === "purchase_return"
                    ? "Select a purchase return to view source details."
                    : "Select a purchase invoice to view source details."
                }
              />
            ) : null}

            <VoucherFormSectionCard title="Particulars" flush compact>
              <div className="cnz-items !shadow-none !border-0 !rounded-none">
                <div className="px-3 py-2">
                  <NoteParticularsTable
                    particular={particular}
                    onParticularChange={setParticular}
                    adjustmentLedgerId={adjustmentLedgerId}
                    onAdjustmentLedgerChange={(l) => {
                      setAdjustmentLedgerId(l.id);
                      setAdjustmentLedgerName(l.accountName);
                    }}
                    qty={particularQty}
                    onQtyChange={setParticularQty}
                    rate={particularRate}
                    onRateChange={setParticularRate}
                    gstPct={gstPct}
                    onGstPctChange={setGstPct}
                    gstApplicable={gstApplicable}
                    onGstApplicableChange={setGstApplicable}
                    interstate={false}
                    switchId="dn-gst-applicable"
                  />
                </div>
              </div>
              <VoucherGstSummaryCard
                embedded
                visible
                showTaxRows={showGst}
                taxableAmount={displayTaxable}
                cgstAmount={cgstDisplay}
                sgstAmount={sgstDisplay}
                igstAmount={igstDisplay}
                roundOff={roundOff}
                grandTotal={totalDebit}
                roundOffSlot={
                  <VoucherSignedRoundOffInput value={roundOff} onChange={setRoundOff} />
                }
              />
            </VoucherFormSectionCard>

            <VoucherNarrationAttachmentsSection
              compact
              narration={narration || remarks}
              onNarrationChange={(v) => {
                setNarration(v);
                setRemarks(v);
              }}
              narrationPlaceholder="Accounting narration for this debit note"
              attachmentFiles={attachments.map((att) => ({
                id: att.id,
                fileName: att.fileName,
                previewUrl: att.dataUrl,
              }))}
              onAddAttachmentFiles={(files) => {
                files.forEach((f) => handleFile(f, f.name));
              }}
              onRemoveAttachment={(id) =>
                setAttachments((prev) => prev.filter((a) => a.id !== id))
              }
              footerSlot={postingSummary}
            />
          </div>
        </AccountsFormLayout>
      </div>
      <AccountsToast toast={toast} onDismiss={dismissToast} />
      {discardDialog}
    </>
  );
}
