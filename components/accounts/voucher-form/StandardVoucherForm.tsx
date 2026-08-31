"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { AccountsDocumentWorkflowSection } from "@/components/accounts/AccountsDocumentWorkflowSection";
import { AccountsToast, useAccountsToast } from "@/components/accounts/AccountsToast";
import { X } from "lucide-react";
import { AccountsFormLayout } from "@/app/(app)/accounts/expenses/components/AccountsFormLayout";
import { resolveVoucherPartyRef } from "@/components/accounts/VoucherInlineDocumentSelect";
import {
  VOUCHER_AMOUNT_WIDTH,
  VOUCHER_BUTTON_CLASS,
  VOUCHER_ERROR_CLASS,
  VOUCHER_INPUT_CLASS,
  VOUCHER_MONEY_INPUT_CLASS,
  VOUCHER_PREVIEW_TEXT_CLASS,
  VoucherFormField,
  VoucherNotFoundMessage,
  VoucherSelectContent,
} from "@/components/accounts/voucher-simple-form-ui";
import { VoucherFormHeaderFields } from "@/components/accounts/voucher-form/VoucherFormHeaderFields";
import { VoucherNarrationAttachmentsSection } from "@/components/accounts/voucher-form/VoucherNarrationAttachmentsSection";
import type { VoucherAttachmentFile } from "@/components/accounts/voucher-form/VoucherAttachmentSection";
import { VoucherFormActionBar } from "@/components/accounts/voucher-form/VoucherFormActionBar";
import { VoucherDocumentActions } from "@/components/accounts/voucher-form/VoucherDocumentActions";
import { VoucherBankReconciliationSection } from "@/components/accounts/VoucherBankReconciliationSection";
import { VoucherDualEntryPanel } from "@/components/accounts/voucher-form/VoucherDualEntryPanel";
import { VoucherFormSectionCard } from "@/components/accounts/voucher-form/VoucherFormSectionCard";
import { VoucherAccountingPostingSummary } from "@/components/accounts/voucher-form/VoucherAccountingPostingSummary";
import { AccountingImpactSection } from "@/components/accounts/AccountingImpactSection";
import type { AccountingImpactDocKey } from "@/lib/accounts/accounting-impact-docs";
import { defaultVisibilityForType } from "@/components/accounts/voucher-form/voucher-form-shell";
import {
  VoucherInstrumentFields,
  getInstrumentFieldKind,
  type VoucherInstrumentValues,
} from "@/components/accounts/voucher-form/VoucherInstrumentFields";
import {
  VoucherAdjustmentsSection,
  adjustmentRowsToPreviewLines,
  createEmptyAdjustmentRow,
  sumAdjustmentEffect,
  type VoucherAdjustmentRow,
} from "@/components/accounts/voucher-form/VoucherAdjustmentsSection";
import { VoucherSettlementSummary } from "@/components/accounts/voucher-form/VoucherSettlementSummary";
import { stashVoucherFormToast } from "@/lib/accounts/voucher-form-toast";
import { loadWarehouseMappingOptions } from "@/lib/accounts/bank-warehouse-mapping";
import { Select, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VoucherJournalEntryGrid } from "@/components/accounts/voucher-form/VoucherJournalEntryGrid";
import { useVoucherForm } from "@/lib/accounts/use-voucher-form";
import {
  calcFormEntryTotals,
  getFormEntry,
} from "@/lib/accounts/voucher-form-model";
import { getVendorById } from "@/lib/accounts/transaction-master-fetch";
import { parseCashVoucherFromLines } from "@/app/(app)/accounts/vouchers/voucher-data";
import { VOUCHER_TYPE_LABELS } from "@/app/(app)/accounts/vouchers/voucher-data";
import type { VoucherTypeCode } from "@/app/(app)/accounts/masters/masters-data";
import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import type { AccountsVoucherCategory } from "@/lib/accounts/accounts-maker-checker";
import { formatMoney, roundMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import { useFormDirtySnapshot } from "@/lib/accounts/use-form-dirty-snapshot";
import { useTransactionFormCancel } from "@/components/accounts/TransactionFormCancel";
import { isBankAccountLedger } from "@/lib/accounts/bank-coa-utils";
import { ledgerHasAncestorNamed } from "@/lib/accounts/coa-hierarchy";
import type { ChartOfAccount } from "@/app/(app)/accounts/data";

const VOUCHER_CATEGORY_MAP: Partial<Record<VoucherTypeCode, AccountsVoucherCategory>> = {
  journal: "journal_entry",
  receipt: "receipt_voucher",
  payment: "payment_voucher",
  contra: "contra_voucher",
};

const VOUCHER_IMPACT_DOC_KEY: Partial<Record<VoucherTypeCode, AccountingImpactDocKey>> = {
  payment: "payment_voucher",
  receipt: "receipt_voucher",
  contra: "contra_voucher",
  journal: "journal_voucher",
};

function isCashLedger(ledger: ChartOfAccount | null | undefined, records: ChartOfAccount[]): boolean {
  if (!ledger) return false;
  return ledgerHasAncestorNamed(ledger, "Cash-in-Hand", records);
}

export interface StandardVoucherFormProps {
  voucherType: VoucherTypeCode;
  cancelHref: string;
  onDone: () => void;
  voucherId?: number;
  readOnly?: boolean;
  onEdit?: () => void;
}

export function StandardVoucherForm({
  voucherType,
  cancelHref,
  onDone,
  voucherId,
  readOnly = false,
  onEdit,
}: StandardVoucherFormProps) {
  const label = VOUCHER_TYPE_LABELS[voucherType];
  const {
    mounted,
    config,
    model,
    patchModel,
    setEntries,
    extras,
    setExtras,
    error,
    canPost,
    coaRecords,
    existing,
    isNew,
    isView,
    isEdit,
    canEdit,
    partyLedger,
    handleSaveDraft,
    handleSubmitForApproval,
    handlePost,
    resolvedVoucherId,
  } = useVoucherForm({
    voucherType,
    voucherId,
    readOnly,
    onDone,
    onSaveSuccess: (action) => {
      stashVoucherFormToast(
        action === "draft"
          ? `${label} saved as draft`
          : action === "submit"
            ? `${label} submitted for approval`
            : `${label} posted successfully`,
      );
    },
  });

  const [workflowRefreshKey, setWorkflowRefreshKey] = useState(0);
  const financialYears = useMemo(
    () => (mounted ? loadFinancialYears() : []),
    [mounted, workflowRefreshKey],
  );
  const showFinancialYear = voucherType === "journal" && (readOnly || isEdit);

  const [deductTds, setDeductTds] = useState(false);
  const [tdsAmount, setTdsAmount] = useState("");
  const [adjustmentRows, setAdjustmentRows] = useState<VoucherAdjustmentRow[]>([]);
  const [instrument, setInstrument] = useState<VoucherInstrumentValues>({
    chequeNumber: "",
    chequeDate: "",
    transactionReference: "",
    transactionDate: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  /** UI-only attachments — not persisted to backend in this task. */
  const [attachmentFiles, setAttachmentFiles] = useState<VoucherAttachmentFile[]>([]);
  const { toast, showToast, dismissToast } = useAccountsToast();

  const debitEntry = getFormEntry(model.entries, "DEBIT");
  const creditEntry = getFormEntry(model.entries, "CREDIT");
  const amount = debitEntry?.amount ?? creditEntry?.amount ?? 0;

  useEffect(() => {
    if (!existing || isNew) return;
    if (voucherType === "receipt" || voucherType === "payment") {
      const parsed = parseCashVoucherFromLines(existing.lines, voucherType);
      setExtras({
        tdsAmount: parsed.tdsAmount,
        tdsSectionMasterId: null,
        expenseHeadLedgerId:
          voucherType === "payment" && parsed.expenseHeadLedgerId ? parsed.expenseHeadLedgerId : null,
        expenseHeadLedgerName: parsed.expenseHeadLedgerName,
      });
      setTdsAmount(parsed.tdsAmount ? String(parsed.tdsAmount) : "");
      setDeductTds((parsed.tdsAmount ?? 0) > 0);
    }
    if (voucherType === "receipt" || voucherType === "payment" || voucherType === "contra") {
      setInstrument({
        chequeNumber: existing.instrumentNumber ?? "",
        chequeDate: existing.instrumentDate ?? "",
        transactionReference: existing.transactionReference ?? "",
        transactionDate: existing.transactionDate ?? "",
      });
    }
  }, [existing, isNew, voucherType, setExtras]);

  const partyRef = useMemo(
    () =>
      partyLedger && (voucherType === "receipt" || voucherType === "payment")
        ? resolveVoucherPartyRef(voucherType, partyLedger, coaRecords)
        : null,
    [partyLedger, voucherType, coaRecords],
  );

  const vendor = useMemo(
    () => (partyRef?.kind === "vendor" ? getVendorById(partyRef.contactId) : null),
    [partyRef],
  );

  const isJournalGrid = config.layout === "journal-grid";
  const showPaymentReceiptExtras = voucherType === "payment" || voucherType === "receipt";
  const showTdsSection = config.showTds && (deductTds || Boolean(vendor?.tdsApplicable));
  const numericTdsFromAdj = roundMoney(
    adjustmentRows
      .filter((r) => r.adjustmentType === "TDS" || r.adjustmentType === "Customer TDS")
      .reduce((s, r) => s + (r.amount || 0), 0),
  );
  const numericTds =
    numericTdsFromAdj > 0 ? numericTdsFromAdj : showTdsSection ? Number(tdsAmount) || 0 : 0;
  const settlementKind: "payment" | "receipt" =
    voucherType === "receipt" ? "receipt" : "payment";
  const grossAmount =
    voucherType === "payment"
      ? roundMoney(debitEntry?.amount ?? 0)
      : voucherType === "receipt"
        ? roundMoney(creditEntry?.amount ?? 0)
        : roundMoney(amount);
  const adjustmentsTotal = showPaymentReceiptExtras
    ? sumAdjustmentEffect(adjustmentRows, settlementKind)
    : roundMoney(numericTds);
  const netCashBank = roundMoney(Math.max(0, grossAmount - adjustmentsTotal));
  const allocatedAmount = roundMoney(
    (voucherType === "payment" ? debitEntry : creditEntry)?.allocations?.reduce(
      (s, a) => s + (a.allocatedAmount || 0),
      0,
    ) ?? 0,
  );
  const unallocatedAmount = roundMoney(Math.max(0, grossAmount - allocatedAmount));
  const paymentGrossDebit = voucherType === "payment" ? grossAmount : 0;
  const paymentNetBank = voucherType === "payment" ? netCashBank : 0;

  useEffect(() => {
    if (readOnly || voucherType !== "payment") return;
    if (vendor?.tdsApplicable) setDeductTds(true);
  }, [vendor?.id, vendor?.tdsApplicable, voucherType, readOnly]);

  useEffect(() => {
    setExtras((prev) => ({
      ...prev,
      tdsAmount: numericTds,
      tdsSectionMasterId: vendor?.tdsMasterId ?? null,
      expenseHeadLedgerId:
        voucherType === "payment" && partyLedger?.accountType === "Expense"
          ? partyLedger.id
          : prev.expenseHeadLedgerId,
      expenseHeadLedgerName:
        voucherType === "payment" && partyLedger?.accountType === "Expense"
          ? partyLedger.accountName
          : prev.expenseHeadLedgerName,
      instrument,
      adjustmentRows: adjustmentRows.map((r) => ({
        id: r.id,
        adjustmentType: r.adjustmentType,
        ledgerId: r.ledgerId,
        ledgerName: r.ledgerName,
        debitOrCredit: r.debitOrCredit,
        amount: r.amount,
      })),
    }));
  }, [numericTds, vendor?.tdsMasterId, partyLedger, voucherType, setExtras, instrument, adjustmentRows]);

  useEffect(() => {
    if (readOnly || isJournalGrid) return;
    if (voucherType !== "payment" && voucherType !== "receipt" && voucherType !== "contra") return;
    const kind = getInstrumentFieldKind(model.transactionMode);
    const nextInstrumentType = model.transactionMode;
    let nextNumber = model.instrumentNumber ?? "";
    let nextDate = model.instrumentDate ?? "";
    let nextTxnRef = model.transactionReference ?? "";
    let nextTxnDate = model.transactionDate ?? "";
    let ref = model.referenceNumber;
    if (kind === "cheque") {
      nextNumber = instrument.chequeNumber;
      nextDate = instrument.chequeDate;
      nextTxnRef = "";
      nextTxnDate = "";
      ref = instrument.chequeNumber;
    } else if (kind === "none") {
      nextNumber = "";
      nextDate = "";
      nextTxnRef = "";
      nextTxnDate = "";
      ref = "";
    } else if (kind === "transfer" || kind === "other") {
      nextNumber = "";
      nextDate = "";
      nextTxnRef = instrument.transactionReference;
      nextTxnDate = instrument.transactionDate;
      ref = instrument.transactionReference;
    }
    const patch: Partial<typeof model> = {};
    if (nextInstrumentType !== model.instrumentType) patch.instrumentType = nextInstrumentType;
    if (nextNumber !== (model.instrumentNumber ?? "")) patch.instrumentNumber = nextNumber;
    if (nextDate !== (model.instrumentDate ?? "")) patch.instrumentDate = nextDate;
    if (nextTxnRef !== (model.transactionReference ?? "")) patch.transactionReference = nextTxnRef;
    if (nextTxnDate !== (model.transactionDate ?? "")) patch.transactionDate = nextTxnDate;
    if (ref !== model.referenceNumber) patch.referenceNumber = ref;
    if (Object.keys(patch).length) patchModel(patch);
  }, [
    instrument.chequeNumber,
    instrument.chequeDate,
    instrument.transactionReference,
    instrument.transactionDate,
    model.transactionMode,
    model.referenceNumber,
    model.instrumentType,
    model.instrumentNumber,
    model.instrumentDate,
    model.transactionReference,
    model.transactionDate,
    readOnly,
    isJournalGrid,
    voucherType,
    patchModel,
  ]);

  const pageTitle = isView ? `View ${label}` : !isNew ? `Edit ${label}` : `New ${label}`;
  const { totalDebit, totalCredit } = calcFormEntryTotals(model.entries);

  const [baselineReady, setBaselineReady] = useState(false);
  useEffect(() => {
    setBaselineReady(false);
    const id = window.setTimeout(() => setBaselineReady(true), 300);
    return () => window.clearTimeout(id);
  }, [resolvedVoucherId, isNew, existing?.id]);

  const formSnapshot = useMemo(
    () => ({ model, extras, deductTds, tdsAmount, adjustmentRows, instrument }),
    [model, extras, deductTds, tdsAmount, adjustmentRows, instrument],
  );
  const isDirty = useFormDirtySnapshot(formSnapshot, {
    ready: mounted && baselineReady && (isNew || !!existing),
  });

  const handleQuickAddSuccess = useCallback(() => {
    showToast("Ledger created successfully");
  }, [showToast]);

  const onSaveDraftClick = useCallback(() => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      handleSaveDraft();
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, handleSaveDraft]);

  const onSubmitForApprovalClick = useCallback(() => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      handleSubmitForApproval();
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, handleSubmitForApproval]);

  const onPostClick = useCallback(() => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      handlePost();
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, handlePost]);

  const { requestCancel, discardDialog } = useTransactionFormCancel({
    listHref: cancelHref,
    isDirty,
    onNavigate: onDone,
  });

  const bankCashLedger =
    voucherType === "payment"
      ? creditEntry
      : voucherType === "receipt"
        ? debitEntry
        : voucherType === "contra"
          ? debitEntry
          : null;

  const bankCashCoa = bankCashLedger?.accountId
    ? coaRecords.find((r) => r.id === bankCashLedger.accountId) ?? null
    : null;

  const includeCashBook = Boolean(
    bankCashCoa && isCashLedger(bankCashCoa, coaRecords),
  );
  const includeBankBook = Boolean(
    bankCashCoa && isBankAccountLedger(bankCashCoa),
  );

  const visibilityItems = useMemo(() => {
    if (voucherType === "journal") {
      return defaultVisibilityForType("journal");
    }
    if (voucherType === "contra") {
      return defaultVisibilityForType("contra");
    }
    if (voucherType === "payment" || voucherType === "receipt") {
      return defaultVisibilityForType(voucherType, {
        isCash: includeCashBook,
        isBank: includeBankBook,
      });
    }
    return defaultVisibilityForType("journal");
  }, [voucherType, includeCashBook, includeBankBook]);

  const postingSummaryProps = useMemo(() => {
    if (isJournalGrid) {
      return {
        voucherTypeLabel: label,
        totalDebit,
        totalCredit,
        visibilityItems,
      };
    }

    const adjustmentPreviewLines = showPaymentReceiptExtras
      ? adjustmentRowsToPreviewLines(adjustmentRows)
      : [];

    return {
      voucherTypeLabel: label,
      debitLedgerLabel: "Debit",
      debitLedgerName: debitEntry?.accountName || undefined,
      creditLedgerLabel: "Credit",
      creditLedgerName: creditEntry?.accountName || undefined,
      voucherAmount: showPaymentReceiptExtras ? grossAmount : amount,
      voucherAmountLabel: showPaymentReceiptExtras ? "Gross Amount" : "Voucher Amount",
      netCashBankAmount: showPaymentReceiptExtras ? netCashBank : undefined,
      netCashBankLabel: "Net Cash / Bank Amount",
      adjustmentPreviewLines: showPaymentReceiptExtras ? adjustmentPreviewLines : undefined,
      visibilityItems,
    };
  }, [
    isJournalGrid,
    label,
    totalDebit,
    totalCredit,
    visibilityItems,
    debitEntry?.accountName,
    creditEntry?.accountName,
    amount,
    showPaymentReceiptExtras,
    adjustmentRows,
    grossAmount,
    netCashBank,
  ]);

  const breadcrumb = [
    { label: "Accounts", href: "/accounts" },
    { label: "Transactions", href: cancelHref },
    { label: pageTitle, href: cancelHref },
  ];

  const headerMeta = !readOnly ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
      Draft
    </span>
  ) : existing?.status ? (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold",
        existing.status === "posted"
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-100 text-slate-600",
      )}
    >
      {String(existing.status).charAt(0).toUpperCase() + String(existing.status).slice(1)}
    </span>
  ) : null;

  const headerActions = readOnly ? (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" className={cn(VOUCHER_BUTTON_CLASS, "gap-1")} onClick={onDone}>
        <X className="w-3.5 h-3.5" /> Back
      </Button>
      <VoucherDocumentActions
        status={existing?.status}
        canEdit={canEdit}
        onEdit={onEdit}
        showReverse
        reverseEnabled={false}
      />
    </div>
  ) : undefined;

  const stickyFooter = readOnly ? undefined : (
    <VoucherFormActionBar
      onDiscard={requestCancel}
      onSaveDraft={onSaveDraftClick}
      onSaveAndPost={onPostClick}
      saveAndPostLabel="Save & Post"
      discardDisabled={isSubmitting}
      saveDraftDisabled={isSubmitting}
      saveAndPostDisabled={!canPost || isSubmitting}
    />
  );

  if (mounted && !isNew && !existing) {
    return (
      <AccountsFormLayout
        title={pageTitle}
        breadcrumb={breadcrumb}
        fullWidth
        onBackClick={onDone}
        footer={
          <Button variant="outline" size="sm" className={cn(VOUCHER_BUTTON_CLASS, "gap-1")} onClick={onDone}>
            <X className="w-3.5 h-3.5" /> Back
          </Button>
        }
      >
        <VoucherNotFoundMessage message={`${label} not found.`} />
      </AccountsFormLayout>
    );
  }

  if (!mounted) {
    return (
      <AccountsFormLayout title={pageTitle} breadcrumb={breadcrumb} fullWidth>
        <div className="border border-border rounded-xl bg-muted/10 h-48 animate-pulse" />
      </AccountsFormLayout>
    );
  }

  return (
    <>
      <div className="h-full min-h-0 flex flex-col">
      <AccountsFormLayout
        title={pageTitle}
        breadcrumb={breadcrumb}
        fullWidth
        headerMeta={headerMeta}
        footer={headerActions}
        stickyFooter={stickyFooter}
        onBackClick={readOnly ? onDone : requestCancel}
      >
        <div className="space-y-2 pb-20">
          {error && <div className={VOUCHER_ERROR_CLASS}>{error}</div>}

          <VoucherFormSectionCard title="Voucher Details" helper={config.pageSubtitle}>
            <VoucherFormHeaderFields
              model={model}
              config={config}
              readOnly={readOnly}
              status={model.status}
              showStatus={isView}
              showFinancialYear={showFinancialYear}
              financialYears={financialYears}
              onChange={patchModel}
              hideReferenceNumber={!isJournalGrid && config.showTransactionMode !== false}
            />
            {!isJournalGrid && config.showTransactionMode !== false && (
              <div className="mt-2">
                <VoucherInstrumentFields
                  mode={model.transactionMode}
                  values={instrument}
                  onChange={(patch) => setInstrument((prev) => ({ ...prev, ...patch }))}
                  readOnly={readOnly}
                />
                {getInstrumentFieldKind(model.transactionMode) === "none" && !readOnly ? (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Cash mode — no cheque or transaction reference required.
                  </p>
                ) : null}
              </div>
            )}
            {!isJournalGrid && (
              <div className="mt-2 max-w-sm">
                <VoucherFormField label="Warehouse / Branch">
                  <Select
                    value={extras.warehouseRef ?? ""}
                    onValueChange={(v) => setExtras((e) => ({ ...e, warehouseRef: v || undefined }))}
                    disabled={readOnly}
                  >
                    <SelectTrigger className={VOUCHER_INPUT_CLASS}>
                      <SelectValue placeholder="Select warehouse for bank accounts…" />
                    </SelectTrigger>
                    <VoucherSelectContent>
                      {loadWarehouseMappingOptions().map((w) => (
                        <SelectItem key={w.value} value={w.value} className="text-[13px]">
                          {w.label}
                        </SelectItem>
                      ))}
                    </VoucherSelectContent>
                  </Select>
                </VoucherFormField>
              </div>
            )}
            {isJournalGrid && !readOnly && (
              <div className="mt-2 max-w-sm">
                <VoucherFormField label="Warehouse / Branch">
                  <Select
                    value={extras.warehouseRef ?? ""}
                    onValueChange={(v) => setExtras((e) => ({ ...e, warehouseRef: v || undefined }))}
                  >
                    <SelectTrigger className={VOUCHER_INPUT_CLASS}>
                      <SelectValue placeholder="Select warehouse for bank accounts…" />
                    </SelectTrigger>
                    <VoucherSelectContent>
                      {loadWarehouseMappingOptions().map((w) => (
                        <SelectItem key={w.value} value={w.value} className="text-[13px]">
                          {w.label}
                        </SelectItem>
                      ))}
                    </VoucherSelectContent>
                  </Select>
                </VoucherFormField>
              </div>
            )}
          </VoucherFormSectionCard>

          <VoucherFormSectionCard title={config.detailsSectionTitle}>
            {isJournalGrid ? (
              <VoucherJournalEntryGrid
                entries={model.entries}
                voucherDate={model.voucherDate}
                coaRecords={coaRecords}
                readOnly={readOnly}
                onEntriesChange={setEntries}
                onQuickAddSuccess={handleQuickAddSuccess}
                warehouseRef={extras.warehouseRef}
              />
            ) : (
              <>
                <VoucherDualEntryPanel
                  entries={model.entries}
                  config={config}
                  voucherDate={model.voucherDate}
                  coaRecords={coaRecords}
                  readOnly={readOnly}
                  onEntriesChange={setEntries}
                  tdsAmount={numericTds}
                  onQuickAddSuccess={handleQuickAddSuccess}
                  warehouseRef={extras.warehouseRef}
                />

                {showPaymentReceiptExtras && (
                  <>
                    <VoucherAdjustmentsSection
                      voucherKind={settlementKind}
                      rows={adjustmentRows}
                      onChange={setAdjustmentRows}
                      readOnly={readOnly}
                    />
                    <VoucherSettlementSummary
                      variant={settlementKind}
                      grossAmount={grossAmount}
                      adjustmentsTotal={adjustmentsTotal}
                      netCashBankAmount={netCashBank}
                      allocatedAmount={allocatedAmount}
                      unallocatedOrAdvanceAmount={unallocatedAmount}
                    />
                  </>
                )}

                {voucherType === "payment" && showTdsSection && !readOnly && adjustmentRows.length === 0 && (
                  <div className="mt-2 rounded-md border border-border/40 bg-white p-2 space-y-1.5 max-w-[420px]">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={deductTds}
                        onCheckedChange={(c) => {
                          const on = Boolean(c);
                          setDeductTds(on);
                          if (on && adjustmentRows.length === 0) {
                            setAdjustmentRows([createEmptyAdjustmentRow("payment", "TDS")]);
                          }
                        }}
                      />
                      <span className={VOUCHER_PREVIEW_TEXT_CLASS}>Deduct TDS</span>
                      {vendor?.tdsApplicable && (
                        <span className="text-[11px] text-muted-foreground">
                          (applicable for this vendor — adds an Adjustments row)
                        </span>
                      )}
                    </label>
                    {deductTds && (
                      <VoucherFormField label="TDS Amount" className={VOUCHER_AMOUNT_WIDTH}>
                        <AccountsMoneyInput
                          compact={false}
                          className={cn(VOUCHER_INPUT_CLASS, VOUCHER_MONEY_INPUT_CLASS)}
                          value={numericTds}
                          onChange={(v) => {
                            setTdsAmount(String(v));
                            setAdjustmentRows((prev) => {
                              if (prev.some((r) => r.adjustmentType === "TDS")) {
                                return prev.map((r) =>
                                  r.adjustmentType === "TDS" ? { ...r, amount: v } : r,
                                );
                              }
                              return [{ ...createEmptyAdjustmentRow("payment", "TDS"), amount: v }];
                            });
                          }}
                        />
                      </VoucherFormField>
                    )}
                  </div>
                )}
              </>
            )}
          </VoucherFormSectionCard>

          <VoucherNarrationAttachmentsSection
            narration={model.narration}
            onNarrationChange={(narration) => patchModel({ narration })}
            readOnly={readOnly}
            narrationPlaceholder="Optional narration…"
            attachmentFiles={attachmentFiles}
            onAddAttachmentFiles={(files) => {
              setAttachmentFiles((prev) => [
                ...prev,
                ...files.map((f) => ({
                  id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                  fileName: f.name,
                  previewUrl: URL.createObjectURL(f),
                })),
              ]);
            }}
            onRemoveAttachment={(id) => {
              setAttachmentFiles((prev) => {
                const target = prev.find((f) => f.id === id);
                if (target?.previewUrl?.startsWith("blob:")) {
                  URL.revokeObjectURL(target.previewUrl);
                }
                return prev.filter((f) => f.id !== id);
              });
            }}
          />

          {VOUCHER_IMPACT_DOC_KEY[voucherType] ? (
            <AccountingImpactSection
              docKey={VOUCHER_IMPACT_DOC_KEY[voucherType]!}
              entryPreview={<VoucherAccountingPostingSummary {...postingSummaryProps} />}
            />
          ) : null}

          {readOnly &&
            resolvedVoucherId != null &&
            (voucherType === "payment" ||
              voucherType === "receipt" ||
              voucherType === "contra") && (
              <VoucherBankReconciliationSection
                voucherId={resolvedVoucherId}
                voucherNumber={existing?.voucherNumber}
              />
            )}

          {readOnly &&
            resolvedVoucherId != null &&
            VOUCHER_CATEGORY_MAP[voucherType] &&
            existing?.referenceNo !== "BANK-RECON-DEMO" && (
              <div className="mt-1">
                <AccountsDocumentWorkflowSection
                  category={VOUCHER_CATEGORY_MAP[voucherType]!}
                  documentId={resolvedVoucherId}
                  workflow={existing?.workflow}
                  legacyStatus={existing?.status}
                  onUpdated={() => setWorkflowRefreshKey((k) => k + 1)}
                />
              </div>
            )}
        </div>
      </AccountsFormLayout>
      </div>
      <AccountsToast toast={toast} onDismiss={dismissToast} />
      {discardDialog}
    </>
  );
}
