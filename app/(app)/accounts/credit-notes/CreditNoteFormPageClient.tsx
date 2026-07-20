"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { useFormDirtySnapshot } from "@/lib/accounts/use-form-dirty-snapshot";
import { useTransactionFormCancel } from "@/components/accounts/TransactionFormCancel";
import { Save } from "lucide-react";
import { AccountsFormLayout } from "../expenses/components/AccountsFormLayout";
import { SearchableSelect } from "./components/SearchableSelect";
import { NoteTypeSelector } from "./components/NoteTypeSelector";
import { FreshCreditNoteForm, computeFreshCreditTotals } from "./components/FreshCreditNoteForm";
import { LinkedInvoicesMultiSelect, type LinkedInvoiceOption } from "./components/LinkedInvoicesMultiSelect";
import { CreditNoteProductTable } from "./components/CreditNoteProductTable";
import { CreditNoteCustomerInfoButton } from "./components/CreditNoteCustomerInfoButton";
import { buildCreditNoteLedgerImpact } from "./credit-note-accounting";
import { computeNoteTaxBreakup } from "@/lib/accounts/note-tax-breakup";
import { inferInterstateFromPlaceOfSupply } from "@/lib/accounts/gst-accounting";
import {
  isInterstateGstTreatment,
  isGstApplicableTreatment,
} from "@/lib/accounts/scheme-entitlement-credit-note";
import {
  applyReturnQtyToLines,
  buildReferenceFromInvoice,
  buildReferenceFromSalesReturn,
  createCreditNote,
  createEmptyCreditLine,
  creditLinesForSchemeSettlement,
  getCreditLineMaxQty,
  getCreditNoteById,
  getCustomersForCreditNote,
  listInvoicesForReference,
  listSalesReturnsForCreditNote,
  normalizeCreditLine,
  peekNextCreditNoteNo,
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
import {
  buildCreditNotePrefillFromEntitlement,
  resolveEntitlementCreditNoteNavigation,
  SCHEME_ENTITLEMENT_LEDGER_ERROR,
} from "@/lib/accounts/scheme-entitlement-credit-note";
import { getPendingCreditNoteRow } from "./pending-credit-notes-data";
import { CREDIT_NOTES_BREADCRUMB, CREDIT_NOTES_LIST_PATH, formatINR } from "./note-utils";
import { LedgerImpactPreview } from "@/components/accounts/LedgerImpactPreview";
import { AccountsDateInput } from "@/components/accounts/AccountsDateInput";
import { dispatchAccountsDataChanged } from "@/lib/accounts/accounts-data-events";
import { AccountsToast, useAccountsToast } from "@/components/accounts/AccountsToast";
import { getInvoiceById } from "@/app/(app)/accounts/invoices/invoices-data";
import { WarehouseMappedBankAccountSelect } from "@/components/accounts/WarehouseMappedBankAccountSelect";
import { Textarea } from "@/components/ui/textarea";
import "./credit-note-tx.css";

type FormMode = "fresh" | "return" | "scheme";

const NOTE_TYPE_OPTIONS: { value: CreditNoteCreationMode; label: string; description?: string }[] = [
  { value: "direct_adjustment", label: "Amount Based", description: "Direct amount adjustment" },
  {
    value: "against_reference",
    label: "Quantity Based",
    description: "Against sales invoice / sales return",
  },
];

export default function CreditNoteFormPageClient({
  creditNoteId,
  returnId: returnIdProp,
  schemeKey: schemeKeyProp,
  entitlementId: entitlementIdProp,
  invoiceId: invoiceIdProp,
  mode,
}: {
  creditNoteId?: number;
  returnId?: string;
  schemeKey?: string;
  entitlementId?: string;
  invoiceId?: string;
  mode?: FormMode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast, showToast, dismissToast } = useAccountsToast();
  const isEdit = creditNoteId != null;
  const returnId = returnIdProp ?? searchParams.get("returnId") ?? undefined;
  const schemeKey = schemeKeyProp ?? searchParams.get("schemeKey") ?? undefined;
  const entitlementId =
    entitlementIdProp ?? searchParams.get("entitlementId") ?? undefined;
  const invoiceIdFromUrl = invoiceIdProp ?? searchParams.get("invoiceId") ?? undefined;
  const modeFromUrl = searchParams.get("mode");
  const resolvedMode: FormMode | undefined =
    mode ??
    (modeFromUrl === "fresh" || modeFromUrl === "return" || modeFromUrl === "scheme"
      ? modeFromUrl
      : returnId
        ? "return"
        : schemeKey || entitlementId
          ? "scheme"
          : undefined);
  const isFresh = !isEdit && resolvedMode === "fresh";
  const isReturn = !isEdit && (resolvedMode === "return" || Boolean(returnId));
  const isScheme =
    !isEdit && (resolvedMode === "scheme" || Boolean(schemeKey) || Boolean(entitlementId));
  const isEntitlementScheme = isScheme && Boolean(entitlementId);

  const customers = useMemo(() => getCustomersForCreditNote(), []);
  const invoices = useMemo(() => listInvoicesForReference(), []);
  const salesReturns = useMemo(() => listSalesReturnsForCreditNote(), []);

  const [noteType, setNoteType] = useState<CreditNoteCreationMode>(
    isFresh ? "direct_adjustment" : "against_reference",
  );
  const [referenceDocType, setReferenceDocType] = useState<CreditReferenceDocType>("sales_invoice");
  const [creditNoteNo, setCreditNoteNo] = useState("");
  const [creditNoteDate, setCreditNoteDate] = useState(new Date().toISOString().slice(0, 10));
  const [bankAccountId, setBankAccountId] = useState<number | null>(null);
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
  const [schemeEntitlementId, setSchemeEntitlementId] = useState("");
  const [schemeId, setSchemeId] = useState("");
  const [schemeType, setSchemeType] = useState("");
  const [calculationReference, setCalculationReference] = useState("");
  const [sourceInvoiceIds, setSourceInvoiceIds] = useState<number[]>([]);
  const [schemePeriod, setSchemePeriod] = useState("");
  const [schemeClaimNumber, setSchemeClaimNumber] = useState("");
  const [gstTreatment, setGstTreatment] = useState("");
  const [eligibleBase, setEligibleBase] = useState<number | undefined>();
  const [ledgerConfigError, setLedgerConfigError] = useState<string | null>(null);

  const [directReason, setDirectReason] = useState("");
  const [directParticular, setDirectParticular] = useState("");
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
    if (!isScheme || !schemeKey || entitlementId || isEdit) return;
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
  }, [isScheme, schemeKey, entitlementId, isEdit, customers]);

  useEffect(() => {
    if (!isEntitlementScheme || !entitlementId || isEdit) return;

    const nav = resolveEntitlementCreditNoteNavigation(entitlementId);
    if (nav.kind === "open_draft") {
      router.replace(nav.href);
      return;
    }
    if (nav.kind === "open_existing") {
      router.replace(nav.href);
      return;
    }

    try {
      const prefill = buildCreditNotePrefillFromEntitlement(entitlementId);
      setLedgerConfigError(null);
      setNoteType("against_reference");
      setReferenceDocType("sales_invoice");
      setSchemeEntitlementId(prefill.entitlement.id);
      setSchemeId(prefill.schemeId);
      setSchemeType(prefill.schemeType);
      setSchemeCode(prefill.schemeCode);
      setSchemeName(prefill.schemeName);
      setSchemePeriod(prefill.schemePeriod);
      setSchemeClaimNumber(prefill.schemeClaimNumber);
      setCalculationReference(prefill.calculationReference);
      setGstTreatment(prefill.gstTreatment);
      setEligibleBase(prefill.eligibleBase);
      setSchemeSettlementAmount(prefill.creditNoteAmount);
      setSourceInvoiceIds(prefill.sourceInvoiceIds);
      setAdjustmentLedgerId(prefill.ledger.id);
      setAdjustmentLedgerName(prefill.ledger.name);
      setLinkedInvoices(prefill.linkedInvoices);
      setSourceInvoiceId(prefill.sourceInvoiceId);
      setSourceInvoiceNo(prefill.sourceInvoiceNo);
      if (prefill.sourceInvoiceId) {
        setReferenceInvoiceId(String(prefill.sourceInvoiceId));
      }
      applyReferencePreview(prefill.referencePreview);
      setLines(
        recalcAllCreditLines(
          prefill.lines.map((l) => normalizeCreditLine(l)),
          0,
        ),
      );
      setRemarks(prefill.narration);
      setOriginalAmount(String(prefill.eligibleBase));
      setAlreadyAdjusted("0");

      const c = customers.find(
        (x) =>
          x.id === prefill.customerId ||
          x.customerName === prefill.customerName,
      );
      if (c) onCustomerChange(String(c.id), customerMasterToTransactionFields(c));
      else {
        setCustomerId(prefill.customerId ? String(prefill.customerId) : "");
        setCustomerFields(null);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : SCHEME_ENTITLEMENT_LEDGER_ERROR;
      setLedgerConfigError(msg);
      setError(msg);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEntitlementScheme, entitlementId, isEdit, customers, router]);

  useEffect(() => {
    if (isEdit) return;
    setCreditNoteNo(peekNextCreditNoteNo());
  }, [isEdit]);

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
    setSchemeEntitlementId(rec.schemeEntitlementId ?? "");
    setSchemeId(rec.schemeId ?? "");
    setSchemeType(rec.schemeType ?? "");
    setCalculationReference(rec.calculationReference ?? "");
    setSourceInvoiceIds(rec.sourceInvoiceIds ?? []);
    if (rec.schemeEntitlementId) {
      setAdjustmentLedgerId(rec.adjustmentLedgerId ?? null);
      setAdjustmentLedgerName(rec.adjustmentLedgerName ?? "");
    }
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
    setBankAccountId(rec.bankAccountId ?? null);
    setStatus(rec.status);
    if (isDirect) {
      setDirectReason(rec.reason);
      const line = rec.lineItems[0];
      setDirectParticular(
        (line?.description || line?.productName || "").trim() || "",
      );
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
  const placeOfSupply =
    customerFields?.placeOfSupply?.trim() ||
    selectedCustomer?.stateName?.trim() ||
    "";
  const interstateFromPos = inferInterstateFromPlaceOfSupply(placeOfSupply);
  const interstate =
    isScheme && gstTreatment.trim()
      ? isInterstateGstTreatment(gstTreatment)
        ? true
        : /cgst|sgst|intra/i.test(gstTreatment)
          ? false
          : interstateFromPos
      : interstateFromPos;

  const againstLinesForTax = lines.filter(
    (l) => l.productName && (l.returnQty > 0 || l.creditAmount > 0),
  );
  const taxBreakup = isAgainstMode
    ? computeNoteTaxBreakup(againstLinesForTax, interstate)
    : computeNoteTaxBreakup(
        [
          {
            creditAmount: freshTotals.total,
            taxPct: directGstApplicable ? parseFloat(directGstPct) || 0 : 0,
          },
        ],
        interstate,
      );

  const discountTotal = isAgainstMode
    ? againstLinesForTax.reduce((s, l) => {
        if (l.returnQty <= 0 || l.unitPrice <= 0 || !(l.discountPct > 0)) return s;
        const base = Math.round(l.returnQty * l.unitPrice * 100) / 100;
        return s + Math.round(base * (l.discountPct / 100) * 100) / 100;
      }, 0)
    : 0;

  const subTotal = isAgainstMode ? taxBreakup.taxableValue : freshTotals.taxable;
  const grandTotal = Math.max(
    0,
    (isAgainstMode ? taxBreakup.total : freshTotals.total) + (isAgainstMode ? adjustment : 0),
  );
  const gstSplit = {
    taxable: taxBreakup.taxableValue,
    taxAmount: taxBreakup.taxAmount,
    grandTotal,
  };
  const cgstDisplay = taxBreakup.cgstAmount;
  const sgstDisplay = taxBreakup.sgstAmount;
  const igstDisplay = taxBreakup.igstAmount;
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
    const particular =
      directParticular.trim() || "Adjustment";
    return [
      normalizeCreditLine({
        ...createEmptyCreditLine(),
        productName: particular,
        description: directParticular.trim(),
        reason: particular,
        returnQty: 1,
        unitPrice: freshTotals.taxable,
        taxPct: directGstApplicable ? parseFloat(directGstPct) || 0 : 0,
        creditAmount: freshTotals.total,
        gstAmount: freshTotals.gstAmount,
        lineAmount: freshTotals.total,
      }),
    ];
  };

  const warehouseRef = useMemo(() => {
    const invId =
      linkedInvoices[0]?.id ??
      (referenceInvoiceId ? Number(referenceInvoiceId) : null) ??
      sourceInvoiceId;
    if (invId && Number.isFinite(invId)) {
      return getInvoiceById(invId)?.warehouse ?? null;
    }
    return null;
  }, [linkedInvoices, referenceInvoiceId, sourceInvoiceId]);

  const resolveSource = (): CreditNoteSource => {
    if (isFresh || noteType === "direct_adjustment") return "manual";
    if (isScheme || schemeSettlementKey || schemeEntitlementId) return "payment_discount_scheme";
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
      placeOfSupply: placeOfSupply || undefined,
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
        ? directParticular.trim() || "Other"
        : isEntitlementScheme || schemeEntitlementId
          ? "Scheme Settlement"
          : isScheme
            ? "Near Expiry Scheme Settlement"
            : "Sales return",
      remarks,
      status: nextStatus,
      source: resolveSource(),
      sourceReturnId: referenceReturnId || sourceReturnId || undefined,
      sourceReturnNo: sourceReturnNo || undefined,
      schemeSettlementKey: schemeSettlementKey || undefined,
      schemeCode: schemeCode || undefined,
      schemeName: schemeName || undefined,
      schemeSettlementAmount: schemeSettlementAmount ?? (isScheme ? grandTotal : undefined),
      schemeEntitlementId: schemeEntitlementId || undefined,
      schemeId: schemeId || undefined,
      schemeType: schemeType || undefined,
      calculationReference: calculationReference || undefined,
      sourceInvoiceIds: sourceInvoiceIds.length ? sourceInvoiceIds : undefined,
      adjustmentLedgerId:
        isDirect || schemeEntitlementId
          ? adjustmentLedgerId ?? undefined
          : undefined,
      adjustmentLedgerName:
        isDirect || schemeEntitlementId
          ? adjustmentLedgerName || undefined
          : undefined,
      referenceNo: isDirect ? directRefNo || undefined : undefined,
      attachmentName: isDirect ? attachmentName || undefined : undefined,
      warehouse: warehouseRef ?? undefined,
      bankAccountId,
    };
  };

  const validateForPost = (): boolean => {
    if (ledgerConfigError) {
      setError(ledgerConfigError);
      return false;
    }
    if (!resolveCustomerName().trim()) {
      setError("Select a customer before saving.");
      return false;
    }
    if (schemeEntitlementId && !adjustmentLedgerId && !adjustmentLedgerName.trim()) {
      setError(SCHEME_ENTITLEMENT_LEDGER_ERROR);
      return false;
    }
    if (noteType === "direct_adjustment") {
      if (!directParticular.trim()) {
        setError("Enter a particular / description for the adjustment.");
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
        setError(
          isEntitlementScheme || schemeEntitlementId
            ? "Credit Note amount must be greater than zero."
            : "Enter credit qty on at least one line.",
        );
        return false;
      }
    }
    return true;
  };

  const saveDraft = () => {
    setError(null);
    try {
      if (ledgerConfigError) {
        setError(ledgerConfigError);
        return;
      }
      if (!resolveCustomerName().trim()) {
        setError("Select a customer before saving.");
        return;
      }
      if (schemeEntitlementId && !adjustmentLedgerId && !adjustmentLedgerName.trim()) {
        setError(SCHEME_ENTITLEMENT_LEDGER_ERROR);
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
    isSchemeSettlement: Boolean(schemeSettlementKey) || isScheme || Boolean(schemeEntitlementId),
    isManualAdjustment: noteType === "direct_adjustment",
    adjustmentLedgerName: adjustmentLedgerName || undefined,
    cgst: cgstDisplay,
    sgst: sgstDisplay,
    igst: igstDisplay,
    interstate,
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
      directParticular,
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
      directParticular,
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
  const invoiceCountForScheme =
    sourceInvoiceIds.length ||
    linkedInvoices.length ||
    (sourceInvoiceNo ? 1 : 0);
  const showGstBreakup =
    taxBreakup.taxAmount > 0 ||
    (!isAgainstMode && directGstApplicable) ||
    (isScheme && isGstApplicableTreatment(gstTreatment));

  const stickyActions = (
    <div className="cnz-footer">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 text-xs"
        onClick={requestCancel}
      >
        Cancel
      </Button>
      {!readOnly ? (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={saveDraft}
            disabled={Boolean(ledgerConfigError)}
          >
            <Save className="w-3.5 h-3.5" /> Save Draft
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs bg-brand-600 hover:bg-brand-700 text-white"
            onClick={postNote}
            disabled={Boolean(ledgerConfigError)}
          >
            Save & Post
          </Button>
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">Read-only</span>
      )}
    </div>
  );

  return (
    <>
      <div className="h-full min-h-0 flex flex-col">
      <AccountsFormLayout
        fullWidth
        onBackClick={readOnly ? undefined : requestCancel}
        title={formTitle}
        breadcrumb={[...CREDIT_NOTES_BREADCRUMB]}
        code={creditNoteNo || undefined}
        headerMeta={
          creditNoteNo ? (
            <span className="inline-flex items-center h-6 px-2 rounded-md border border-brand-200 bg-brand-50 font-mono text-[11px] font-semibold text-brand-700">
              {creditNoteNo}
            </span>
          ) : null
        }
        stickyFooter={stickyActions}
      >
        <div className="cnz">
          {error ? <div className="cnz-alert">{error}</div> : null}
          {ledgerConfigError ? <div className="cnz-alert">{ledgerConfigError}</div> : null}

          <div className="cnz-head">
            <div className="cnz-f">
              <label>
                Customer<span className="cnz-req">*</span>
                <CreditNoteCustomerInfoButton
                  customer={selectedCustomer}
                  placeOfSupply={placeOfSupply}
                />
              </label>
              {customerLocked ? (
                <p className="cnz-ro font-medium">{resolveCustomerName() || "—"}</p>
              ) : (
                <SearchableSelect
                  label=""
                  options={customers.map((cust) => ({
                    value: String(cust.id),
                    label: cust.customerName,
                    sub: cust.customerCode,
                  }))}
                  value={customerId}
                  onChange={(id) => {
                    const cust = customers.find((x) => x.id === Number(id));
                    onCustomerChange(id, cust ? customerMasterToTransactionFields(cust) : null);
                  }}
                  placeholder="Select customer"
                  required
                  disabled={readOnly}
                />
              )}
            </div>
            <div className="cnz-f">
              <label>Credit Note No.</label>
              <p className="cnz-ro cnz-ro--mono" title="Auto-generated">
                {creditNoteNo || "…"}
              </p>
            </div>
            <div className="cnz-f">
              <label>Credit Note Date</label>
              <AccountsDateInput
                value={creditNoteDate}
                onChange={setCreditNoteDate}
                disabled={readOnly}
                aria-label="Credit note date"
                className="h-7 text-xs"
              />
            </div>

            <div className="cnz-f">
              <label>Reference No.</label>
              <Input
                className="h-7 text-xs"
                value={directRefNo}
                onChange={(e) => setDirectRefNo(e.target.value)}
                placeholder="Optional"
                disabled={readOnly || isScheme}
              />
            </div>
            <div className="cnz-f">
              <label>Salesperson</label>
              <p className="cnz-ro text-xs">{selectedCustomer?.salesManName || "—"}</p>
            </div>
            <div className="cnz-f">
              <label>Credit Note Basis</label>
              {!isReturn && !isScheme ? (
                <NoteTypeSelector
                  hideLabel
                  label="Credit Note Basis"
                  value={noteType}
                  options={NOTE_TYPE_OPTIONS}
                  onChange={onNoteTypeChange}
                  disabled={readOnly}
                />
              ) : (
                <p className="cnz-ro text-xs">
                  {isScheme ? "Scheme" : "Quantity Based"}
                  {isScheme && schemeCode ? ` · ${schemeCode}` : ""}
                  {isReturn && sourceReturnNo ? ` · ${sourceReturnNo}` : ""}
                </p>
              )}
            </div>

            <div className="cnz-f">
              <label>{isAgainstMode && !isScheme ? "Reference Document" : "Linked Invoice"}</label>
              {isAgainstMode && !isReturn && !isScheme ? (
                <div className="space-y-1.5">
                  <div className="cnz-radios">
                    {(
                      [
                        { value: "sales_invoice" as const, label: "Sales Invoice" },
                        { value: "sales_return" as const, label: "Sales Return" },
                      ] as const
                    ).map((opt) => (
                      <label key={opt.value}>
                        <input
                          type="radio"
                          name="cn-ref-doc"
                          checked={referenceDocType === opt.value}
                          disabled={readOnly}
                          onChange={() => {
                            setReferenceDocType(opt.value);
                            clearReference();
                            setReferenceInvoiceId("");
                            setReferenceReturnId("");
                          }}
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                  {referenceDocType === "sales_invoice" ? (
                    <SearchableSelect
                      label=""
                      value={referenceInvoiceId}
                      onChange={onInvoiceSelect}
                      options={invoiceOptions}
                      placeholder="Select invoice"
                      required
                      disabled={readOnly}
                    />
                  ) : (
                    <SearchableSelect
                      label=""
                      value={referenceReturnId}
                      onChange={onSalesReturnSelect}
                      options={salesReturnOptions}
                      placeholder="Select sales return"
                      required
                      disabled={readOnly}
                    />
                  )}
                </div>
              ) : isReturn ? (
                <p className="cnz-ro font-mono text-[13px]">{sourceInvoiceNo || "—"}</p>
              ) : isScheme ? (
                <p className="cnz-ro text-[13px]">
                  {invoiceCountForScheme > 0
                    ? `${invoiceCountForScheme} Invoice${invoiceCountForScheme === 1 ? "" : "s"}`
                    : "—"}
                </p>
              ) : (
                <LinkedInvoicesMultiSelect
                  label=""
                  value={linkedInvoices}
                  onChange={setLinkedInvoices}
                  options={linkedInvoiceOptions}
                  disabled={readOnly}
                />
              )}
            </div>

            {isScheme ? (
              <>
                <div className="cnz-f">
                  <label>Claim Number</label>
                  <p className="cnz-ro font-mono text-[13px]">{schemeClaimNumber || "—"}</p>
                </div>
                <div className="cnz-f">
                  <label>Scheme Type</label>
                  <p className="cnz-ro text-[13px]">{schemeType || "—"}</p>
                </div>
                <div className="cnz-f">
                  <label>Scheme Period</label>
                  <p className="cnz-ro text-[13px]">{schemePeriod || "—"}</p>
                </div>
                <div className="cnz-f">
                  <label>Mapped Ledger</label>
                  <p className="cnz-ro text-[13px] truncate" title={adjustmentLedgerName || undefined}>
                    {adjustmentLedgerName || "—"}
                  </p>
                </div>
                <div className="cnz-f cnz-head__span2">
                  <label>Calculation Reference</label>
                  <p className="cnz-ro text-[13px] truncate">{calculationReference || "—"}</p>
                </div>
                <div className="cnz-f">
                  <label>GST Treatment</label>
                  <p className="cnz-ro text-[13px]">
                    {gstTreatment || (interstate ? "IGST" : "CGST + SGST")}
                  </p>
                </div>
              </>
            ) : null}

            {isReturn && referencePreview ? (
              <>
                <div className="cnz-f">
                  <label>Sales Return</label>
                  <p className="cnz-ro font-mono text-[13px]">{sourceReturnNo || "—"}</p>
                </div>
                <div className="cnz-f">
                  <label>Sales Order</label>
                  <p className="cnz-ro font-mono text-[13px]">{sourceOrderNo || "—"}</p>
                </div>
                <div className="cnz-f">
                  <label>Invoice Amount</label>
                  <p className="cnz-ro text-[13px] tabular-nums">
                    {formatINR(referencePreview.originalAmount)}
                  </p>
                </div>
              </>
            ) : null}

            {isAgainstMode && !isReturn && !isScheme && referencePreview ? (
              <>
                <div className="cnz-f">
                  <label>Invoice Date</label>
                  <p className="cnz-ro text-[13px]">{referencePreview.documentDate || "—"}</p>
                </div>
                <div className="cnz-f">
                  <label>Already Credited</label>
                  <p className="cnz-ro text-[13px] tabular-nums">
                    {formatINR(referencePreview.alreadyAdjustedAmount)}
                  </p>
                </div>
                <div className="cnz-f">
                  <label>Tax Structure</label>
                  <p className="cnz-ro text-[13px]">
                    {interstate ? "IGST (inter-state)" : "CGST + SGST (intra-state)"}
                  </p>
                </div>
              </>
            ) : null}

            {warehouseRef ? (
              <div className="cnz-f">
                <WarehouseMappedBankAccountSelect
                  warehouseRef={warehouseRef}
                  value={bankAccountId}
                  onChange={(id) => setBankAccountId(id)}
                  label="Bank Account"
                  disabled={readOnly}
                />
              </div>
            ) : null}
          </div>

          <div className="cnz-items">
            <div className="cnz-items__bar">
              <h2 className="cnz-items__title">
                {isScheme
                  ? "Scheme Particulars"
                  : isAgainstMode
                    ? "Quantity Particulars"
                    : "Amount Particulars"}
              </h2>
            </div>

            {isScheme ? (
              <div className="cnz-table-wrap">
                <table className="cnz-table cnz-table--scheme accounts-table">
                  <thead>
                    <tr>
                      <th className="accounts-table-th" style={{ width: "24%" }}>Scheme Particular</th>
                      <th className="accounts-table-th">Mapped Ledger</th>
                      <th className="accounts-table-th text-right">Eligible Base</th>
                      <th className="accounts-table-th text-right">Rate</th>
                      <th className="accounts-table-th">GST Treatment</th>
                      <th className="accounts-table-th text-right">GST Amount</th>
                      <th className="accounts-table-th text-right">Credit Note Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(lines.length
                      ? lines.filter((l) => l.creditAmount > 0 || l.productName)
                      : [
                          {
                            id: "scheme-row",
                            productName: schemeName || "Scheme Settlement",
                            creditAmount: schemeSettlementAmount ?? grandTotal,
                            taxPct: 0,
                            unitPrice: 0,
                            returnQty: 0,
                            gstAmount: 0,
                          } as CreditNoteLine,
                        ]
                    ).map((line) => {
                      const rate =
                        eligibleBase && eligibleBase > 0 && line.creditAmount > 0
                          ? Math.round((line.creditAmount / eligibleBase) * 10000) / 100
                          : 0;
                      const lineTax =
                        line.gstAmount > 0
                          ? line.gstAmount
                          : line.taxPct > 0
                            ? Math.round(
                                (line.creditAmount -
                                  line.creditAmount / (1 + line.taxPct / 100)) *
                                  100,
                              ) / 100
                            : taxBreakup.taxAmount;
                      return (
                        <tr key={line.id}>
                          <td className="font-medium">
                            {line.productName || schemeName || "Scheme Settlement"}
                          </td>
                          <td className="text-[13px]">{adjustmentLedgerName || "—"}</td>
                          <td className="cnz-num">{formatINR(eligibleBase ?? 0)}</td>
                          <td className="cnz-num">{rate > 0 ? `${rate}%` : "—"}</td>
                          <td className="text-[13px]">
                            {gstTreatment || (interstate ? "IGST" : "CGST + SGST")}
                          </td>
                          <td className="cnz-num">{formatINR(lineTax)}</td>
                          <td className="cnz-num font-semibold">
                            {formatINR(line.creditAmount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : isAgainstMode ? (
              lines.length > 0 ? (
                <CreditNoteProductTable
                  lines={lines}
                  readOnly={readOnly}
                  onQtyChange={onCreditQtyChange}
                />
              ) : (
                <div className="cnz-table-wrap">
                  <p className="cnz-empty">
                    Select a sales invoice or sales return to load items.
                  </p>
                </div>
              )
            ) : (
              <FreshCreditNoteForm
                particular={directParticular}
                onParticularChange={setDirectParticular}
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
                interstate={interstate}
                disabled={readOnly}
              />
            )}
          </div>

          <div className="cnz-after-table">
            <div className="cnz-totals">
              <h3 className="cnz-totals__title">Amount Breakdown</h3>
              <div className="cnz-totals__row">
                <span>Taxable / Subtotal</span>
                <span>{formatINR(subTotal)}</span>
              </div>
              {discountTotal > 0 ? (
                <div className="cnz-totals__row">
                  <span>Discount</span>
                  <span>{formatINR(discountTotal)}</span>
                </div>
              ) : null}
              {showGstBreakup && !interstate ? (
                <>
                  <div className="cnz-totals__row">
                    <span>CGST</span>
                    <span>{formatINR(cgstDisplay)}</span>
                  </div>
                  <div className="cnz-totals__row">
                    <span>SGST</span>
                    <span>{formatINR(sgstDisplay)}</span>
                  </div>
                </>
              ) : null}
              {showGstBreakup && interstate ? (
                <div className="cnz-totals__row">
                  <span>IGST</span>
                  <span>{formatINR(igstDisplay)}</span>
                </div>
              ) : null}
              {isAgainstMode && !isScheme ? (
                <div className="cnz-totals__row">
                  <span>Rounding Off</span>
                  <AccountsMoneyInput
                    className="h-7 w-20 text-xs text-right"
                    value={adjustment || ""}
                    onChange={(v) => setAdjustment(v)}
                    disabled={readOnly}
                  />
                </div>
              ) : null}
              <div className="cnz-totals__grand">
                <span>Total Amount</span>
                <span>{formatINR(grandTotal)}</span>
              </div>
            </div>
          </div>

          <div className="cnz-notes">
            <div className="cnz-f">
              <label>Narration</label>
              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Accounting narration for this credit note"
                disabled={readOnly}
              />
            </div>
          </div>

          {grandTotal > 0 ? (
            <div className="cnz-impact">
              <LedgerImpactPreview
                title="Accounting Preview"
                lines={impactLines}
              />
            </div>
          ) : null}
        </div>
      </AccountsFormLayout>
      </div>
      <AccountsToast toast={toast} onDismiss={dismissToast} />
      {discardDialog}
    </>
  );
}
