"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { JournalLedgerImpactPreview } from "@/components/accounts/JournalLedgerImpactPreview";
import { AccountsDocumentWorkflowSection } from "@/components/accounts/AccountsDocumentWorkflowSection";
import { AccountsToast, useAccountsToast } from "@/components/accounts/AccountsToast";
import { Pencil, Save, X } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { resolveVoucherPartyRef } from "@/components/accounts/VoucherInlineDocumentSelect";
import {
  VOUCHER_AMOUNT_WIDTH,
  VOUCHER_BUTTON_CLASS,
  VOUCHER_ERROR_CLASS,
  VOUCHER_FORM_CARD,
  VOUCHER_FORM_OUTER,
  VOUCHER_INPUT_CLASS,
  VOUCHER_MONEY_INPUT_CLASS,
  VOUCHER_PREVIEW_TEXT_CLASS,
  VoucherFormField,
  VoucherFormSection,
  VoucherFormSummary,
  VoucherNotFoundMessage,
} from "@/components/accounts/voucher-simple-form-ui";
import { VoucherFormHeaderFields } from "@/components/accounts/voucher-form/VoucherFormHeaderFields";
import { VoucherNarrationSection } from "@/components/accounts/voucher-form/VoucherNarrationSection";
import { VoucherDualEntryPanel } from "@/components/accounts/voucher-form/VoucherDualEntryPanel";
import { VoucherJournalEntryGrid } from "@/components/accounts/voucher-form/VoucherJournalEntryGrid";
import { useVoucherForm } from "@/lib/accounts/use-voucher-form";
import {
  calcFormEntryTotals,
  getFormEntry,
} from "@/lib/accounts/voucher-form-model";
import { getVendorById } from "@/lib/accounts/transaction-master-fetch";
import { parseCashVoucherFromLines } from "@/app/(app)/accounts/vouchers/voucher-data";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { VOUCHER_TYPE_LABELS } from "@/app/(app)/accounts/vouchers/voucher-data";
import type { VoucherTypeCode } from "@/app/(app)/accounts/masters/masters-data";
import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { journalEntryImpact } from "@/lib/accounts/ledger-impact-previews";
import type { AccountsVoucherCategory } from "@/lib/accounts/accounts-maker-checker";
import { isVoucherBalanced } from "@/app/(app)/accounts/vouchers/voucher-data";
import { formatMoney, roundMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import { useFormDirtySnapshot } from "@/lib/accounts/use-form-dirty-snapshot";
import { stashVoucherFormToast } from "@/lib/accounts/voucher-form-toast";
import {
  useTransactionFormCancel,
} from "@/components/accounts/TransactionFormCancel";

const VOUCHER_CATEGORY_MAP: Partial<Record<VoucherTypeCode, AccountsVoucherCategory>> = {
  journal: "journal_entry",
  receipt: "receipt_voucher",
  payment: "payment_voucher",
};

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
    handlePost,
    resolvedVoucherId,
  } = useVoucherForm({
    voucherType,
    voucherId,
    readOnly,
    onDone,
    onSaveSuccess: (action) => {
      stashVoucherFormToast(
        action === "draft" ? `${label} saved as draft` : `${label} posted successfully`,
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
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const showTdsSection = config.showTds && (deductTds || Boolean(vendor?.tdsApplicable));
  const numericTds = showTdsSection ? Number(tdsAmount) || 0 : 0;
  const paymentGrossDebit = voucherType === "payment" ? roundMoney(debitEntry?.amount ?? 0) : 0;
  const paymentNetBank = roundMoney(Math.max(0, paymentGrossDebit - numericTds));

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
    }));
  }, [numericTds, vendor?.tdsMasterId, partyLedger, voucherType, setExtras]);

  const pageTitle = isView ? `View ${label}` : !isNew ? `Edit ${label}` : `New ${label}`;
  const { totalDebit, totalCredit } = calcFormEntryTotals(model.entries);
  const summaryAmount =
    config.layout === "journal-grid" ? totalDebit : amount;
  const journalBalanced = isVoucherBalanced(totalDebit, totalCredit);

  const [baselineReady, setBaselineReady] = useState(false);
  useEffect(() => {
    setBaselineReady(false);
    const id = window.setTimeout(() => setBaselineReady(true), 300);
    return () => window.clearTimeout(id);
  }, [resolvedVoucherId, isNew, existing?.id]);

  const formSnapshot = useMemo(
    () => ({ model, extras, deductTds, tdsAmount }),
    [model, extras, deductTds, tdsAmount],
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

  const impactLines = useMemo(() => {
    if (config.layout !== "journal-grid") return [];
    return journalEntryImpact(
      model.entries
        .filter((e) => e.accountId && (Number(e.amount) || 0) > 0)
        .map((e) => ({
          ledgerName: e.accountName,
          debit: e.entryType === "DEBIT" ? e.amount : 0,
          credit: e.entryType === "CREDIT" ? e.amount : 0,
          narration: e.remark,
        })),
    );
  }, [config.layout, model.entries]);

  if (mounted && !isNew && !existing) {
    return (
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Transactions", pageTitle, cancelHref)}
        title={pageTitle}
        description={config.pageSubtitle}
        layout="form"
        className="max-w-none w-full"
        actions={
          <Button variant="outline" size="sm" className={cn(VOUCHER_BUTTON_CLASS, "gap-1")} onClick={onDone}>
            <X className="w-3.5 h-3.5" /> Back
          </Button>
        }
      >
        <VoucherNotFoundMessage message={`${label} not found.`} />
      </AccountsPageShell>
    );
  }

  if (!mounted) {
    return (
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Transactions", pageTitle, cancelHref)}
        title={pageTitle}
        description={config.pageSubtitle}
        layout="form"
        className="max-w-none w-full"
      >
        <div className={cn(VOUCHER_FORM_OUTER, "border border-border rounded-xl bg-muted/10 h-48 animate-pulse")} />
      </AccountsPageShell>
    );
  }

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Transactions", pageTitle, cancelHref)}
      title={pageTitle}
      description={config.pageSubtitle}
      layout="form"
      className="max-w-none w-full"
      actions={
        readOnly ? (
          <>
            <Button variant="outline" size="sm" className={cn(VOUCHER_BUTTON_CLASS, "gap-1")} onClick={onDone}>
              <X className="w-3.5 h-3.5" /> Back
            </Button>
            {canEdit && onEdit && (
              <Button
                size="sm"
                className={cn(VOUCHER_BUTTON_CLASS, "bg-brand-600 hover:bg-brand-700 text-white gap-1")}
                onClick={onEdit}
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Button>
            )}
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={VOUCHER_BUTTON_CLASS}
              onClick={requestCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={cn(VOUCHER_BUTTON_CLASS, "gap-1")}
              onClick={onSaveDraftClick}
              disabled={isSubmitting}
            >
              <Save className="w-4 h-4" /> Save Draft
            </Button>
            <Button
              size="sm"
              className={cn(VOUCHER_BUTTON_CLASS, "bg-brand-600 hover:bg-brand-700 text-white gap-1")}
              onClick={onPostClick}
              disabled={!canPost || isSubmitting}
            >
              <Save className="w-3.5 h-3.5" /> Post Voucher
            </Button>
            {discardDialog}
          </>
        )
      }
    >
      <div className={VOUCHER_FORM_OUTER}>
        {error && <div className={VOUCHER_ERROR_CLASS}>{error}</div>}

        <div className={VOUCHER_FORM_CARD}>
          <VoucherFormSection title="Voucher Details">
            <VoucherFormHeaderFields
              model={model}
              config={config}
              readOnly={readOnly}
              status={model.status}
              showStatus={isView}
              showFinancialYear={showFinancialYear}
              financialYears={financialYears}
              onChange={patchModel}
            />
          </VoucherFormSection>

          <VoucherFormSection title={config.detailsSectionTitle}>
            {config.layout === "dual-simple" ? (
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
                />
                {showTdsSection && (deductTds || readOnly) && paymentGrossDebit > 0 && (
                  <div className="rounded-md border border-border/40 bg-muted/15 px-2.5 py-2 space-y-1 max-w-md mt-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Payment Summary
                    </p>
                    <div className="flex justify-between text-[12px]">
                      <span className="text-muted-foreground">Gross Debit Amount</span>
                      <span className="tabular-nums font-medium">{formatMoney(paymentGrossDebit)}</span>
                    </div>
                    {numericTds > 0 && (
                      <div className="flex justify-between text-[12px]">
                        <span className="text-muted-foreground">TDS Amount</span>
                        <span className="tabular-nums font-medium">{formatMoney(numericTds)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[12px] border-t border-border/40 pt-1">
                      <span className="text-muted-foreground font-medium">Net Bank Credit</span>
                      <span className="tabular-nums font-semibold">{formatMoney(paymentNetBank)}</span>
                    </div>
                  </div>
                )}
                {showTdsSection && !readOnly && (
                  <div className="rounded-md border border-border/40 bg-white p-2 space-y-2 max-w-[420px] mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={deductTds}
                        onCheckedChange={(c) => setDeductTds(Boolean(c))}
                      />
                      <span className={VOUCHER_PREVIEW_TEXT_CLASS}>Deduct TDS</span>
                      {vendor?.tdsApplicable && (
                        <span className="text-[11px] text-muted-foreground">
                          (applicable for this vendor)
                        </span>
                      )}
                    </label>
                    {deductTds && (
                      <VoucherFormField label="TDS Amount" className={VOUCHER_AMOUNT_WIDTH}>
                        <AccountsMoneyInput
                          compact={false}
                          className={cn(VOUCHER_INPUT_CLASS, VOUCHER_MONEY_INPUT_CLASS)}
                          value={numericTds}
                          onChange={(v) => setTdsAmount(String(v))}
                        />
                      </VoucherFormField>
                    )}
                  </div>
                )}
              </>
            ) : (
              <VoucherJournalEntryGrid
                entries={model.entries}
                voucherDate={model.voucherDate}
                coaRecords={coaRecords}
                readOnly={readOnly}
                onEntriesChange={setEntries}
                onQuickAddSuccess={handleQuickAddSuccess}
              />
            )}
          </VoucherFormSection>

          {config.layout === "journal-grid" && readOnly && impactLines.length > 0 && (
            <JournalLedgerImpactPreview
              lines={impactLines}
              totalDebit={totalDebit}
              totalCredit={totalCredit}
              balanced={journalBalanced}
            />
          )}

          {config.layout === "dual-simple" && (
            <VoucherFormSummary totalAmount={summaryAmount} />
          )}
        </div>

        <VoucherNarrationSection
          narration={model.narration}
          readOnly={readOnly}
          onChange={(narration) => patchModel({ narration })}
        />

        {readOnly && resolvedVoucherId != null && VOUCHER_CATEGORY_MAP[voucherType] && (
          <div className="mt-3">
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
      <AccountsToast toast={toast} onDismiss={dismissToast} />
    </AccountsPageShell>
  );
}
