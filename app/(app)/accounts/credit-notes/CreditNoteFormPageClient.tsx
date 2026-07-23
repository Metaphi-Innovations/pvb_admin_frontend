"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { useFormDirtySnapshot } from "@/lib/accounts/use-form-dirty-snapshot";
import { roundMoney } from "@/lib/accounts/money-format";
import { useTransactionFormCancel } from "@/components/accounts/TransactionFormCancel";
import { AccountsFormLayout } from "../expenses/components/AccountsFormLayout";
import { SearchableSelect } from "./components/SearchableSelect";
import { CreditNoteCustomerInfoButton } from "./components/CreditNoteCustomerInfoButton";
import { resolveCreditNoteCustomerLedger } from "./credit-note-accounting";
import { computeNoteTaxBreakup } from "@/lib/accounts/note-tax-breakup";
import { inferInterstateFromPlaceOfSupply } from "@/lib/accounts/gst-accounting";
import {
  isInterstateGstTreatment,
  isGstApplicableTreatment,
} from "@/lib/accounts/scheme-entitlement-credit-note";
import {
  buildReferenceFromInvoice,
  buildReferenceFromSalesReturn,
  createCreditNote,
  createEmptyCreditLine,
  creditLinesForSchemeSettlement,
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
import { AccountsDateInput } from "@/components/accounts/AccountsDateInput";
import { dispatchAccountsDataChanged } from "@/lib/accounts/accounts-data-events";
import { AccountsToast, useAccountsToast } from "@/components/accounts/AccountsToast";
import { getInvoiceById } from "@/app/(app)/accounts/invoices/invoices-data";
import { WarehouseMappedBankAccountSelect } from "@/components/accounts/WarehouseMappedBankAccountSelect";
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
  adaptSalesInvoiceReference,
  adaptSalesReturnReference,
} from "@/components/accounts/voucher-form/note-reference-model";
import { defaultVisibilityForType } from "@/components/accounts/voucher-form/voucher-form-shell";
import "@/components/accounts/voucher-form/note-form-compact.css";
import "./credit-note-tx.css";

type FormMode = "fresh" | "return" | "scheme";
type UiRefType = "direct" | "sales_invoice" | "sales_return";

const REF_TYPE_OPTIONS: { value: UiRefType; label: string }[] = [
  { value: "direct", label: "Direct" },
  { value: "sales_invoice", label: "Sales Invoice" },
  { value: "sales_return", label: "Sales Return" },
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

  const [noteType, setNoteType] = useState<CreditNoteCreationMode>(() =>
    isFresh || (!isReturn && !isScheme) ? "direct_adjustment" : "against_reference",
  );
  const [uiRefType, setUiRefType] = useState<UiRefType>(() => {
    if (isFresh || (!isReturn && !isScheme)) return "direct";
    if (isReturn) return "sales_return";
    return "sales_invoice";
  });
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

  const [directParticular, setDirectParticular] = useState("");
  const [directRefNo, setDirectRefNo] = useState("");
  const [linkedInvoices, setLinkedInvoices] = useState<CreditNoteLinkedInvoice[]>([]);
  const [particularQty, setParticularQty] = useState("1");
  const [particularRate, setParticularRate] = useState("");
  const [directGstApplicable, setDirectGstApplicable] = useState(false);
  const [directGstPct, setDirectGstPct] = useState("18");
  const [adjustmentLedgerId, setAdjustmentLedgerId] = useState<number | null>(null);
  const [adjustmentLedgerName, setAdjustmentLedgerName] = useState("");
  const [attachmentName, setAttachmentName] = useState("");

  const readOnly = isEdit && status === "cancelled";
  const alreadyAdjustedNum = parseFloat(alreadyAdjusted) || 0;
  const customerLocked = Boolean(referencePreview) || isReturn || isScheme;
  const refControlsLocked = isReturn || isScheme || readOnly;

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

  const applyReferencePreview = (preview: CreditReferencePreview, loadLines = false) => {
    setReferencePreview(preview);
    const pre = previewToFormInput(preview);
    setSourceInvoiceId(pre.sourceInvoiceId ?? null);
    setSourceInvoiceNo(pre.sourceInvoiceNo ?? "");
    setSourceOrderNo(pre.sourceOrderNo ?? "");
    if (pre.customerId) setCustomerId(String(pre.customerId));
    setOriginalAmount(String(pre.originalAmount ?? ""));
    setAlreadyAdjusted(String(pre.alreadyAdjustedAmount ?? 0));
    if (loadLines && pre.lineItems?.length) {
      setLines(
        recalcAllCreditLines(
          pre.lineItems.map((l) => normalizeCreditLine(l)),
          preview.alreadyAdjustedAmount,
        ),
      );
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
    setNoteType("against_reference");
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
      // Reference preview is display-only — do not load editable source lines.
      applyReferencePreview(preview, false);
      const c = customers.find((x) => x.id === preview.customerId);
      if (c) onCustomerChange(String(c.id), customerMasterToTransactionFields(c));
      if (!directParticular.trim()) {
        setDirectParticular(preview.lineItems[0]?.productName || "Sales invoice adjustment");
      }
      const first = preview.lineItems[0];
      if (first && !particularRate.trim()) {
        const qty =
          first.invoiceQty > 0 ? first.invoiceQty : 1;
        setParticularQty(String(qty));
        setParticularRate(String(first.unitPrice || ""));
        const gstOn = (first.taxPct || 0) > 0;
        setDirectGstApplicable(gstOn);
        if (gstOn) setDirectGstPct(String(first.taxPct));
      }
    }
  };

  const onSalesReturnSelect = (id: string) => {
    setReferenceReturnId(id);
    setReferenceInvoiceId("");
    setNoteType("against_reference");
    if (!id) {
      clearReference();
      return;
    }
    const ret = salesReturns.find((r) => r.id === id);
    const preview = buildReferenceFromSalesReturn(id);
    if (preview && ret) {
      setSourceReturnId(ret.id);
      setSourceReturnNo(ret.returnNumber);
      applyReferencePreview(preview, false);
      if (preview.sourceInvoiceId && preview.sourceInvoiceNo) {
        setLinkedInvoices([{ id: preview.sourceInvoiceId, invoiceNo: preview.sourceInvoiceNo }]);
      }
      const c = customers.find(
        (x) => x.id === preview.customerId || x.customerName === ret.customer,
      );
      if (c) onCustomerChange(String(c.id), customerMasterToTransactionFields(c));
      if (!directParticular.trim()) {
        setDirectParticular(preview.lineItems[0]?.productName || "Sales return");
      }
      const first = preview.lineItems[0];
      if (first && !particularRate.trim()) {
        const qty =
          (first.salesReturnQty && first.salesReturnQty > 0
            ? first.salesReturnQty
            : first.eligibleReturnQty && first.eligibleReturnQty > 0
              ? first.eligibleReturnQty
              : first.invoiceQty) || 1;
        setParticularQty(String(qty));
        setParticularRate(String(first.unitPrice || ""));
        const gstOn = (first.taxPct || 0) > 0;
        setDirectGstApplicable(gstOn);
        if (gstOn) setDirectGstPct(String(first.taxPct));
      }
    }
  };

  const onUiRefTypeChange = (next: UiRefType) => {
    if (isReturn || isScheme) return;
    setUiRefType(next);
    clearReference();
    setReferenceInvoiceId("");
    setReferenceReturnId("");
    setLinkedInvoices([]);
    setNoteType(next === "direct" ? "direct_adjustment" : "against_reference");
    // #region agent log
    fetch('http://127.0.0.1:7502/ingest/b60215f3-a2ea-4dec-b0ac-4488ce88b732',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'e2f165'},body:JSON.stringify({sessionId:'e2f165',location:'CreditNoteFormPageClient.tsx:onUiRefTypeChange',message:'CN ref type change',data:{next,prev:uiRefType},timestamp:Date.now(),hypothesisId:'B',runId:'pre-fix'})}).catch(()=>{});
    // #endregion
  };

  useEffect(() => {
    if (isEdit) return;
    const invId = invoiceIdFromUrl ?? searchParams.get("invoiceId");
    if (!invId || isReturn || isScheme || isFresh) return;
    setNoteType("against_reference");
    setUiRefType("sales_invoice");
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
    setUiRefType("sales_return");
    setReferenceReturnId(returnId);
    setSourceReturnId(ret.id);
    setSourceReturnNo(ret.returnNumber);
    if (pending?.returnDate) setCreditNoteDate(pending.returnDate);

    // Display-only reference; particulars drive totals (not editable source product table).
    applyReferencePreview(preview, false);

    const first = preview.lineItems[0];
    if (first) {
      const qty =
        (first.salesReturnQty && first.salesReturnQty > 0
          ? first.salesReturnQty
          : first.invoiceQty) || 1;
      setParticularQty(String(qty));
      setParticularRate(String(first.unitPrice || ""));
      setDirectGstApplicable((first.taxPct || 0) > 0 || (first.gstAmount || 0) > 0);
      if ((first.taxPct || 0) > 0) setDirectGstPct(String(first.taxPct));
    }
    setDirectParticular((prev) =>
      prev.trim() ? prev : first?.productName || "Sales return",
    );

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
    setUiRefType("sales_invoice");
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
    applyReferencePreview({ ...preview, lineItems: schemeLines }, true);

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
      setUiRefType("sales_invoice");
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
      applyReferencePreview(prefill.referencePreview, true);
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
    if (rec.sourceReturnId) {
      setUiRefType("sales_return");
      setReferenceReturnId(rec.sourceReturnId);
    } else if (isDirect && !rec.sourceInvoiceId) {
      setUiRefType("direct");
    } else {
      setUiRefType("sales_invoice");
    }
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
      const line = rec.lineItems[0];
      setDirectParticular(
        (line?.description || line?.productName || "").trim() || "",
      );
      const base = line?.unitPrice ?? rec.taxableValue ?? rec.currentCreditAmount;
      const gstOn = (line?.taxPct ?? 0) > 0;
      const gstPctStr = String(line?.taxPct ?? 18);
      if (line && line.returnQty > 0 && line.unitPrice > 0) {
        setParticularQty(String(line.returnQty));
        setParticularRate(String(line.unitPrice));
      } else {
        setParticularQty("1");
        setParticularRate(String(base));
      }
      setDirectGstApplicable(gstOn);
      setDirectGstPct(gstPctStr);
      const expected = computeNoteParticularTotals(
        line && line.returnQty > 0 ? String(line.returnQty) : "1",
        line && line.unitPrice > 0 ? String(line.unitPrice) : String(base),
        gstOn,
        gstPctStr,
        false,
      ).total;
      const savedTotal = line?.creditAmount ?? rec.currentCreditAmount ?? expected;
      setAdjustment(roundMoney(savedTotal - expected));
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
      } else if (rec.sourceReturnId) {
        const p = buildReferenceFromSalesReturn(rec.sourceReturnId);
        if (p) setReferencePreview(p);
      }
      const line = rec.lineItems[0];
      const taxable = rec.taxableValue || 0;
      const gstOn = (rec.taxCreditAmount ?? 0) > 0 || (line?.taxPct ?? 0) > 0;
      const gstPctStr =
        line?.taxPct && line.taxPct > 0
          ? String(line.taxPct)
          : taxable > 0 && gstOn
            ? String(Math.round(((rec.taxCreditAmount ?? 0) / taxable) * 10000) / 100)
            : "18";
      if (line && line.returnQty > 0 && line.unitPrice > 0) {
        setParticularQty(String(line.returnQty));
        setParticularRate(String(line.unitPrice));
      } else {
        setParticularQty("1");
        setParticularRate(String(taxable || line?.unitPrice || rec.currentCreditAmount || ""));
      }
      setDirectGstApplicable(gstOn);
      setDirectGstPct(gstPctStr);
      setDirectParticular(line?.productName || rec.reason || "");
      const qtyStr = line && line.returnQty > 0 ? String(line.returnQty) : "1";
      const rateStr =
        line && line.unitPrice > 0
          ? String(line.unitPrice)
          : String(taxable || rec.currentCreditAmount || "");
      const expected = computeNoteParticularTotals(qtyStr, rateStr, gstOn, gstPctStr, false).total;
      setAdjustment(roundMoney((rec.currentCreditAmount ?? expected) - expected));
      if (rec.adjustmentLedgerId) {
        setAdjustmentLedgerId(rec.adjustmentLedgerId);
        setAdjustmentLedgerName(rec.adjustmentLedgerName ?? "");
      }
      // Against-reference edit: keep preview for read-only display; clear editable source lines
      // for non-scheme so particulars table drives amounts.
      if (!rec.schemeEntitlementId && !rec.schemeSettlementKey) {
        setLines([]);
      }
    }
  }, [isEdit, creditNoteId, router, customers]);

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

  const isSourceRefMode =
    !isScheme && (uiRefType === "sales_invoice" || uiRefType === "sales_return");
  const isDirectMode = !isScheme && uiRefType === "direct";

  const particularTotals = computeNoteParticularTotals(
    particularQty,
    particularRate,
    directGstApplicable,
    directGstPct,
    interstate,
  );

  const referenceDocumentView = useMemo(() => {
    if (!isSourceRefMode || !referencePreview) return null;
    const base = {
      documentDate: referencePreview.documentDate,
      partyName: referencePreview.customerName,
      grandTotal: referencePreview.originalAmount,
      interstate,
      lines: referencePreview.lineItems,
    };
    if (uiRefType === "sales_return") {
      return adaptSalesReturnReference({
        ...base,
        documentNumber: sourceReturnNo || referencePreview.sourceInvoiceNo,
      });
    }
    return adaptSalesInvoiceReference({
      ...base,
      documentNumber: referencePreview.sourceInvoiceNo || sourceInvoiceNo,
    });
  }, [
    isSourceRefMode,
    referencePreview,
    uiRefType,
    interstate,
    sourceReturnNo,
    sourceInvoiceNo,
  ]);

  const againstLinesForTax = lines.filter(
    (l) => l.productName && (l.returnQty > 0 || l.creditAmount > 0),
  );
  const taxBreakup = isScheme
    ? computeNoteTaxBreakup(againstLinesForTax, interstate)
    : computeNoteTaxBreakup(
        [
          {
            creditAmount: particularTotals.total,
            taxPct: directGstApplicable ? parseFloat(directGstPct) || 0 : 0,
          },
        ],
        interstate,
      );

  const subTotal = isScheme ? taxBreakup.taxableValue : particularTotals.basicAmount;
  const grandTotal = Math.max(
    0,
    (isScheme ? taxBreakup.total : particularTotals.total) + (isScheme ? 0 : adjustment),
  );
  const cgstDisplay = isScheme ? taxBreakup.cgstAmount : particularTotals.cgst;
  const sgstDisplay = isScheme ? taxBreakup.sgstAmount : particularTotals.sgst;
  const igstDisplay = isScheme ? taxBreakup.igstAmount : particularTotals.igst;
  const original = parseFloat(originalAmount) || grandTotal;

  const resolveCustomerName = (): string => {
    if (selectedCustomer) return selectedCustomer.customerName;
    if (customerFields?.customerName) return customerFields.customerName;
    if (referencePreview?.customerName) return referencePreview.customerName;
    return "";
  };

  /** Shared save lines from generic Particulars (direct + invoice/return). */
  const buildParticularLineItems = (): CreditNoteLine[] => {
    if (particularTotals.total <= 0 && Math.abs(adjustment) < 0.005) return [];
    const particular = directParticular.trim() || "Adjustment";
    const lineTotal = roundMoney(particularTotals.total + adjustment);
    return [
      normalizeCreditLine({
        ...createEmptyCreditLine(),
        productName: particular,
        description: directParticular.trim(),
        reason: particular,
        returnQty: particularTotals.qty || 1,
        unitPrice: particularTotals.rate || particularTotals.basicAmount,
        taxPct: directGstApplicable ? parseFloat(directGstPct) || 0 : 0,
        gstApplicable: directGstApplicable,
        creditAmount: lineTotal,
        gstAmount: particularTotals.gstAmount,
        lineAmount: lineTotal,
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
    const isDirect = isDirectMode;
    const primaryLinked = linkedInvoices[0];
    const refInvId = primaryLinked?.id ?? sourceInvoiceId;
    const refInvNo =
      primaryLinked?.invoiceNo ??
      (sourceInvoiceNo || invoices.find((i) => i.id === refInvId)?.invoiceNo || "");

    const schemeSaveLines = lines.filter(
      (l) => l.productName && (l.returnQty > 0 || l.creditAmount > 0),
    );

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
      originalAmount: isScheme
        ? original
        : roundMoney(particularTotals.total + adjustment),
      alreadyAdjustedAmount: isDirect ? 0 : alreadyAdjustedNum,
      lineItems: isScheme ? schemeSaveLines : buildParticularLineItems(),
      reason: isDirect
        ? directParticular.trim() || remarks.trim() || "Other"
        : isEntitlementScheme || schemeEntitlementId
          ? "Scheme Settlement"
          : isScheme
            ? "Near Expiry Scheme Settlement"
            : directParticular.trim() ||
              (uiRefType === "sales_return" ? "Sales return" : "Sales invoice"),
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
      adjustmentLedgerId: adjustmentLedgerId ?? undefined,
      adjustmentLedgerName: adjustmentLedgerName || undefined,
      referenceNo: directRefNo || undefined,
      attachmentName: attachmentName || undefined,
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
    if (!isScheme) {
      if (isSourceRefMode && !referencePreview) {
        setError(
          uiRefType === "sales_return"
            ? "Select a sales return."
            : "Select a sales invoice.",
        );
        return false;
      }
      if (!directParticular.trim()) {
        setError("Enter a particular / description for the adjustment.");
        return false;
      }
      if (!adjustmentLedgerId && !adjustmentLedgerName) {
        setError("Select an adjustment ledger.");
        return false;
      }
      if (particularTotals.total <= 0) {
        setError("Enter a valid Qty and Rate for the particular.");
        return false;
      }
    } else {
      if (!referencePreview && !schemeEntitlementId && !schemeSettlementKey) {
        setError("Select a sales invoice or sales return.");
        return false;
      }
      try {
        validateCreditNoteLines(lines);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Invalid line quantities.");
        return false;
      }
      const againstTotal = Math.max(0, taxBreakup.total + (isScheme ? 0 : adjustment));
      if (againstTotal <= 0) {
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
      directParticular,
      directRefNo,
      particularQty,
      particularRate,
      directGstApplicable,
      directGstPct,
      adjustmentLedgerId,
      adjustment,
      schemeSettlementKey,
      uiRefType,
    }),
    [
      noteType,
      creditNoteDate,
      customerId,
      referenceInvoiceId,
      lines,
      remarks,
      linkedInvoices,
      directParticular,
      directRefNo,
      particularQty,
      particularRate,
      directGstApplicable,
      directGstPct,
      adjustmentLedgerId,
      adjustment,
      schemeSettlementKey,
      uiRefType,
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
  const showGstBreakup = isScheme
    ? taxBreakup.taxAmount > 0 || isGstApplicableTreatment(gstTreatment)
    : directGstApplicable;

  const stickyActions = readOnly ? undefined : (
    <VoucherFormActionBar
      onCancel={requestCancel}
      onSaveDraft={saveDraft}
      onSaveAndPost={postNote}
      saveDraftDisabled={Boolean(ledgerConfigError)}
      saveAndPostDisabled={Boolean(ledgerConfigError)}
    />
  );

  const debitLedgerName = adjustmentLedgerName || "Not selected";
  const creditLedgerResolved =
    resolveCreditNoteCustomerLedger(customerLedgerName, resolveCustomerName()) || "Not selected";

  const postingSummary = (
    <VoucherAccountingPostingSummary
      embedded
      compact
      voucherTypeLabel="Credit Note"
      debitLedgerLabel="Debit"
      debitLedgerName={debitLedgerName}
      creditLedgerLabel="Credit"
      creditLedgerName={creditLedgerResolved}
      voucherAmount={grandTotal}
      voucherAmountLabel="Credit Note Amount"
      gstAdjustments={
        showGstBreakup
          ? {
              cgstLabel: "Output CGST Adjustment",
              cgstAmount: cgstDisplay,
              sgstLabel: "Output SGST Adjustment",
              sgstAmount: sgstDisplay,
              igstLabel: "Output IGST Adjustment",
              igstAmount: igstDisplay,
            }
          : undefined
      }
      visibilityItems={defaultVisibilityForType("credit_note", {
        gstApplicable: showGstBreakup,
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
        location: "CreditNoteFormPageClient.tsx:render",
        message: "CN render branch",
        data: {
          uiRefType,
          isSourceRefMode,
          hasPreview: Boolean(referencePreview),
          hasRefDoc: Boolean(referenceDocumentView),
          gstOn: directGstApplicable,
          particularQty,
          particularRate,
          usesSharedParticulars: !isScheme,
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
    directGstApplicable,
    particularQty,
    particularRate,
    isScheme,
  ]);
  // #endregion

  return (
    <>
      <div className="credit-debit-note-form h-full min-h-0 flex flex-col">
      <AccountsFormLayout
        fullWidth
        onBackClick={readOnly ? undefined : requestCancel}
        title={formTitle}
        breadcrumb={[...CREDIT_NOTES_BREADCRUMB]}
        code={creditNoteNo || undefined}
        headerMeta={
          <div className="flex items-center gap-1.5">
            <span className="cdn-chip inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
              Draft
            </span>
            {creditNoteNo ? (
              <span className="cdn-chip cdn-chip--code inline-flex items-center h-5 px-1.5 rounded border font-mono text-[10px]">
                {creditNoteNo}
              </span>
            ) : null}
          </div>
        }
        stickyFooter={stickyActions}
      >
        <div className="cdn-stack pb-20">
          {error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 text-xs text-red-700">{error}</div>
          ) : null}
          {ledgerConfigError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 text-xs text-red-700">
              {ledgerConfigError}
            </div>
          ) : null}

          <VoucherFormSectionCard title="Basic & Reference Details" compact>
            <VoucherNoteFieldGrid columns={4}>
              <VoucherNoteField label="Credit Note Number" width="sm">
                <VoucherNoteReadOnly mono>{creditNoteNo || "…"}</VoucherNoteReadOnly>
              </VoucherNoteField>
              <VoucherNoteField label="Credit Note Date" width="sm">
                <AccountsDateInput
                  value={creditNoteDate}
                  onChange={setCreditNoteDate}
                  disabled={readOnly}
                  aria-label="Credit note date"
                  className="h-[30px] text-xs cdn-control"
                />
              </VoucherNoteField>
              <VoucherNoteField label="Reference Number" width="md">
                <Input
                  className="h-[30px] text-xs cdn-control"
                  value={directRefNo}
                  onChange={(e) => setDirectRefNo(e.target.value)}
                  placeholder="Optional"
                  disabled={readOnly || isScheme}
                />
              </VoucherNoteField>
              {warehouseRef ? (
                <VoucherNoteField label="Bank Account" width="lg">
                  <WarehouseMappedBankAccountSelect
                    warehouseRef={warehouseRef}
                    value={bankAccountId}
                    onChange={(id) => setBankAccountId(id)}
                    label=""
                    disabled={readOnly}
                  />
                </VoucherNoteField>
              ) : null}
              <VoucherNoteField
                width="md"
                label={
                  <span className="inline-flex items-center gap-1">
                    Customer
                    <CreditNoteCustomerInfoButton
                      customer={selectedCustomer}
                      placeOfSupply={placeOfSupply}
                    />
                  </span>
                }
                required
              >
                {customerLocked ? (
                  <VoucherNoteReadOnly>
                    {resolveCustomerName() || "—"}
                  </VoucherNoteReadOnly>
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
              </VoucherNoteField>
              <VoucherNoteField label="Customer GSTIN" width="md">
                <VoucherNoteReadOnly mono>
                  {selectedCustomer?.gstin || customerFields?.customerGst || "—"}
                </VoucherNoteReadOnly>
              </VoucherNoteField>
              <VoucherNoteField label="AR Ledger" width="md">
                <VoucherNoteReadOnly>
                  {customerLedgerName || resolveCustomerName() || "—"}
                </VoucherNoteReadOnly>
              </VoucherNoteField>
              <VoucherNoteField label="Salesperson" width="md">
                <VoucherNoteReadOnly>
                  {selectedCustomer?.salesManName || "—"}
                </VoucherNoteReadOnly>
              </VoucherNoteField>
              <VoucherNoteField label="Reference Type" span={2} width="ref">
                {isReturn || isScheme ? (
                  <VoucherNoteReadOnly>
                    {isScheme
                      ? `Scheme${schemeCode ? ` · ${schemeCode}` : ""}`
                      : "Sales Return"}
                    {isReturn && sourceReturnNo ? ` · ${sourceReturnNo}` : ""}
                    {isScheme && invoiceCountForScheme > 0
                      ? ` · ${invoiceCountForScheme} Invoice${invoiceCountForScheme === 1 ? "" : "s"}`
                      : ""}
                  </VoucherNoteReadOnly>
                ) : (
                  <VoucherNoteSegmentControl
                    hideLabel
                    label="Reference Type"
                    name="cn-ref-type"
                    value={uiRefType}
                    options={REF_TYPE_OPTIONS}
                    onChange={onUiRefTypeChange}
                    disabled={refControlsLocked}
                  />
                )}
              </VoucherNoteField>
              {!isReturn && !isScheme && uiRefType === "sales_invoice" ? (
                <VoucherNoteField label="Reference Document" span={2} width="ref">
                  <SearchableSelect
                    label=""
                    value={referenceInvoiceId}
                    onChange={onInvoiceSelect}
                    options={invoiceOptions}
                    placeholder="Select invoice"
                    required
                    disabled={readOnly}
                  />
                </VoucherNoteField>
              ) : null}
              {!isReturn && !isScheme && uiRefType === "sales_return" ? (
                <VoucherNoteField label="Reference Document" span={2} width="ref">
                  <SearchableSelect
                    label=""
                    value={referenceReturnId}
                    onChange={onSalesReturnSelect}
                    options={salesReturnOptions}
                    placeholder="Select sales return"
                    required
                    disabled={readOnly}
                  />
                </VoucherNoteField>
              ) : null}

              {isScheme ? (
                <>
                  <VoucherNoteField label="Claim Number" width="md">
                    <VoucherNoteReadOnly mono>{schemeClaimNumber || "—"}</VoucherNoteReadOnly>
                  </VoucherNoteField>
                  <VoucherNoteField label="Scheme Type" width="md">
                    <VoucherNoteReadOnly>{schemeType || "—"}</VoucherNoteReadOnly>
                  </VoucherNoteField>
                  <VoucherNoteField label="Scheme Period" width="md">
                    <VoucherNoteReadOnly>{schemePeriod || "—"}</VoucherNoteReadOnly>
                  </VoucherNoteField>
                  <VoucherNoteField label="Calculation Reference" span={2} width="ref">
                    <VoucherNoteReadOnly>{calculationReference || "—"}</VoucherNoteReadOnly>
                  </VoucherNoteField>
                </>
              ) : null}
            </VoucherNoteFieldGrid>
          </VoucherFormSectionCard>

          {isSourceRefMode ? (
            <NoteReferenceDocumentDetails
              document={referenceDocumentView}
              emptyMessage={
                uiRefType === "sales_return"
                  ? "Select a sales return to view source details."
                  : "Select a sales invoice to view source details."
              }
            />
          ) : null}

          <VoucherFormSectionCard title="Particulars" flush compact>
            <div className="cnz-items !shadow-none !border-0 !rounded-none">
              {isScheme ? (
                <div className="cnz-table-wrap">
                  <table className="cnz-table cnz-table--scheme accounts-table">
                    <thead>
                      <tr>
                        <th className="accounts-table-th" style={{ width: "24%" }}>Scheme Particular</th>
                        <th className="accounts-table-th">Mapped Ledger</th>
                        <th className="accounts-table-th text-right">Eligible Base</th>
                        <th className="accounts-table-th text-right">Rate</th>
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
                            <td className="font-normal">
                              {line.productName || schemeName || "Scheme Settlement"}
                            </td>
                            <td className="text-[12px]">{adjustmentLedgerName || "Not selected"}</td>
                            <td className="cnz-num">{formatINR(eligibleBase ?? 0)}</td>
                            <td className="cnz-num">{rate > 0 ? `${rate}%` : "—"}</td>
                            <td className="cnz-num">{formatINR(lineTax)}</td>
                            <td className="cnz-num font-normal">
                              {formatINR(line.creditAmount)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-3 py-2">
                  <NoteParticularsTable
                    particular={directParticular}
                    onParticularChange={setDirectParticular}
                    adjustmentLedgerId={adjustmentLedgerId}
                    onAdjustmentLedgerChange={(l) => {
                      setAdjustmentLedgerId(l.id);
                      setAdjustmentLedgerName(l.accountName);
                    }}
                    qty={particularQty}
                    onQtyChange={setParticularQty}
                    rate={particularRate}
                    onRateChange={setParticularRate}
                    gstPct={directGstPct}
                    onGstPctChange={setDirectGstPct}
                    gstApplicable={directGstApplicable}
                    onGstApplicableChange={setDirectGstApplicable}
                    interstate={interstate}
                    disabled={readOnly}
                    switchId="cn-gst-applicable"
                  />
                </div>
              )}
            </div>
            <VoucherGstSummaryCard
              embedded
              visible
              showTaxRows={showGstBreakup}
              taxableAmount={subTotal}
              cgstAmount={cgstDisplay}
              sgstAmount={sgstDisplay}
              igstAmount={igstDisplay}
              roundOff={isScheme ? 0 : adjustment}
              grandTotal={grandTotal}
              roundOffSlot={
                !isScheme ? (
                  <VoucherSignedRoundOffInput
                    value={adjustment}
                    onChange={setAdjustment}
                    disabled={readOnly}
                  />
                ) : undefined
              }
            />
          </VoucherFormSectionCard>

          <VoucherNarrationAttachmentsSection
            compact
            narration={remarks}
            onNarrationChange={setRemarks}
            readOnly={readOnly}
            narrationPlaceholder="Accounting narration for this credit note"
            singleAttachment
            attachmentFiles={
              attachmentName
                ? [{ id: "cn-att-1", fileName: attachmentName }]
                : []
            }
            onAddAttachmentFiles={(files) => {
              const f = files[0];
              if (f) setAttachmentName(f.name);
            }}
            onRemoveAttachment={() => setAttachmentName("")}
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
