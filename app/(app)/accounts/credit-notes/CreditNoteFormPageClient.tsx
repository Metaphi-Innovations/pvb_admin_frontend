"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useFormDirtySnapshot } from "@/lib/accounts/use-form-dirty-snapshot";
import { useTransactionFormCancel } from "@/components/accounts/TransactionFormCancel";
import { Save } from "lucide-react";
import { AccountsFormLayout } from "../expenses/components/AccountsFormLayout";
import { SearchableSelect } from "./components/SearchableSelect";
import { CreditNoteCustomerSection } from "./components/CreditNoteCustomerSection";
import { NoteTypeSelector } from "./components/NoteTypeSelector";
import { FreshCreditNoteForm, computeFreshCreditTotals } from "./components/FreshCreditNoteForm";
import { LinkedInvoicesMultiSelect, type LinkedInvoiceOption } from "./components/LinkedInvoicesMultiSelect";
import { CreditNoteProductTable } from "./components/CreditNoteProductTable";
import { buildCreditNoteLedgerImpact } from "./credit-note-accounting";
import {
  applyReturnQtyToLines,
  buildReferenceFromInvoice,
  buildReferenceFromSalesReturn,
  computeCreditNoteGstSplit,
  createCreditNote,
  createEmptyCreditLine,
  creditLinesForSchemeSettlement,
  getCreditLineMaxQty,
  getCreditNoteById,
  getCustomersForCreditNote,
  listInvoicesForReference,
  listSalesReturnsForCreditNote,
  normalizeCreditLine,
  postCreditNote,
  previewToFormInput,
  recalcAllCreditLines,
  updateCreditNote,
  validateCreditNoteLines,
  type CreditNoteCreationMode,
  type CreditReferenceDocType,
  type CreditNoteLine,
  type CreditNoteLinkedInvoice,
  type CreditNoteSource,
  type CreditReferencePreview,
  type NoteWorkflowStatus,
} from "./credit-notes-data";
import {
  customerMasterToTransactionFields,
  type CustomerTransactionFields,
} from "@/lib/accounts/transaction-master-fetch";
import { findPendingSchemeSettlement } from "@/lib/accounts/scheme-settlement-data";
import { getPendingCreditNoteRow } from "./pending-credit-notes-data";
import { CREDIT_NOTES_BREADCRUMB, CREDIT_NOTES_LIST_PATH, formatINR } from "./note-utils";
import { LedgerImpactPreview } from "@/components/accounts/LedgerImpactPreview";
import { AccountsDateInput } from "@/components/accounts/AccountsDateInput";
import { dispatchAccountsDataChanged } from "@/lib/accounts/accounts-data-events";
import { AccountsToast, useAccountsToast } from "@/components/accounts/AccountsToast";

type FormMode = "fresh" | "return" | "scheme";

const NOTE_TYPE_OPTIONS: { value: CreditNoteCreationMode; label: string }[] = [
  { value: "against_reference", label: "Against Sales Invoice / Sales Return (Quantity Based)" },
  { value: "direct_adjustment", label: "Direct Amount Adjustment" },
];

export default function CreditNoteFormPageClient({
  creditNoteId,
  returnId: returnIdProp,
  schemeKey: schemeKeyProp,
  invoiceId: invoiceIdProp,
  mode,
}: {
  creditNoteId?: number;
  returnId?: string;
  schemeKey?: string;
  invoiceId?: string;
  mode?: FormMode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast, showToast, dismissToast } = useAccountsToast();
  const isEdit = creditNoteId != null;
  const returnId = returnIdProp ?? searchParams.get("returnId") ?? undefined;
  const schemeKey = schemeKeyProp ?? searchParams.get("schemeKey") ?? undefined;
  const invoiceIdFromUrl = invoiceIdProp ?? searchParams.get("invoiceId") ?? undefined;
  const modeFromUrl = searchParams.get("mode");
  const resolvedMode: FormMode | undefined =
    mode ??
    (modeFromUrl === "fresh" || modeFromUrl === "return" || modeFromUrl === "scheme"
      ? modeFromUrl
      : returnId
        ? "return"
        : schemeKey
          ? "scheme"
          : undefined);
  const isFresh = !isEdit && resolvedMode === "fresh";
  const isReturn = !isEdit && (resolvedMode === "return" || Boolean(returnId));
  const isScheme = !isEdit && (resolvedMode === "scheme" || Boolean(schemeKey));

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7502/ingest/b60215f3-a2ea-4dec-b0ac-4488ce88b732',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'db7cdd'},body:JSON.stringify({sessionId:'db7cdd',hypothesisId:'C-E',location:'CreditNoteFormPageClient.tsx:mount',message:'Form mounted',data:{mode,resolvedMode,returnId,schemeKey,isEdit,isFresh,isReturn,isScheme,searchMode:searchParams.get('mode')},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }, [mode, resolvedMode, returnId, schemeKey, isEdit, isFresh, isReturn, isScheme, searchParams]);

  const customers = useMemo(() => getCustomersForCreditNote(), []);
  const invoices = useMemo(() => listInvoicesForReference(), []);
  const salesReturns = useMemo(() => listSalesReturnsForCreditNote(), []);

  const [noteType, setNoteType] = useState<CreditNoteCreationMode>(
    isFresh ? "direct_adjustment" : "against_reference",
  );
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

  const [schemeSettlementKey, setSchemeSettlementKey] = useState("");
  const [schemeCode, setSchemeCode] = useState("");
  const [schemeName, setSchemeName] = useState("");
  const [schemeSettlementAmount, setSchemeSettlementAmount] = useState<number | undefined>();

  const [directReason, setDirectReason] = useState("");
  const [directRefNo, setDirectRefNo] = useState("");
  const [linkedInvoices, setLinkedInvoices] = useState<CreditNoteLinkedInvoice[]>([]);
  const [directAmount, setDirectAmount] = useState("");
  const [directGstApplicable, setDirectGstApplicable] = useState(false);
  const [directGstPct, setDirectGstPct] = useState("18");
  const [adjustmentLedgerId, setAdjustmentLedgerId] = useState<number | null>(null);
  const [adjustmentLedgerName, setAdjustmentLedgerName] = useState("");
  const [attachmentName, setAttachmentName] = useState("");

  const readOnly = isEdit && status === "cancelled";
  const isAgainstMode = noteType === "against_reference";
  const alreadyAdjustedNum = parseFloat(alreadyAdjusted) || 0;
  const customerLocked = (isAgainstMode && Boolean(referencePreview)) || isReturn || isScheme;

  const invoiceOptions = useMemo(
    () =>
      invoices.map((inv) => ({
        value: String(inv.id),
        label: inv.invoiceNo,
        sub: `${inv.customerName} · ${inv.invoiceDate} · ${formatINR(inv.grandTotal)}`,
      })),
    [invoices],
  );

  const linkedInvoiceOptions: LinkedInvoiceOption[] = useMemo(
    () =>
      invoices.map((inv) => ({
        id: inv.id,
        invoiceNo: inv.invoiceNo,
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
    if (isReturn || isScheme) return;
    setReferencePreview(null);
    setSourceInvoiceId(null);
    setSourceInvoiceNo("");
    setSourceOrderNo("");
    setSourceReturnId("");
    setSourceReturnNo("");
    setOriginalAmount("");
    setAlreadyAdjusted("0");
    setLines([]);
    setSchemeSettlementKey("");
    setSchemeCode("");
    setSchemeName("");
    setSchemeSettlementAmount(undefined);
  };

  const onInvoiceSelect = (id: string) => {
    setReferenceInvoiceId(id);
    setReferenceReturnId("");
    setSourceReturnId("");
    setSourceReturnNo("");
    if (!id) {
      clearReference();
      setLinkedInvoices([]);
      return;
    }
    const inv = invoices.find((i) => i.id === Number(id));
    if (inv) {
      setLinkedInvoices([{ id: inv.id, invoiceNo: inv.invoiceNo }]);
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
      if (preview.sourceInvoiceId && preview.sourceInvoiceNo) {
        setLinkedInvoices([{ id: preview.sourceInvoiceId, invoiceNo: preview.sourceInvoiceNo }]);
      }
      const c = customers.find(
        (x) => x.id === preview.customerId || x.customerName === ret.customer,
      );
      if (c) onCustomerChange(String(c.id), customerMasterToTransactionFields(c));
    }
  };

  const onNoteTypeChange = (modeVal: CreditNoteCreationMode) => {
    if (isReturn || isScheme) return;
    setNoteType(modeVal);
    clearReference();
    setReferenceInvoiceId("");
    setReferenceReturnId("");
    setDirectAmount("");
    setDirectReason("");
    setLinkedInvoices([]);
    setDirectRefNo("");
    setDirectGstApplicable(false);
    setLines([]);
    setError(null);
  };

  useEffect(() => {
    if (isEdit) return;
    const invId = invoiceIdFromUrl ?? searchParams.get("invoiceId");
    if (!invId || isReturn || isScheme || isFresh) return;
    setNoteType("against_reference");
    setReferenceDocType("sales_invoice");
    setReferenceInvoiceId(invId);
    onInvoiceSelect(invId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, searchParams, isReturn, isScheme, isFresh]);

  useEffect(() => {
    if (!isReturn || !returnId || isEdit) return;
    const pending = getPendingCreditNoteRow(returnId, "sales_return");
    const preview = buildReferenceFromSalesReturn(returnId);
    const ret = salesReturns.find((r) => r.id === returnId);
    if (!preview || !ret) return;

    setNoteType("against_reference");
    setReferenceDocType("sales_return");
    setReferenceReturnId(returnId);
    setSourceReturnId(ret.id);
    setSourceReturnNo(ret.returnNumber);
    if (pending?.returnDate) setCreditNoteDate(pending.returnDate);

    const linesWithQty = preview.lineItems.map((l) => ({
      ...l,
      returnQty: l.eligibleReturnQty ?? l.salesReturnQty ?? 0,
    }));
    const recalced = recalcAllCreditLines(linesWithQty, preview.alreadyAdjustedAmount);
    applyReferencePreview({ ...preview, lineItems: recalced });

    if (pending?.linkedInvoiceIds.length) {
      setLinkedInvoices(
        pending.linkedInvoiceIds.map((id, i) => ({
          id,
          invoiceNo: pending.linkedInvoiceNos[i] ?? invoices.find((inv) => inv.id === id)?.invoiceNo ?? "",
        })),
      );
    } else if (preview.sourceInvoiceId && preview.sourceInvoiceNo) {
      setLinkedInvoices([{ id: preview.sourceInvoiceId, invoiceNo: preview.sourceInvoiceNo }]);
    }

    const c = customers.find(
      (x) => x.id === preview.customerId || x.customerName === ret.customer,
    );
    if (c) onCustomerChange(String(c.id), customerMasterToTransactionFields(c));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReturn, returnId, isEdit, salesReturns, customers]);

  useEffect(() => {
    if (!isScheme || !schemeKey || isEdit) return;
    const opt = findPendingSchemeSettlement(schemeKey);
    const preview = opt ? buildReferenceFromInvoice(opt.invoiceId) : null;
    if (!opt || !preview) return;

    setNoteType("against_reference");
    setReferenceDocType("sales_invoice");
    setReferenceInvoiceId(String(opt.invoiceId));
    setSchemeSettlementKey(schemeKey);
    setSchemeCode(opt.schemeCode);
    setSchemeName(opt.schemeName);
    setSchemeSettlementAmount(opt.estimatedBenefitAmount);

    let schemeLines = creditLinesForSchemeSettlement(preview.lineItems, opt);
    if (opt.estimatedBenefitAmount > 0 && schemeLines.length > 0) {
      schemeLines = schemeLines.map((l, idx) =>
        idx === 0
          ? normalizeCreditLine({
              ...l,
              creditAmount: opt.estimatedBenefitAmount,
              returnQty: 0,
            })
          : l,
      );
    }
    applyReferencePreview({ ...preview, lineItems: schemeLines });

    setLinkedInvoices([{ id: opt.invoiceId, invoiceNo: opt.invoiceNo }]);

    const c = customers.find((x) => x.id === preview.customerId || x.customerName === opt.customerName);
    if (c) onCustomerChange(String(c.id), customerMasterToTransactionFields(c));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScheme, schemeKey, isEdit, customers]);

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
    setLinkedInvoices(
      rec.linkedInvoices?.length
        ? rec.linkedInvoices
        : rec.sourceInvoiceId && rec.sourceInvoiceNo
          ? [{ id: rec.sourceInvoiceId, invoiceNo: rec.sourceInvoiceNo }]
          : [],
    );
    setSourceReturnId(rec.sourceReturnId ?? "");
    setSourceReturnNo(rec.sourceReturnNo ?? "");
    setSchemeSettlementKey(rec.schemeSettlementKey ?? "");
    setSchemeCode(rec.schemeCode ?? "");
    setSchemeName(rec.schemeName ?? "");
    setSchemeSettlementAmount(rec.schemeSettlementAmount);
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
      const base = line?.unitPrice ?? rec.taxableValue ?? rec.currentCreditAmount;
      setDirectAmount(String(base));
      setDirectGstApplicable((line?.taxPct ?? 0) > 0);
      setDirectGstPct(String(line?.taxPct ?? 18));
      setDirectRefNo(rec.referenceNo ?? "");
      setAdjustmentLedgerId(rec.adjustmentLedgerId ?? null);
      setAdjustmentLedgerName(rec.adjustmentLedgerName ?? "");
      setAttachmentName(rec.attachmentName ?? "");
    } else {
      const loadedLines = rec.lineItems.length ? rec.lineItems.map((l) => normalizeCreditLine(l)) : [];
      setLines(recalcAllCreditLines(loadedLines, rec.alreadyAdjustedAmount));
      if (rec.sourceInvoiceId) {
        const p = buildReferenceFromInvoice(rec.sourceInvoiceId);
        if (p) setReferencePreview(p);
      }
    }
  }, [isEdit, creditNoteId, router, customers]);

  const freshTotals = computeFreshCreditTotals(directAmount, directGstApplicable, directGstPct);
  const subTotal = isAgainstMode
    ? lines.reduce((s, l) => s + l.creditAmount, 0)
    : freshTotals.total;
  const grandTotal = Math.max(0, subTotal + (isAgainstMode ? adjustment : 0));
  const gstSplit = isAgainstMode
    ? computeCreditNoteGstSplit(lines)
    : {
        taxable: freshTotals.taxable,
        taxAmount: freshTotals.gstAmount,
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
    if (freshTotals.total <= 0) return [];
    return [
      normalizeCreditLine({
        ...createEmptyCreditLine(),
        productName: directReason || "Direct Adjustment",
        returnQty: 1,
        unitPrice: freshTotals.taxable,
        taxPct: directGstApplicable ? parseFloat(directGstPct) || 0 : 0,
        creditAmount: freshTotals.total,
        gstAmount: freshTotals.gstAmount,
        lineAmount: freshTotals.total,
      }),
    ];
  };

  const resolveSource = (): CreditNoteSource => {
    if (isFresh || noteType === "direct_adjustment") return "manual";
    if (isScheme || schemeSettlementKey) return "payment_discount_scheme";
    if (isReturn || referenceReturnId || sourceReturnId) return "sales_return";
    return "manual";
  };

  const buildInput = (nextStatus: NoteWorkflowStatus) => {
    const isDirect = noteType === "direct_adjustment";
    const primaryLinked = linkedInvoices[0];
    const refInvId = primaryLinked?.id ?? sourceInvoiceId;
    const refInvNo =
      primaryLinked?.invoiceNo ??
      (sourceInvoiceNo || invoices.find((i) => i.id === refInvId)?.invoiceNo || "");

    return {
      creditNoteDate,
      customerId: customerId ? Number(customerId) : null,
      customerName: resolveCustomerName(),
      receivableLedger: customerLedgerName,
      billingAddress,
      shippingAddress,
      sourceInvoiceId: refInvId,
      sourceInvoiceNo: refInvNo,
      linkedInvoices: linkedInvoices.length ? linkedInvoices : undefined,
      sourceOrderId: null,
      sourceOrderNo,
      originalAmount: isDirect ? freshTotals.total : original,
      alreadyAdjustedAmount: isDirect ? 0 : alreadyAdjustedNum,
      lineItems: isDirect
        ? buildDirectLineItems()
        : lines.filter((l) => l.productName && (l.returnQty > 0 || l.creditAmount > 0)),
      reason: isDirect
        ? directReason || "Other Adjustment"
        : isScheme
          ? "Near Expiry Scheme Settlement"
          : "Sales return",
      remarks: isDirect ? remarks || directRefNo : remarks,
      status: nextStatus,
      source: resolveSource(),
      sourceReturnId: referenceReturnId || sourceReturnId || undefined,
      sourceReturnNo: sourceReturnNo || undefined,
      schemeSettlementKey: schemeSettlementKey || undefined,
      schemeCode: schemeCode || undefined,
      schemeName: schemeName || undefined,
      schemeSettlementAmount: schemeSettlementAmount ?? (isScheme ? grandTotal : undefined),
      adjustmentLedgerId: isDirect ? adjustmentLedgerId ?? undefined : undefined,
      adjustmentLedgerName: isDirect ? adjustmentLedgerName || undefined : undefined,
      referenceNo: isDirect ? directRefNo || undefined : undefined,
      attachmentName: isDirect ? attachmentName || undefined : undefined,
    };
  };

  const validateForPost = (): boolean => {
    if (!resolveCustomerName().trim()) {
      setError("Select a customer before saving.");
      return false;
    }
    if (noteType === "direct_adjustment") {
      if (!directReason.trim()) {
        setError("Select a reason for the direct adjustment.");
        return false;
      }
      if (!adjustmentLedgerId && !adjustmentLedgerName) {
        setError("Select an adjustment ledger.");
        return false;
      }
      if (freshTotals.total <= 0) {
        setError("Enter a valid adjustment amount.");
        return false;
      }
    } else {
      if (!referencePreview) {
        setError("Select a sales invoice or sales return.");
        return false;
      }
      try {
        validateCreditNoteLines(lines);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Invalid line quantities.");
        return false;
      }
      if (grandTotal <= 0) {
        setError("Enter credit qty on at least one line.");
        return false;
      }
    }
    return true;
  };

  const saveDraft = () => {
    setError(null);
    try {
      if (!resolveCustomerName().trim()) {
        setError("Select a customer before saving.");
        return;
      }
      if (isEdit && creditNoteId != null) {
        updateCreditNote(creditNoteId, buildInput("draft"), { requireAmount: false });
        dispatchAccountsDataChanged("credit-notes");
        showToast("Credit note saved as draft");
        router.push(`${CREDIT_NOTES_LIST_PATH}/${creditNoteId}`);
      } else {
        const rec = createCreditNote(buildInput("draft"), { requireAmount: false });
        dispatchAccountsDataChanged("credit-notes");
        showToast("Credit note saved as draft");
        router.push(`${CREDIT_NOTES_LIST_PATH}/${rec.id}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save draft.");
    }
  };

  const postNote = () => {
    setError(null);
    if (!validateForPost()) return;
    try {
      if (isEdit && creditNoteId != null) {
        updateCreditNote(creditNoteId, buildInput("draft"));
        postCreditNote(creditNoteId);
        dispatchAccountsDataChanged("credit-notes");
        showToast("Credit note posted successfully");
        router.push(`${CREDIT_NOTES_LIST_PATH}/${creditNoteId}`);
      } else {
        const rec = createCreditNote(buildInput("draft"));
        postCreditNote(rec.id);
        dispatchAccountsDataChanged("credit-notes");
        showToast("Credit note posted successfully");
        router.push(`${CREDIT_NOTES_LIST_PATH}/${rec.id}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not post credit note.");
    }
  };

  const formTitle = isEdit
    ? "Edit Credit Note"
    : isReturn
      ? "Generate Credit Note — Sales Return"
      : isScheme
        ? "Generate Credit Note — Scheme"
        : isFresh
          ? "Create Credit Note"
          : "New Credit Note";

  const impactLines = buildCreditNoteLedgerImpact({
    customerLedgerName,
    customerName: resolveCustomerName(),
    taxable: gstSplit.taxable,
    taxAmount: gstSplit.taxAmount,
    grandTotal,
    isSchemeSettlement: Boolean(schemeSettlementKey) || isScheme,
    isManualAdjustment: noteType === "direct_adjustment",
    adjustmentLedgerName: adjustmentLedgerName || undefined,
  });

  const [baselineReady, setBaselineReady] = useState(false);
  useEffect(() => {
    setBaselineReady(false);
    const id = window.setTimeout(() => setBaselineReady(true), 350);
    return () => window.clearTimeout(id);
  }, [creditNoteId, isReturn, isScheme, isFresh, searchParams.toString()]);

  const formSnapshot = useMemo(
    () => ({
      noteType,
      creditNoteDate,
      customerId,
      referenceInvoiceId,
      lines,
      remarks,
      linkedInvoices,
      directReason,
      directRefNo,
      directAmount,
      directGstApplicable,
      directGstPct,
      adjustmentLedgerId,
      schemeSettlementKey,
    }),
    [
      noteType,
      creditNoteDate,
      customerId,
      referenceInvoiceId,
      lines,
      remarks,
      linkedInvoices,
      directReason,
      directRefNo,
      directAmount,
      directGstApplicable,
      directGstPct,
      adjustmentLedgerId,
      schemeSettlementKey,
    ],
  );
  const isDirty = useFormDirtySnapshot(formSnapshot, { ready: baselineReady && !readOnly });
  const { requestCancel, discardDialog } = useTransactionFormCancel({
    listHref: CREDIT_NOTES_LIST_PATH,
    isDirty,
  });

  return (
    <>
    <AccountsFormLayout
      fullWidth
      onBackClick={readOnly ? undefined : requestCancel}
      title={formTitle}
      breadcrumb={[...CREDIT_NOTES_BREADCRUMB]}
      code={creditNoteNo || undefined}
      footer={
        readOnly ? (
          <Button variant="outline" size="sm" className="h-9 text-sm font-medium" onClick={() => router.push(CREDIT_NOTES_LIST_PATH)}>
            Back
          </Button>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs font-medium"
              onClick={requestCancel}
            >
              Cancel
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs font-medium gap-1.5" onClick={saveDraft}>
              <Save className="w-3.5 h-3.5" /> Save Draft
            </Button>
            <Button size="sm" className="h-8 text-xs font-medium bg-brand-600 hover:bg-brand-700 text-white" onClick={postNote}>
              Post Credit Note
            </Button>
          </div>
        )
      }
    >
      <div className="bg-white border border-border/60 rounded-lg shadow-sm">
        <div className="px-6 py-5 border-b border-border/60 space-y-4">
          {!isReturn && !isScheme && (
            <NoteTypeSelector
              value={noteType}
              options={NOTE_TYPE_OPTIONS}
              onChange={onNoteTypeChange}
              disabled={readOnly}
            />
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Credit Note No.</Label>
              <Input className="h-9 text-sm font-mono bg-muted/20" disabled value={isEdit ? creditNoteNo : "Auto-generated"} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Credit Note Date</Label>
              <AccountsDateInput
                value={creditNoteDate}
                onChange={setCreditNoteDate}
                disabled={readOnly}
                aria-label="Credit note date"
                className="h-9 text-sm"
              />
            </div>
          </div>
        </div>

        {isReturn && referencePreview && (
          <div className="px-6 py-4 border-b border-border/60 bg-muted/10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Sales Return Reference</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div><span className="text-muted-foreground">Return No.</span><p className="font-mono font-medium">{sourceReturnNo}</p></div>
              <div><span className="text-muted-foreground">Invoice</span><p className="font-mono font-medium">{sourceInvoiceNo || "—"}</p></div>
              <div><span className="text-muted-foreground">Sales Order</span><p className="font-mono font-medium">{sourceOrderNo || "—"}</p></div>
            </div>
          </div>
        )}

        {isScheme && schemeCode && (
          <div className="px-6 py-4 border-b border-border/60 bg-muted/10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Scheme Settlement Reference</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div><span className="text-muted-foreground">Scheme Code</span><p className="font-mono font-medium">{schemeCode}</p></div>
              <div><span className="text-muted-foreground">Scheme Name</span><p className="font-medium">{schemeName}</p></div>
              <div><span className="text-muted-foreground">Invoice</span><p className="font-mono font-medium">{sourceInvoiceNo || "—"}</p></div>
              <div><span className="text-muted-foreground">Est. Benefit</span><p className="font-medium tabular-nums">{formatINR(schemeSettlementAmount ?? 0)}</p></div>
            </div>
          </div>
        )}

        {isAgainstMode ? (
          <>
            {!isReturn && !isScheme && (
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
                        "h-7 px-2.5 text-sm font-medium rounded-md border",
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
                  <p className="text-xs text-muted-foreground">
                    Invoice total {formatINR(referencePreview.originalAmount)} · Already credited{" "}
                    {formatINR(referencePreview.alreadyAdjustedAmount)}
                  </p>
                )}
              </div>
            )}

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

            {(referencePreview || isReturn || isScheme) && (
              <div className="px-6 py-4 border-b border-border/60">
                <LinkedInvoicesMultiSelect
                  value={linkedInvoices}
                  onChange={setLinkedInvoices}
                  options={linkedInvoiceOptions}
                  disabled={readOnly}
                />
              </div>
            )}

            <div className="px-6 py-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground">Product Lines</h3>
              {lines.length > 0 ? (
                <CreditNoteProductTable lines={lines} readOnly={readOnly} onQtyChange={onCreditQtyChange} />
              ) : (
                <p className="text-xs text-muted-foreground py-6 text-center border border-dashed border-border rounded-xl">
                  Select an invoice or sales return to load product lines.
                </p>
              )}

              {lines.length > 0 && (
                <div className="flex justify-end pt-2">
                  <div className="w-full sm:w-80 border border-border/60 rounded-lg p-4 bg-muted/5 space-y-2 text-xs">
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
            <FreshCreditNoteForm
              customerSelector={
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
              referenceNo={directRefNo}
              onReferenceNoChange={setDirectRefNo}
              linkedInvoices={linkedInvoices}
              onLinkedInvoicesChange={setLinkedInvoices}
              linkedInvoiceOptions={linkedInvoiceOptions}
              adjustmentLedgerId={adjustmentLedgerId}
              onAdjustmentLedgerChange={(l) => {
                setAdjustmentLedgerId(l.id);
                setAdjustmentLedgerName(l.accountName);
              }}
              taxableAmount={directAmount}
              onTaxableAmountChange={setDirectAmount}
              gstPct={directGstPct}
              onGstPctChange={setDirectGstPct}
              gstApplicable={directGstApplicable}
              onGstApplicableChange={setDirectGstApplicable}
              narration={remarks}
              onNarrationChange={setRemarks}
              attachmentName={attachmentName}
              onAttachmentChange={setAttachmentName}
              disabled={readOnly}
            />
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
    <AccountsToast toast={toast} onDismiss={dismissToast} />
    {discardDialog}
    </>
  );
}
