"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GripVertical, Pencil, Plus, Save, Settings, Trash2, X } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { GroupedLedgerSelect } from "@/components/accounts/GroupedLedgerSelect";
import { JournalLedgerImpactPreview } from "@/components/accounts/JournalLedgerImpactPreview";
import { journalEntryImpact } from "@/lib/accounts/ledger-impact-previews";
import { formatMoney } from "@/lib/accounts/money-format";
import { applyAutoPartyToLine, applyAutoPartyToLines } from "@/lib/accounts/voucher-ledger-groups";
import { cn } from "@/lib/utils";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import type { RecordStatus } from "@/app/(app)/accounts/data";
import {
  EMPTY_LINE,
  calcLineTotals,
  canEditVoucher,
  compactPostedVoucherLines,
  generateVoucherNumber,
  getVoucherById,
  isVoucherBalanced,
  loadVouchers,
  normalizeVoucherLineAmounts,
  normalizeVoucherLines,
  validateVoucherEntryForPost,
  validateVoucherForPost,
  voucherAmountDifference,
  VOUCHER_TYPE_LABELS,
  type VoucherLine,
  type VoucherTypeCode,
  type AccountingVoucher,
  type VoucherEntryMode,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import { findLedgerById } from "@/lib/accounts/coa-hierarchy";
import { executeManualVoucherPost } from "@/lib/accounts/voucher-posting-flow";
import { isTdsCoaLedger } from "@/lib/accounts/tds-coa-sync";
import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { useCoaRecords } from "@/lib/accounts/use-coa-records";
import {
  resolveVoucherLineScope,
  type VoucherLedgerScope,
} from "@/lib/accounts/voucher-quick-add-ledger";
import {
  VOUCHER_BUTTON_CLASS,
  VOUCHER_ERROR_CLASS,
  VOUCHER_FIELD_DATE,
  VOUCHER_FIELD_MODE,
  VOUCHER_FIELD_NARRATION,
  VOUCHER_FIELD_NUMBER,
  VOUCHER_FIELD_REFERENCE,
  VOUCHER_FORM_CARD,
  VOUCHER_FORM_OUTER,
  VOUCHER_HEADER_GRID,
  VOUCHER_INPUT_CLASS,
  VOUCHER_LABEL_CLASS,
  VOUCHER_MONEY_INPUT_CLASS,
  VOUCHER_TOTAL_AMOUNT_CLASS,
  VOUCHER_TOTAL_LABEL_CLASS,
  resolveVoucherFormId,
  VoucherNotFoundMessage,
  VoucherSelectContent,
  VoucherFormField,
  VoucherFormSection,
  VoucherTransactionPanel,
  VoucherLedgerCurBalance,
} from "@/components/accounts/voucher-simple-form-ui";
import { useClientMounted } from "@/lib/use-client-mounted";
import { AccountsDocumentWorkflowSection } from "@/components/accounts/AccountsDocumentWorkflowSection";
import type { AccountsVoucherCategory } from "@/lib/accounts/accounts-maker-checker";

const VOUCHER_CATEGORY_MAP: Partial<Record<VoucherTypeCode, AccountsVoucherCategory>> = {
  journal: "journal_entry",
  receipt: "receipt_voucher",
  payment: "payment_voucher",
};

const VOUCHER_NUMBER_LABELS: Partial<Record<VoucherTypeCode, string>> = {
  journal: "Journal#",
  receipt: "Receipt#",
  payment: "Payment#",
  contra: "Contra#",
};

const VOUCHER_DESCRIPTIONS: Partial<Record<VoucherTypeCode, string>> = {
  journal: "Record multiple debit and credit lines. Total debit must equal total credit.",
  receipt: "Record money received — bank/cash is debited and the selected ledger is credited.",
  payment: "Record money paid out — the selected ledger is debited and bank/cash is credited.",
  contra: "Transfer funds between cash and bank accounts.",
};

function FormRow({
  label,
  required,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 sm:grid-cols-[minmax(140px,200px)_1fr] gap-1.5 sm:gap-4 sm:items-start",
        className,
      )}
    >
      <label className={cn(VOUCHER_LABEL_CLASS, "sm:pt-2.5")}>
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export interface ZohoVoucherEntryFormProps {
  voucherType: VoucherTypeCode;
  cancelHref: string;
  onDone: () => void;
  initialLines?: VoucherLine[];
  readOnly?: boolean;
  status?: RecordStatus;
  voucherNumber?: string;
  showFinancialYear?: boolean;
  extraHeader?: React.ReactNode;
  breadcrumbSection?: string;
  ledgerFilter?: (ledger: ChartOfAccount) => boolean;
  /** Fixed quick-add scope (e.g. contra bank/cash only) */
  quickAddScope?: VoucherLedgerScope;
  controlledLines?: VoucherLine[];
  validateBeforePost?: () => string | null;
  onPostComplete?: (voucher: AccountingVoucher) => void;
  /** When set, form loads and updates an existing voucher */
  voucherId?: number;
  titleOverride?: string;
  onEdit?: () => void;
  /** Require balanced double-entry (min 2 lines) before post */
  strictPostValidation?: boolean;
  entryMode?: VoucherEntryMode;
  entryModeControl?: React.ReactNode;
  onDirtyChange?: (dirty: boolean) => void;
}

export function ZohoVoucherEntryForm({
  voucherType,
  cancelHref,
  onDone,
  initialLines,
  readOnly = false,
  status = "draft",
  voucherNumber,
  showFinancialYear = false,
  extraHeader,
  breadcrumbSection = "Transactions",
  ledgerFilter,
  quickAddScope: quickAddScopeProp,
  controlledLines,
  validateBeforePost,
  onPostComplete,
  voucherId,
  titleOverride,
  onEdit,
  strictPostValidation = false,
  entryMode = "double",
  entryModeControl,
  onDirtyChange,
}: ZohoVoucherEntryFormProps) {
  const mounted = useClientMounted();
  const label = VOUCHER_TYPE_LABELS[voucherType];
  const resolvedVoucherId = resolveVoucherFormId(voucherId);
  const isNew = resolvedVoucherId == null;
  const isEdit = !isNew && !readOnly;
  const isJournal = voucherType === "journal";
  const showFyField = showFinancialYear && (readOnly || isEdit);
  const financialYears = useMemo(() => (mounted ? loadFinancialYears() : []), [mounted]);
  const activeFy = useMemo(() => financialYears.find((fy) => fy.status === "active"), [financialYears]);
  const coaRecords = useCoaRecords();

  const effectiveLedgerFilter = useMemo(() => {
    return (ledger: ChartOfAccount) => {
      if (isTdsCoaLedger(ledger)) return false;
      return ledgerFilter ? ledgerFilter(ledger) : true;
    };
  }, [ledgerFilter]);

  const [date, setDate] = useState("");
  const [financialYearId, setFinancialYearId] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [narration, setNarration] = useState("");
  const [lines, setLines] = useState<VoucherLine[]>([EMPTY_LINE(), EMPTY_LINE()]);
  const [error, setError] = useState<string | null>(null);
  const [workflowRefreshKey, setWorkflowRefreshKey] = useState(0);
  const hydratedKeyRef = useRef<string | number | null>(null);

  const existingVoucher = useMemo(
    () => (mounted && !isNew && resolvedVoucherId != null ? getVoucherById(resolvedVoucherId) : undefined),
    [resolvedVoucherId, mounted, isNew, workflowRefreshKey],
  );

  useEffect(() => {
    if (!mounted) return;

    setDate(existingVoucher?.date ?? new Date().toISOString().slice(0, 10));
    setFinancialYearId(
      existingVoucher?.financialYearId
        ? String(existingVoucher.financialYearId)
        : activeFy
          ? String(activeFy.id)
          : "",
    );
    setReferenceNo(existingVoucher?.referenceNo ?? "");
    setNarration(existingVoucher?.narration ?? "");

    const formKey = resolvedVoucherId ?? "new";
    if (hydratedKeyRef.current !== formKey) {
      if (initialLines?.length) {
        setLines(normalizeVoucherLines(initialLines, coaRecords));
      } else if (existingVoucher?.lines?.length) {
        setLines(normalizeVoucherLines(existingVoucher.lines, coaRecords));
      } else {
        setLines([EMPTY_LINE(), EMPTY_LINE()]);
      }
      hydratedKeyRef.current = formKey;
    }
  }, [mounted, existingVoucher, initialLines, activeFy, resolvedVoucherId, coaRecords]);

  useEffect(() => {
    if (!mounted || coaRecords.length === 0) return;
    setLines((prev) => {
      const next = normalizeVoucherLines(prev, coaRecords);
      const unchanged = next.every(
        (line, i) =>
          line.ledgerId === prev[i]?.ledgerId && line.ledgerName === prev[i]?.ledgerName,
      );
      return unchanged ? prev : next;
    });
  }, [mounted, coaRecords]);

  useEffect(() => {
    if (controlledLines?.length) {
      setLines(controlledLines);
    }
  }, [controlledLines]);

  const requiresStrictPost = strictPostValidation || voucherType === "journal";

  useEffect(() => {
    if (!onDirtyChange || readOnly) return;
    const dirty =
      Boolean(referenceNo.trim()) ||
      Boolean(narration.trim()) ||
      lines.some(
        (l) =>
          l.ledgerId != null ||
          Boolean(l.ledgerName?.trim()) ||
          (Number(l.debit) || 0) > 0 ||
          (Number(l.credit) || 0) > 0 ||
          Boolean(l.remarks?.trim()),
      );
    onDirtyChange(dirty);
  }, [referenceNo, narration, lines, onDirtyChange, readOnly]);

  const previewNumber = useMemo(
    () =>
      !mounted
        ? ""
        : voucherNumber ??
          existingVoucher?.voucherNumber ??
          generateVoucherNumber(voucherType, loadVouchers()),
    [mounted, voucherNumber, existingVoucher?.voucherNumber, voucherType],
  );
  const numberLabel = VOUCHER_NUMBER_LABELS[voucherType] ?? "Voucher#";
  const pageDescription =
    VOUCHER_DESCRIPTIONS[voucherType] ?? "Add ledger rows and post when ready.";

  const { totalDebit, totalCredit } = calcLineTotals(lines);
  const difference = voucherAmountDifference(totalDebit, totalCredit);
  const balanced = isVoucherBalanced(totalDebit, totalCredit);
  const selectedFy = financialYears.find((fy) => fy.id === Number(financialYearId));

  const impactLines = useMemo(
    () =>
      journalEntryImpact(
        lines
          .filter((l) => l.ledgerId && ((Number(l.debit) || 0) > 0 || (Number(l.credit) || 0) > 0))
          .map((l) => ({
            ledgerName: l.ledgerName,
            debit: Number(l.debit) || 0,
            credit: Number(l.credit) || 0,
            narration: l.remarks,
          })),
      ),
    [lines],
  );

  const clearError = useCallback(() => setError(null), []);

  const updateLine = (idx: number, patch: Partial<VoucherLine>) => {
    setError(null);
    setLines((prev) =>
      prev.map((l, i) => {
        if (i !== idx) return l;
        const next = normalizeVoucherLineAmounts({ ...l, ...patch });
        return applyAutoPartyToLine(next, coaRecords);
      }),
    );
  };

  const selectLedger = (idx: number, ledgerId: number) => {
    const ledger = findLedgerById(ledgerId, coaRecords);
    if (!ledger) return;
    updateLine(idx, {
      ledgerId: ledger.id,
      ledgerName: ledger.accountName,
      contactId: null,
      contactName: "",
    });
  };

  const addLine = useCallback(() => {
    setError(null);
    setLines((prev) => [...prev, EMPTY_LINE()]);
  }, []);

  const removeLine = (idx: number) => {
    setError(null);
    setLines((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  };

  const handlePost = useCallback(() => {
    setError(null);
    if (!date) {
      setError("Voucher date is required.");
      return;
    }
    if (!previewNumber) {
      setError("Voucher number is required.");
      return;
    }
    if (showFyField && !financialYearId) {
      setError("Financial year is required.");
      return;
    }
    const preErr = validateBeforePost?.();
    if (preErr) {
      setError(preErr);
      return;
    }

    const postedLines = compactPostedVoucherLines(lines);
    const enrichedLines = applyAutoPartyToLines(postedLines, coaRecords);
    const err = requiresStrictPost
      ? validateVoucherForPost({
          date,
          narration,
          lines: enrichedLines,
          ...(showFyField ? { financialYearId: Number(financialYearId) } : {}),
        })
      : validateVoucherEntryForPost({ date, lines: enrichedLines });
    if (err) {
      setError(err);
      return;
    }

    const result = executeManualVoucherPost({
      voucherType,
      voucherId: isEdit ? resolvedVoucherId : null,
      payload: {
        date,
        financialYearId: financialYearId ? Number(financialYearId) : null,
        financialYearName: selectedFy?.name ?? "",
        referenceNo,
        narration,
        lines: enrichedLines,
        status: "draft",
        entryMode: entryMode ?? "double",
      },
    });

    if (!result.success) {
      setError(result.error ?? "Failed to post voucher.");
      return;
    }

    const voucher = getVoucherById(result.voucherId ?? resolvedVoucherId ?? 0);
    if (voucher) onPostComplete?.(voucher);
    onDone();
  }, [
    coaRecords,
    date,
    financialYearId,
    isEdit,
    lines,
    narration,
    onDone,
    onPostComplete,
    previewNumber,
    referenceNo,
    selectedFy?.name,
    showFyField,
    validateBeforePost,
    resolvedVoucherId,
    voucherType,
    requiresStrictPost,
    entryMode,
  ]);

  const handleCancel = () => {
    onDone();
  };

  useEffect(() => {
    if (readOnly) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        handlePost();
      }
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        addLine();
      }
      if (e.key === "Escape") {
        handleCancel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, narration, lines, financialYearId, referenceNo, addLine, readOnly, handlePost]);

  const shellTitle =
    titleOverride ??
    (readOnly && !isNew ? `View ${label}` : isEdit ? `Edit ${label}` : `New ${label}`);

  if (mounted && !isNew && !existingVoucher) {
    return (
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb(breadcrumbSection, shellTitle, cancelHref)}
        title={shellTitle}
        description={pageDescription}
        layout={isJournal ? "form" : "standard"}
        className={isJournal ? undefined : "max-w-none w-full"}
        actions={
          <Button variant="outline" size="sm" className={VOUCHER_BUTTON_CLASS} onClick={handleCancel}>
            Back
          </Button>
        }
      >
        <VoucherNotFoundMessage message={`${label} voucher not found.`} />
      </AccountsPageShell>
    );
  }

  if (!mounted) {
    return (
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb(breadcrumbSection, shellTitle, cancelHref)}
        title={shellTitle}
        description={pageDescription}
        layout={isJournal ? "form" : "standard"}
        className={isJournal ? undefined : "max-w-none w-full"}
      >
        <div
          className={cn(
            isJournal ? VOUCHER_FORM_OUTER : "mx-4 my-4",
            "border border-border rounded-xl bg-muted/10 h-64 animate-pulse",
          )}
        />
      </AccountsPageShell>
    );
  }

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb(
        breadcrumbSection,
        shellTitle,
        cancelHref,
      )}
      title={shellTitle}
      description={pageDescription}
      actions={
        readOnly ? (
          <>
            <Button variant="outline" size="sm" className={VOUCHER_BUTTON_CLASS} onClick={handleCancel}>
              Back
            </Button>
            {existingVoucher && canEditVoucher(existingVoucher) && onEdit && (
              <Button
                size="sm"
                className={cn(VOUCHER_BUTTON_CLASS, "gap-1.5 bg-brand-600 hover:bg-brand-700 text-white")}
                onClick={onEdit}
              >
                <Pencil className="w-4 h-4" /> Edit
              </Button>
            )}
          </>
        ) : (
          <>
            <Button variant="outline" size="sm" className={cn(VOUCHER_BUTTON_CLASS, "gap-1")} onClick={handleCancel}>
              <X className="w-4 h-4" /> Cancel
            </Button>
            <Button
              size="sm"
              className={cn(VOUCHER_BUTTON_CLASS, "bg-brand-600 hover:bg-brand-700 text-white gap-1")}
              onClick={handlePost}
            >
              <Save className="w-4 h-4" /> Post Voucher
            </Button>
          </>
        )
      }
      layout={isJournal ? "form" : "standard"}
      className={isJournal ? undefined : "max-w-none w-full"}
    >
      <div className={cn(isJournal ? VOUCHER_FORM_OUTER : "flex flex-col w-full")}>
        {error && <div className={VOUCHER_ERROR_CLASS}>{error}</div>}

        <div className={cn(isJournal ? VOUCHER_FORM_CARD : "")}>
          {isJournal ? (
            <>
              <VoucherFormSection title="Voucher Details">
                <div className={VOUCHER_HEADER_GRID}>
                  {entryModeControl && <div className="sm:col-span-2 lg:col-span-4">{entryModeControl}</div>}
                  <VoucherFormField label="Date" required className={VOUCHER_FIELD_DATE}>
                    <Input
                      className={VOUCHER_INPUT_CLASS}
                      type="date"
                      value={date}
                      onChange={(e) => {
                        clearError();
                        setDate(e.target.value);
                      }}
                      disabled={readOnly}
                    />
                  </VoucherFormField>
                  <VoucherFormField label={numberLabel} className={VOUCHER_FIELD_NUMBER}>
                    <Input
                      className={cn(VOUCHER_INPUT_CLASS, "font-mono bg-muted/30")}
                      value={previewNumber}
                      readOnly
                      disabled
                    />
                  </VoucherFormField>
                  <VoucherFormField label="Reference No." className={VOUCHER_FIELD_REFERENCE}>
                    <Input
                      className={VOUCHER_INPUT_CLASS}
                      value={referenceNo}
                      onChange={(e) => {
                        clearError();
                        setReferenceNo(e.target.value);
                      }}
                      placeholder="Cheque / UTR / ref…"
                      disabled={readOnly}
                    />
                  </VoucherFormField>
                  {showFyField && (
                    <VoucherFormField label="Financial Year" required className={VOUCHER_FIELD_MODE}>
                      <Select
                        value={financialYearId}
                        onValueChange={(v) => {
                          clearError();
                          setFinancialYearId(v);
                        }}
                        disabled={readOnly}
                      >
                        <SelectTrigger className={VOUCHER_INPUT_CLASS}>
                          <SelectValue placeholder="Select FY" />
                        </SelectTrigger>
                        <VoucherSelectContent>
                          {financialYears.map((fy) => (
                            <SelectItem key={fy.id} value={String(fy.id)} className="text-[13px]">
                              {fy.name} {fy.status === "active" ? "(Active)" : ""}
                            </SelectItem>
                          ))}
                        </VoucherSelectContent>
                      </Select>
                    </VoucherFormField>
                  )}
                </div>
                {extraHeader && <div className="mt-3">{extraHeader}</div>}
              </VoucherFormSection>

              <VoucherFormSection title="Journal Entries">
                <div className="w-full rounded-lg border border-border/50 bg-muted/10 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] border-collapse text-[13px]">
                      <thead className="border-b border-border/60 bg-white/60">
                        <tr>
                          <th className="w-8 px-2 py-2" />
                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                            Account / Ledger
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                            Remarks
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground w-[120px]">
                            Debit
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground w-[120px]">
                            Credit
                          </th>
                          <th className="w-10 px-2 py-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {lines.map((line, idx) => (
                          <tr key={line.id} className="border-b border-border/40 hover:bg-muted/5 bg-white">
                            <td className="px-2 py-1.5 text-muted-foreground/50">
                              <GripVertical className="w-4 h-4" />
                            </td>
                            <td className="px-2 py-1.5 align-top">
                              {readOnly ? (
                                <span className="text-[13px] py-2 block">{line.ledgerName || "—"}</span>
                              ) : (
                                <div className="min-w-0">
                                  <GroupedLedgerSelect
                                    value={line.ledgerId}
                                    fallbackLabel={line.ledgerName}
                                    onChange={(ledger) => selectLedger(idx, ledger.id)}
                                    placeholder="Select an account"
                                    ledgerFilter={effectiveLedgerFilter}
                                    quickAddScope={
                                      quickAddScopeProp ??
                                      resolveVoucherLineScope(voucherType, line)
                                    }
                                    listMaxHeight={300}
                                    className={cn(VOUCHER_INPUT_CLASS, "text-[13px]")}
                                  />
                                  <VoucherLedgerCurBalance
                                    ledger={
                                      line.ledgerId
                                        ? findLedgerById(line.ledgerId, coaRecords) ?? null
                                        : null
                                    }
                                    asOfDate={date}
                                  />
                                </div>
                              )}
                            </td>
                            <td className="px-2 py-1.5 align-top">
                              <Textarea
                                className={cn(VOUCHER_INPUT_CLASS, "min-h-[44px] h-auto py-2 resize-y")}
                                value={line.remarks}
                                onChange={(e) => updateLine(idx, { remarks: e.target.value })}
                                placeholder="Description"
                                disabled={readOnly}
                                rows={2}
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <AccountsMoneyInput
                                compact={false}
                                className={cn(VOUCHER_INPUT_CLASS, VOUCHER_MONEY_INPUT_CLASS)}
                                value={line.debit || 0}
                                onChange={(v) => updateLine(idx, { debit: v, credit: 0 })}
                                disabled={readOnly}
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <AccountsMoneyInput
                                compact={false}
                                className={cn(VOUCHER_INPUT_CLASS, VOUCHER_MONEY_INPUT_CLASS)}
                                value={line.credit || 0}
                                onChange={(v) => updateLine(idx, { credit: v, debit: 0 })}
                                disabled={readOnly}
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              {!readOnly && lines.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeLine(idx)}
                                  className="w-8 h-8 flex items-center justify-center rounded hover:bg-red-50 text-muted-foreground hover:text-red-600"
                                  aria-label="Delete row"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {!readOnly && (
                    <div className="px-3 py-2 border-t border-border/40 bg-white">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(VOUCHER_BUTTON_CLASS, "gap-1 text-brand-600 hover:text-brand-700 hover:bg-brand-50")}
                        onClick={addLine}
                        type="button"
                      >
                        <Plus className="w-4 h-4" /> Add New Row
                      </Button>
                    </div>
                  )}

                  <div className="flex justify-end border-t border-border/60 bg-white px-4 py-2.5">
                    <div className="w-full sm:w-[360px] space-y-1 text-[13px]">
                      <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground font-medium border-b border-border/40 pb-1">
                        <span />
                        <span className="text-right">Debit</span>
                        <span className="text-right">Credit</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 py-0.5">
                        <span className="text-muted-foreground">Sub Total</span>
                        <span className="text-right tabular-nums">{formatMoney(totalDebit)}</span>
                        <span className="text-right tabular-nums">{formatMoney(totalCredit)}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 py-0.5 border-t border-border/40 pt-1">
                        <span className={VOUCHER_TOTAL_LABEL_CLASS}>Total (₹)</span>
                        <span className={cn("text-right tabular-nums", VOUCHER_TOTAL_AMOUNT_CLASS)}>
                          {formatMoney(totalDebit)}
                        </span>
                        <span className={cn("text-right tabular-nums", VOUCHER_TOTAL_AMOUNT_CLASS)}>
                          {formatMoney(totalCredit)}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 py-0.5 border-t border-border/40 pt-1">
                        <span className="text-xs text-muted-foreground">Difference</span>
                        <span
                          className={cn(
                            "col-span-2 text-right tabular-nums text-sm",
                            balanced ? "text-muted-foreground" : "text-amber-700",
                          )}
                        >
                          {formatMoney(difference)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </VoucherFormSection>

              <VoucherFormSection title="Narration">
                <VoucherTransactionPanel>
                  <VoucherFormField label="Narration" className={VOUCHER_FIELD_NARRATION}>
                    <Textarea
                      className={cn(VOUCHER_INPUT_CLASS, "min-h-[56px] max-h-24 h-auto py-2 resize-y")}
                      rows={2}
                      value={narration}
                      onChange={(e) => {
                        clearError();
                        setNarration(e.target.value);
                      }}
                      placeholder="Optional narration…"
                      maxLength={500}
                      disabled={readOnly}
                    />
                  </VoucherFormField>
                </VoucherTransactionPanel>
              </VoucherFormSection>

              {readOnly && impactLines.length > 0 && (
                <JournalLedgerImpactPreview
                  lines={impactLines}
                  totalDebit={totalDebit}
                  totalCredit={totalCredit}
                  balanced={balanced}
                />
              )}

              {readOnly && resolvedVoucherId && VOUCHER_CATEGORY_MAP[voucherType] && (
                <AccountsDocumentWorkflowSection
                  category={VOUCHER_CATEGORY_MAP[voucherType]!}
                  documentId={resolvedVoucherId!}
                  workflow={existingVoucher?.workflow}
                  legacyStatus={existingVoucher?.status}
                  onUpdated={() => setWorkflowRefreshKey((k) => k + 1)}
                />
              )}
            </>
          ) : (
            <>
            <div className="px-4 sm:px-6 py-5 border-b border-border/60">
              <div className="w-full space-y-3">
                {entryModeControl && <div>{entryModeControl}</div>}

                <FormRow label="Date" required>
                  <Input
                    className="h-9 text-sm rounded-lg bg-white max-w-md"
                    type="date"
                    value={date}
                    onChange={(e) => {
                      clearError();
                      setDate(e.target.value);
                    }}
                    disabled={readOnly}
                  />
                </FormRow>

                <FormRow label={numberLabel} required>
                  <div className="relative max-w-md">
                    <Input
                      className="h-9 text-sm font-mono bg-muted/30 pr-9 rounded-lg"
                      value={previewNumber}
                      readOnly
                      disabled
                    />
                    <Settings className="w-4 h-4 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </FormRow>

                <FormRow label="Reference#">
                  <Input
                    className="h-9 text-sm bg-white max-w-md rounded-lg"
                    value={referenceNo}
                    onChange={(e) => {
                      clearError();
                      setReferenceNo(e.target.value);
                    }}
                    placeholder="Cheque / UTR / receipt ref…"
                    disabled={readOnly}
                  />
                </FormRow>

                {showFyField && (
                  <FormRow label="Financial Year" required>
                    <Select
                      value={financialYearId}
                      onValueChange={(v) => {
                        clearError();
                        setFinancialYearId(v);
                      }}
                      disabled={readOnly}
                    >
                      <SelectTrigger className="h-9 text-sm bg-white max-w-md rounded-lg">
                        <SelectValue placeholder="Select FY" />
                      </SelectTrigger>
                      <VoucherSelectContent>
                        {financialYears.map((fy) => (
                          <SelectItem key={fy.id} value={String(fy.id)} className="text-[13px]">
                            {fy.name} {fy.status === "active" ? "(Active)" : ""}
                          </SelectItem>
                        ))}
                      </VoucherSelectContent>
                    </Select>
                  </FormRow>
                )}
              </div>
              {extraHeader && <div className="mt-4 w-full">{extraHeader}</div>}
            </div>

            <div className="px-4 sm:px-6 py-5 pb-8 w-full">
              <div className="border border-border/60 rounded-lg bg-white shadow-sm overflow-hidden w-full">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] border-collapse text-xs">
                    <thead className="border-b border-border/60">
                      <tr>
                        <th className="w-8 px-2 py-2.5" />
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                          Account / Ledger
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                          Remarks
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground w-[120px]">
                          Debit
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground w-[120px]">
                          Credit
                        </th>
                        <th className="w-10 px-2 py-2.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line, idx) => (
                        <tr key={line.id} className="border-b border-border/40 hover:bg-muted/5">
                          <td className="px-2 py-1.5 text-muted-foreground/50">
                            <GripVertical className="w-4 h-4" />
                          </td>
                          <td className="px-2 py-1.5 align-top">
                            {readOnly ? (
                              <span className="text-[13px] py-2 block">{line.ledgerName || "—"}</span>
                            ) : (
                              <div className="min-w-0">
                                <GroupedLedgerSelect
                                  value={line.ledgerId}
                                  fallbackLabel={line.ledgerName}
                                  onChange={(ledger) => selectLedger(idx, ledger.id)}
                                  placeholder="Select an account"
                                  ledgerFilter={effectiveLedgerFilter}
                                  quickAddScope={
                                    quickAddScopeProp ??
                                    resolveVoucherLineScope(voucherType, line)
                                  }
                                  listMaxHeight={300}
                                  className="text-[13px]"
                                />
                                <VoucherLedgerCurBalance
                                  ledger={
                                    line.ledgerId
                                      ? findLedgerById(line.ledgerId, coaRecords) ?? null
                                      : null
                                  }
                                  asOfDate={date}
                                />
                              </div>
                            )}
                          </td>
                          <td className="px-2 py-1.5 align-top">
                            <Textarea
                              className="text-[13px] min-h-[44px] resize-y rounded-lg"
                              value={line.remarks}
                              onChange={(e) => updateLine(idx, { remarks: e.target.value })}
                              placeholder="Description"
                              disabled={readOnly}
                              rows={2}
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <AccountsMoneyInput
                              compact={false}
                              className={cn(VOUCHER_INPUT_CLASS, VOUCHER_MONEY_INPUT_CLASS)}
                              value={line.debit || 0}
                              onChange={(v) => updateLine(idx, { debit: v, credit: 0 })}
                              disabled={readOnly}
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <AccountsMoneyInput
                              compact={false}
                              className={cn(VOUCHER_INPUT_CLASS, VOUCHER_MONEY_INPUT_CLASS)}
                              value={line.credit || 0}
                              onChange={(v) => updateLine(idx, { credit: v, debit: 0 })}
                              disabled={readOnly}
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            {!readOnly && lines.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeLine(idx)}
                                className="w-8 h-8 flex items-center justify-center rounded hover:bg-red-50 text-muted-foreground hover:text-red-600"
                                aria-label="Delete row"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {!readOnly && (
                  <div className="px-3 py-2 border-t border-border/40">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(VOUCHER_BUTTON_CLASS, "gap-1 text-brand-600 hover:text-brand-700 hover:bg-brand-50")}
                      onClick={addLine}
                      type="button"
                    >
                      <Plus className="w-4 h-4" /> Add New Row
                    </Button>
                  </div>
                )}

                <div className="flex justify-end border-t border-border/60 bg-muted/10 px-4 py-2.5">
                  <div className="w-full sm:w-[360px] space-y-1 text-sm">
                    <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground font-medium border-b border-border/40 pb-1">
                      <span />
                      <span className="text-right">Debit</span>
                      <span className="text-right">Credit</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-0.5">
                      <span className="text-muted-foreground">Sub Total</span>
                      <span className="text-right tabular-nums">{formatMoney(totalDebit)}</span>
                      <span className="text-right tabular-nums">{formatMoney(totalCredit)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-0.5 border-t border-border/40 pt-1">
                      <span className={VOUCHER_TOTAL_LABEL_CLASS}>Total (₹)</span>
                      <span className={cn("text-right tabular-nums", VOUCHER_TOTAL_AMOUNT_CLASS)}>
                        {formatMoney(totalDebit)}
                      </span>
                      <span className={cn("text-right tabular-nums", VOUCHER_TOTAL_AMOUNT_CLASS)}>
                        {formatMoney(totalCredit)}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-0.5 border-t border-border/40 pt-1">
                      <span className="text-xs text-muted-foreground">Difference</span>
                      <span
                        className={cn(
                          "col-span-2 text-right tabular-nums text-sm",
                          balanced ? "text-muted-foreground" : "text-amber-700",
                        )}
                      >
                        {formatMoney(difference)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {readOnly && impactLines.length > 0 && (
              <div className="mt-4 mb-2 px-4 sm:px-6">
                <JournalLedgerImpactPreview
                  lines={impactLines}
                  totalDebit={totalDebit}
                  totalCredit={totalCredit}
                  balanced={balanced}
                />
              </div>
            )}

            {readOnly && resolvedVoucherId && VOUCHER_CATEGORY_MAP[voucherType] && (
              <div className="mt-4 px-4 sm:px-6">
                <AccountsDocumentWorkflowSection
                  category={VOUCHER_CATEGORY_MAP[voucherType]!}
                  documentId={resolvedVoucherId!}
                  workflow={existingVoucher?.workflow}
                  legacyStatus={existingVoucher?.status}
                  onUpdated={() => setWorkflowRefreshKey((k) => k + 1)}
                />
              </div>
            )}
            </>
          )}
        </div>
      </div>
    </AccountsPageShell>
  );
}
