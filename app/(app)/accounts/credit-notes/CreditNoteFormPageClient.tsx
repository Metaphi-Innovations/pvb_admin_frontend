"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";
import { AccountsFormLayout } from "../expenses/components/AccountsFormLayout";
import { SearchableSelect } from "./components/SearchableSelect";
import { NoteTypeSelector } from "./components/NoteTypeSelector";
import { FreshCreditNoteForm, computeFreshCreditTotals } from "./components/FreshCreditNoteForm";
import { LinkedInvoicesMultiSelect, type LinkedInvoiceOption } from "./components/LinkedInvoicesMultiSelect";
import { SettlementSummary } from "./components/SettlementSummary";
import { AccountingSummary } from "./components/AccountingSummary";
import { buildCreditNoteLedgerImpact } from "./credit-note-accounting";
import {
  applyReturnQtyToLines,
  buildReferenceFromInvoice,
  buildReferenceFromSalesReturn,
  computeCreditNoteGstSplit,
  createCreditNote,
  createEmptyCreditLine,
  creditLinesForSchemeSettlement,
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
  type CreditNoteLine,
  type CreditNoteLinkedInvoice,
  type NoteWorkflowStatus,
} from "./credit-notes-data";
import {
  CREDIT_NOTE_SOURCE_KIND_LABELS,
  type CreditNoteSourceKind,
} from "./credit-note-source-types";
import {
  customerMasterToTransactionFields,
  type CustomerTransactionFields,
} from "@/lib/accounts/transaction-master-fetch";
import { getPendingCreditNoteRow } from "./pending-credit-notes-data";
import type { Customer } from "@/app/(app)/masters/customers/customer-data";
import { ensureNearExpiryPendingDemoCustomer } from "@/lib/accounts/pending-invoice-near-expiry-demo";
import {
  findSchemePendingSettlement,
  nearExpiryOptionFromUnified,
  type CreditNoteSettlementDetail,
} from "./scheme-pending-settlements";
import { CREDIT_NOTES_BREADCRUMB, CREDIT_NOTES_LIST_PATH, formatINR } from "./note-utils";
import { NoteWorkflowBadge } from "../components/NoteWorkflowBadge";

type FormMode = "fresh" | "return" | "scheme";

const NOTE_TYPE_OPTIONS: { value: CreditNoteCreationMode; label: string }[] = [
  { value: "against_reference", label: "Against Sales Invoice / Sales Return (Quantity Based)" },
  { value: "direct_adjustment", label: "Direct Amount Adjustment" },
];

export default function CreditNoteFormPageClient({
  creditNoteId,
  returnId: returnIdProp,
  schemeKey: schemeKeyProp,
  mode,
}: {
  creditNoteId?: number;
  returnId?: string;
  schemeKey?: string;
  mode?: FormMode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEdit = creditNoteId != null;
  const returnId = returnIdProp ?? searchParams.get("returnId") ?? undefined;
  const schemeKey = schemeKeyProp ?? searchParams.get("schemeKey") ?? undefined;
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
  const fromPending = isReturn || isScheme;

  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    setCustomers(getCustomersForCreditNote());
  }, []);

  const invoices = useMemo(() => listInvoicesForReference(), []);
  const salesReturns = useMemo(() => listSalesReturnsForCreditNote(), []);

  const [noteType, setNoteType] = useState<CreditNoteCreationMode>(
    isFresh ? "direct_adjustment" : "against_reference",
  );
  const [sourceKind, setSourceKind] = useState<CreditNoteSourceKind>(
    isFresh ? "manual" : isReturn ? "sales_return" : "near_expiry",
  );
  const [settlementDetail, setSettlementDetail] = useState<CreditNoteSettlementDetail | null>(null);
  const [creditNoteNo, setCreditNoteNo] = useState("");
  const [creditNoteDate, setCreditNoteDate] = useState(new Date().toISOString().slice(0, 10));
  const [referenceNo, setReferenceNo] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerFields, setCustomerFields] = useState<CustomerTransactionFields | null>(null);
  const [lines, setLines] = useState<CreditNoteLine[]>([]);
  const [alreadyAdjusted, setAlreadyAdjusted] = useState(0);
  const [remarks, setRemarks] = useState("");
  const [status, setStatus] = useState<NoteWorkflowStatus>("draft");
  const [error, setError] = useState<string | null>(null);

  const [schemeSettlementKey, setSchemeSettlementKey] = useState("");
  const [schemeCode, setSchemeCode] = useState("");
  const [schemeName, setSchemeName] = useState("");
  const [schemeSettlementAmount, setSchemeSettlementAmount] = useState<number | undefined>();
  const [sourceReturnId, setSourceReturnId] = useState("");
  const [sourceReturnNo, setSourceReturnNo] = useState("");
  const [sourceInvoiceId, setSourceInvoiceId] = useState<number | null>(null);
  const [sourceInvoiceNo, setSourceInvoiceNo] = useState("");
  const [linkedInvoices, setLinkedInvoices] = useState<CreditNoteLinkedInvoice[]>([]);

  const [directReason, setDirectReason] = useState("");
  const [directRefNo, setDirectRefNo] = useState("");
  const [directAmount, setDirectAmount] = useState("");
  const [directGstApplicable, setDirectGstApplicable] = useState(false);
  const [directGstPct, setDirectGstPct] = useState("18");
  const [adjustmentLedgerId, setAdjustmentLedgerId] = useState<number | null>(null);
  const [adjustmentLedgerName, setAdjustmentLedgerName] = useState("");
  const [attachmentName, setAttachmentName] = useState("");

  const readOnly = isEdit && status === "cancelled";
  const isDirect = noteType === "direct_adjustment" || isFresh;
  const customerLedgerName =
    customerFields?.receivableLedger || customerName || "";

  const linkedInvoiceOptions: LinkedInvoiceOption[] = useMemo(
    () =>
      invoices.map((inv) => ({
        id: inv.id,
        invoiceNo: inv.invoiceNo,
        sub: `${inv.customerName} · ${inv.invoiceDate} · ${formatINR(inv.grandTotal)}`,
      })),
    [invoices],
  );

  const onCustomerChange = (id: string, fields: CustomerTransactionFields | null) => {
    setCustomerId(id);
    if (!fields) {
      setCustomerFields(null);
      setCustomerName("");
      return;
    }
    setCustomerFields(fields);
    setCustomerName(fields.customerName);
  };

  const applySchemePending = (key: string) => {
    const pending = findSchemePendingSettlement(key);
    if (!pending) return;

    setSourceKind(pending.sourceKind);
    setSettlementDetail(pending.settlementDetail);
    setSchemeSettlementKey(pending.schemeSettlementKey ?? pending.key);
    setSchemeCode(pending.schemeCode ?? "");
    setSchemeName(pending.schemeName ?? "");
    setSchemeSettlementAmount(pending.eligibleAmount);
    setReferenceNo(pending.referenceNo);
    setLinkedInvoices(
      pending.linkedInvoiceIds.map((id, i) => ({
        id,
        invoiceNo: pending.linkedInvoiceNos[i] ?? invoices.find((inv) => inv.id === id)?.invoiceNo ?? "",
      })),
    );

    const primaryInv = pending.linkedInvoiceIds[0];
    if (primaryInv) {
      setSourceInvoiceId(primaryInv);
      setSourceInvoiceNo(pending.linkedInvoiceNos[0] ?? "");
    }

    if (pending.sourceKind === "near_expiry") {
      const opt = nearExpiryOptionFromUnified(pending);
      const preview = primaryInv ? buildReferenceFromInvoice(primaryInv) : null;
      if (opt && preview) {
        let schemeLines = creditLinesForSchemeSettlement(preview.lineItems, opt);
        if (opt.estimatedBenefitAmount > 0 && schemeLines.length > 0) {
          schemeLines = schemeLines.map((l, idx) =>
            idx === 0
              ? normalizeCreditLine({ ...l, creditAmount: opt.estimatedBenefitAmount, returnQty: 0 })
              : l,
          );
        }
        setLines(schemeLines);
        setAlreadyAdjusted(preview.alreadyAdjustedAmount);
      }
    } else {
      setLines([
        normalizeCreditLine({
          ...createEmptyCreditLine(),
          productName: pending.schemeName ?? "Scheme Settlement",
          description: `${CREDIT_NOTE_SOURCE_KIND_LABELS[pending.sourceKind]} — ${pending.schemeName}`,
          returnQty: 0,
          unitPrice: pending.eligibleAmount,
          creditAmount: pending.eligibleAmount,
          lineAmount: pending.eligibleAmount,
        }),
      ]);
      setAlreadyAdjusted(0);
    }

    ensureNearExpiryPendingDemoCustomer();
    const customerList = getCustomersForCreditNote();
    setCustomers(customerList);
    const pendingName = pending.customerName.trim();
    const c = customerList.find(
      (x) =>
        (pending.customerId != null && x.id === pending.customerId) ||
        (pendingName.length > 0 &&
          x.customerName.trim().toLowerCase() === pendingName.toLowerCase()),
    );
    if (c) onCustomerChange(String(c.id), customerMasterToTransactionFields(c));
    else setCustomerName(pending.customerName);
  };

  useEffect(() => {
    if (!isReturn || !returnId || isEdit) return;
    const pending = getPendingCreditNoteRow(returnId, "sales_return");
    const preview = buildReferenceFromSalesReturn(returnId);
    const ret = salesReturns.find((r) => r.id === returnId);
    if (!preview || !ret) return;

    setSourceKind("sales_return");
    setSourceReturnId(ret.id);
    setSourceReturnNo(ret.returnNumber);
    setReferenceNo(ret.returnNumber);
    if (pending?.returnDate) setCreditNoteDate(pending.returnDate);

    setSettlementDetail({
      kind: "sales_return",
      salesReturnNo: ret.returnNumber,
      returnDate: ret.returnDate,
      originalInvoiceNo: preview.sourceInvoiceNo,
      originalInvoiceId: preview.sourceInvoiceId,
    });

    const linesWithQty = preview.lineItems.map((l) => ({
      ...l,
      returnQty: l.eligibleReturnQty ?? l.salesReturnQty ?? 0,
    }));
    const recalced = recalcAllCreditLines(linesWithQty, preview.alreadyAdjustedAmount);
    setLines(recalced);
    setAlreadyAdjusted(preview.alreadyAdjustedAmount);
    setSourceInvoiceId(preview.sourceInvoiceId);
    setSourceInvoiceNo(preview.sourceInvoiceNo);

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
    else setCustomerName(ret.customer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReturn, returnId, isEdit, salesReturns, customers]);

  useEffect(() => {
    if (!isScheme || !schemeKey || isEdit) return;
    applySchemePending(schemeKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScheme, schemeKey, isEdit]);

  useEffect(() => {
    if (!isEdit || creditNoteId == null) return;
    const rec = getCreditNoteById(creditNoteId);
    if (!rec) {
      router.replace(CREDIT_NOTES_LIST_PATH);
      return;
    }
    const direct =
      rec.source === "manual" && !rec.sourceInvoiceId && rec.lineItems.every((l) => l.invoiceQty <= 0);
    setNoteType(direct ? "direct_adjustment" : "against_reference");
    setSourceKind(
      rec.sourceReturnId || rec.sourceReturnNo
        ? "sales_return"
        : rec.schemeSettlementKey?.startsWith("cash:")
          ? "cash_discount"
          : rec.schemeSettlementKey?.startsWith("festive:")
            ? "festive_scheme"
            : rec.schemeSettlementKey?.startsWith("payment:")
              ? "payment_discount"
              : rec.schemeSettlementKey?.startsWith("turnover:")
                ? "turnover_discount"
                : rec.schemeSettlementKey
                  ? "near_expiry"
                  : "manual",
    );
    setCreditNoteNo(rec.creditNoteNo);
    setCreditNoteDate(rec.creditNoteDate);
    setReferenceNo(rec.referenceNo ?? rec.sourceReturnNo ?? rec.schemeCode ?? "");
    setCustomerId(rec.customerId ? String(rec.customerId) : "");
    setCustomerName(rec.customerName);
    setSourceInvoiceNo(rec.sourceInvoiceNo);
    setSourceInvoiceId(rec.sourceInvoiceId);
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
    setAlreadyAdjusted(rec.alreadyAdjustedAmount);
    setRemarks(rec.remarks);
    setStatus(rec.status);
    setAttachmentName(rec.attachmentName ?? "");

    if (direct) {
      setDirectReason(rec.reason);
      const line = rec.lineItems[0];
      setDirectAmount(String(line?.unitPrice ?? rec.taxableValue ?? rec.currentCreditAmount));
      setDirectGstApplicable((line?.taxPct ?? 0) > 0);
      setDirectGstPct(String(line?.taxPct ?? 18));
      setDirectRefNo(rec.referenceNo ?? "");
      setAdjustmentLedgerId(rec.adjustmentLedgerId ?? null);
      setAdjustmentLedgerName(rec.adjustmentLedgerName ?? "");
    } else {
      setLines(recalcAllCreditLines(rec.lineItems.map((l) => normalizeCreditLine(l)), rec.alreadyAdjustedAmount));
      if (rec.sourceReturnNo) {
        setSettlementDetail({
          kind: "sales_return",
          salesReturnNo: rec.sourceReturnNo,
          returnDate: rec.creditNoteDate,
          originalInvoiceNo: rec.sourceInvoiceNo,
          originalInvoiceId: rec.sourceInvoiceId,
        });
      } else if (rec.schemeSettlementKey) {
        const pending = findSchemePendingSettlement(rec.schemeSettlementKey);
        if (pending) setSettlementDetail(pending.settlementDetail);
      }
    }

    const c = rec.customerId ? customers.find((x) => x.id === rec.customerId) : undefined;
    if (c) setCustomerFields(customerMasterToTransactionFields(c));
  }, [isEdit, creditNoteId, router, customers]);

  const freshTotals = computeFreshCreditTotals(directAmount, directGstApplicable, directGstPct);
  const gstSplit = isDirect
    ? { taxable: freshTotals.taxable, taxAmount: freshTotals.gstAmount, grandTotal: freshTotals.total }
    : computeCreditNoteGstSplit(lines);
  const grandTotal = isDirect ? freshTotals.total : gstSplit.grandTotal;

  const onCreditQtyChange = (lineId: string, qty: number) => {
    setLines((prev) => applyReturnQtyToLines(prev, lineId, qty, alreadyAdjusted));
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

  const buildInput = (nextStatus: NoteWorkflowStatus) => {
    const primaryLinked = linkedInvoices[0];
    const refInvId = primaryLinked?.id ?? sourceInvoiceId;
    const refInvNo =
      primaryLinked?.invoiceNo ??
      (sourceInvoiceNo || invoices.find((i) => i.id === refInvId)?.invoiceNo || "");

    return {
      creditNoteDate,
      customerId: customerId ? Number(customerId) : null,
      customerName: customerName.trim(),
      receivableLedger: customerLedgerName,
      sourceInvoiceId: refInvId,
      sourceInvoiceNo: refInvNo,
      linkedInvoices: linkedInvoices.length ? linkedInvoices : undefined,
      sourceOrderId: null,
      sourceOrderNo: "",
      originalAmount: isDirect ? freshTotals.total : grandTotal,
      alreadyAdjustedAmount: isDirect ? 0 : alreadyAdjusted,
      lineItems: isDirect
        ? buildDirectLineItems()
        : lines.filter((l) => l.productName && (l.returnQty > 0 || l.creditAmount > 0)),
      reason: isDirect
        ? directReason || "Other Adjustment"
        : `${CREDIT_NOTE_SOURCE_KIND_LABELS[sourceKind]} settlement`,
      remarks: isDirect ? remarks || directRefNo : remarks,
      status: nextStatus,
      sourceKind,
      sourceReturnId: sourceReturnId || undefined,
      sourceReturnNo: sourceReturnNo || undefined,
      schemeSettlementKey: schemeSettlementKey || undefined,
      schemeCode: schemeCode || undefined,
      schemeName: schemeName || undefined,
      schemeSettlementAmount: schemeSettlementAmount ?? (fromPending ? grandTotal : undefined),
      adjustmentLedgerId: isDirect ? adjustmentLedgerId ?? undefined : undefined,
      adjustmentLedgerName: isDirect ? adjustmentLedgerName || undefined : undefined,
      referenceNo: referenceNo || directRefNo || undefined,
      attachmentName: attachmentName || undefined,
    };
  };

  const validateForPost = (): boolean => {
    if (!customerName.trim()) {
      setError("Customer is required before posting.");
      return false;
    }
    if (isDirect) {
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
      try {
        if (sourceKind === "sales_return") validateCreditNoteLines(lines);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Invalid line quantities.");
        return false;
      }
      if (grandTotal <= 0) {
        setError("Credit note amount must be greater than zero.");
        return false;
      }
    }
    return true;
  };

  const saveDraft = () => {
    setError(null);
    try {
      if (!customerName.trim() && !isDirect) {
        setError("Customer is required.");
        return;
      }
      if (isEdit && creditNoteId != null) {
        updateCreditNote(creditNoteId, buildInput("draft"), { requireAmount: false });
        router.push(`${CREDIT_NOTES_LIST_PATH}/${creditNoteId}`);
      } else {
        const rec = createCreditNote(buildInput("draft"), { requireAmount: false });
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

  const formTitle = isEdit
    ? "Edit Credit Note"
    : fromPending
      ? "Generate Credit Note"
      : isFresh
        ? "Create Credit Note"
        : "New Credit Note";

  const impactLines = useMemo(
    () =>
      buildCreditNoteLedgerImpact({
        customerLedgerName,
        customerName,
        taxable: gstSplit.taxable,
        taxAmount: gstSplit.taxAmount,
        grandTotal,
        sourceKind: isDirect ? "manual" : sourceKind,
        isManualAdjustment: isDirect,
        adjustmentLedgerName: adjustmentLedgerName || undefined,
      }),
    [
      customerLedgerName,
      customerName,
      gstSplit.taxable,
      gstSplit.taxAmount,
      grandTotal,
      isDirect,
      sourceKind,
      adjustmentLedgerName,
    ],
  );

  const showLinkedInvoices =
    !isDirect &&
    linkedInvoices.length > 0 &&
    (sourceKind === "cash_discount" ||
      sourceKind === "festive_scheme" ||
      sourceKind === "payment_discount" ||
      sourceKind === "turnover_discount");

  return (
    <AccountsFormLayout
      fullWidth
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
            <Button variant="outline" size="sm" className="h-9 text-sm font-medium" onClick={() => router.push(CREDIT_NOTES_LIST_PATH)}>
              Cancel
            </Button>
            <Button variant="outline" size="sm" className="h-9 text-sm font-medium gap-1.5" onClick={saveDraft}>
              <Save className="w-3.5 h-3.5" /> Save Draft
            </Button>
            <Button size="sm" className="h-9 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white" onClick={postNote}>
              Post Credit Note
            </Button>
          </div>
        )
      }
    >
      <div className="bg-white border border-border/60 rounded-lg shadow-sm">
        {/* Section 1 — Header (Common) */}
        <div className="px-6 py-5 border-b border-border/60 space-y-4">
          {isFresh && (
            <NoteTypeSelector
              value={noteType}
              options={NOTE_TYPE_OPTIONS}
              onChange={(v) => setNoteType(v)}
              disabled={readOnly}
            />
          )}

          <div className="pb-2.5 border-b border-border mb-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Header</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Credit Note No.</Label>
              <Input className="h-9 text-sm font-mono bg-muted/20" disabled value={isEdit ? creditNoteNo : "Auto-generated"} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Credit Note Date</Label>
              <Input
                type="date"
                className="h-9 text-sm"
                value={creditNoteDate}
                onChange={(e) => setCreditNoteDate(e.target.value)}
                disabled={readOnly}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Source Type</Label>
              <Input
                className="h-9 text-sm bg-muted/20"
                disabled
                value={CREDIT_NOTE_SOURCE_KIND_LABELS[sourceKind]}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Reference No.</Label>
              <Input className="h-9 text-sm font-mono bg-muted/20" disabled value={referenceNo || "—"} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Customer</Label>
              {fromPending || isEdit ? (
                <Input className="h-9 text-sm bg-muted/20" disabled value={customerName || "—"} />
              ) : isDirect ? (
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
              ) : (
                <Input className="h-9 text-sm bg-muted/20" disabled value={customerName || "—"} />
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Status</Label>
              <div className="h-9 flex items-center">
                <NoteWorkflowBadge status={status} />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2 — Settlement Summary (Dynamic) */}
        {isDirect ? (
          <div className="px-6 py-5 border-b border-border/60">
            <FreshCreditNoteForm
              customerSelector={null}
              hideSummaryFields
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
        ) : (
          <>
            {showLinkedInvoices && (
              <div className="px-6 py-4 border-b border-border/60">
                <LinkedInvoicesMultiSelect
                  value={linkedInvoices}
                  onChange={setLinkedInvoices}
                  options={linkedInvoiceOptions}
                  disabled={readOnly || fromPending}
                />
              </div>
            )}
            <SettlementSummary
              sourceKind={sourceKind}
              settlementDetail={settlementDetail}
              lines={sourceKind === "sales_return" ? lines : []}
              readOnly={readOnly}
              onQtyChange={onCreditQtyChange}
            />
          </>
        )}

        {/* Section 3 — Accounting Summary (Common) */}
        {!isDirect && (
          <AccountingSummary
            taxableAmount={gstSplit.taxable}
            gstAmount={gstSplit.taxAmount}
            totalAmount={grandTotal}
            narration={remarks}
            onNarrationChange={setRemarks}
            attachmentName={attachmentName}
            onAttachmentChange={setAttachmentName}
            impactLines={impactLines}
            readOnly={readOnly}
          />
        )}

        {isDirect && grandTotal > 0 && (
          <div className="px-6 pb-4">
            <AccountingSummary
              taxableAmount={gstSplit.taxable}
              gstAmount={gstSplit.taxAmount}
              totalAmount={grandTotal}
              narration={remarks}
              onNarrationChange={setRemarks}
              attachmentName={attachmentName}
              onAttachmentChange={setAttachmentName}
              impactLines={impactLines}
              readOnly={readOnly}
            />
          </div>
        )}

        {error && <p className="px-6 pb-4 text-xs text-red-600">{error}</p>}
      </div>
    </AccountsFormLayout>
  );
}
