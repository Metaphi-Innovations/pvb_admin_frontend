"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { Textarea } from "@/components/ui/textarea";
import { GripVertical, Pencil, Plus, Save, Settings, Trash2, X } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { GroupedLedgerSelect } from "@/components/accounts/GroupedLedgerSelect";
import { JournalLedgerImpactPreview } from "@/components/accounts/JournalLedgerImpactPreview";
import { journalEntryImpact } from "@/lib/accounts/ledger-impact-previews";
import { formatMoney } from "@/lib/accounts/money-format";
import { applyAutoPartyToLines } from "@/lib/accounts/voucher-ledger-groups";
import {
  ledgerMatchesReceiptCreditScope,
  ledgerMatchesReceiptDebitScope,
} from "@/lib/accounts/voucher-quick-add-ledger";
import { cn } from "@/lib/utils";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import {
  EMPTY_LINE,
  buildReceiptVoucherLinesFromGrid,
  calcLineTotals,
  canEditVoucher,
  compactDraftVoucherLines,
  compactPostedVoucherLines,
  createVoucher,
  generateVoucherNumber,
  getVoucherById,
  isVoucherBalanced,
  loadVouchers,
  normalizeVoucherLineAmounts,
  parseReceiptVoucherGridState,
  updateVoucher,
  validateReceiptVoucherGridForPost,
  validateVoucherDraft,
  validateVoucherForPost,
  voucherAmountDifference,
  VOUCHER_TYPE_LABELS,
  type VoucherLine,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import { findLedgerById } from "@/lib/accounts/coa-hierarchy";
import { executeManualVoucherPost } from "@/lib/accounts/voucher-posting-flow";
import { useCoaRecords } from "@/lib/accounts/use-coa-records";
import {
  VOUCHER_BUTTON_CLASS,
  VOUCHER_ERROR_CLASS,
  VOUCHER_INPUT_CLASS,
  VOUCHER_LABEL_CLASS,
  VOUCHER_MONEY_INPUT_CLASS,
  VOUCHER_TOTAL_AMOUNT_CLASS,
  VOUCHER_TOTAL_LABEL_CLASS,
  resolveVoucherFormId,
  VoucherNotFoundMessage,
  VoucherLedgerCurBalance,
} from "@/components/accounts/voucher-simple-form-ui";
import { useClientMounted } from "@/lib/use-client-mounted";
import { AccountsDocumentWorkflowSection } from "@/components/accounts/AccountsDocumentWorkflowSection";

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

export interface ReceiptZohoVoucherFormProps {
  cancelHref: string;
  onDone: () => void;
  voucherId?: number;
  readOnly?: boolean;
  onEdit?: () => void;
}

export function ReceiptZohoVoucherForm({
  cancelHref,
  onDone,
  voucherId,
  readOnly = false,
  onEdit,
}: ReceiptZohoVoucherFormProps) {
  const mounted = useClientMounted();
  const label = VOUCHER_TYPE_LABELS.receipt;
  const resolvedVoucherId = resolveVoucherFormId(voucherId);
  const isNew = resolvedVoucherId == null;
  const isEdit = !isNew && !readOnly;
  const coaRecords = useCoaRecords();
  const financialYears = useMemo(() => (mounted ? loadFinancialYears() : []), [mounted]);
  const activeFy = useMemo(() => financialYears.find((fy) => fy.status === "active"), [financialYears]);

  const [date, setDate] = useState("");
  const [financialYearId, setFinancialYearId] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [narration, setNarration] = useState("");
  const [receiptLedgerId, setReceiptLedgerId] = useState<number | null>(null);
  const [receiptLedgerName, setReceiptLedgerName] = useState("");
  const [creditLines, setCreditLines] = useState<VoucherLine[]>([EMPTY_LINE()]);
  const [error, setError] = useState<string | null>(null);
  const [workflowRefreshKey, setWorkflowRefreshKey] = useState(0);
  const hydratedKeyRef = useRef<string | number | null>(null);

  const existingVoucher = useMemo(
    () => (mounted && !isNew && resolvedVoucherId != null ? getVoucherById(resolvedVoucherId) : undefined),
    [resolvedVoucherId, mounted, isNew, workflowRefreshKey],
  );

  const receiptLedger = useMemo(
    () => (receiptLedgerId ? findLedgerById(receiptLedgerId, coaRecords) ?? null : null),
    [receiptLedgerId, coaRecords],
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
      if (existingVoucher?.lines?.length) {
        const parsed = parseReceiptVoucherGridState(existingVoucher.lines, coaRecords);
        setReceiptLedgerId(parsed.receiptLedgerId);
        setReceiptLedgerName(parsed.receiptLedgerName);
        setCreditLines(parsed.creditLines);
      } else {
        setReceiptLedgerId(null);
        setReceiptLedgerName("");
        setCreditLines([EMPTY_LINE()]);
      }
      hydratedKeyRef.current = formKey;
    }
  }, [mounted, existingVoucher, activeFy, resolvedVoucherId, coaRecords]);

  const previewNumber = useMemo(
    () =>
      !mounted
        ? ""
        : existingVoucher?.voucherNumber ?? generateVoucherNumber("receipt", loadVouchers()),
    [mounted, existingVoucher?.voucherNumber],
  );

  const selectedFy = financialYears.find((fy) => fy.id === Number(financialYearId));

  const resolvedFinancialYearId = useMemo(() => {
    if (financialYearId) return Number(financialYearId);
    if (existingVoucher?.financialYearId) return existingVoucher.financialYearId;
    if (activeFy) return activeFy.id;
    return null;
  }, [financialYearId, existingVoucher?.financialYearId, activeFy]);

  const resolvedFinancialYearName = useMemo(() => {
    if (selectedFy?.name) return selectedFy.name;
    if (existingVoucher?.financialYearName) return existingVoucher.financialYearName;
    return activeFy?.name ?? "";
  }, [selectedFy, existingVoucher?.financialYearName, activeFy]);

  const assembledLines = useMemo(() => {
    if (!receiptLedgerId) return creditLines;
    return buildReceiptVoucherLinesFromGrid(
      receiptLedgerId,
      receiptLedgerName,
      creditLines,
    );
  }, [receiptLedgerId, receiptLedgerName, creditLines]);

  const { totalDebit, totalCredit } = calcLineTotals(assembledLines);
  const difference = voucherAmountDifference(totalDebit, totalCredit);
  const balanced = isVoucherBalanced(totalDebit, totalCredit);

  const receiptDebitFilter = useCallback(
    (ledger: ChartOfAccount) => ledgerMatchesReceiptDebitScope(ledger, coaRecords),
    [coaRecords],
  );

  const creditLedgerFilter = useCallback(
    (ledger: ChartOfAccount) => {
      if (!ledgerMatchesReceiptCreditScope(ledger, coaRecords)) return false;
      if (receiptLedgerId && ledger.id === receiptLedgerId) return false;
      return true;
    },
    [coaRecords, receiptLedgerId],
  );

  const impactLines = useMemo(
    () =>
      journalEntryImpact(
        assembledLines
          .filter((l) => l.ledgerId && ((Number(l.debit) || 0) > 0 || (Number(l.credit) || 0) > 0))
          .map((l) => ({
            ledgerName: l.ledgerName,
            debit: Number(l.debit) || 0,
            credit: Number(l.credit) || 0,
            narration: l.remarks,
          })),
      ),
    [assembledLines],
  );

  const clearError = () => setError(null);

  const selectReceiptAccount = (ledger: ChartOfAccount | null) => {
    clearError();
    setReceiptLedgerId(ledger?.id ?? null);
    setReceiptLedgerName(ledger?.accountName ?? "");
    if (ledger) {
      setCreditLines((prev) =>
        prev.map((l) => (l.ledgerId === ledger.id ? { ...EMPTY_LINE(), id: l.id } : l)),
      );
    }
  };

  const updateCreditLine = (idx: number, patch: Partial<VoucherLine>) => {
    clearError();
    setCreditLines((prev) =>
      prev.map((l, i) => (i === idx ? normalizeVoucherLineAmounts({ ...l, ...patch }) : l)),
    );
  };

  const selectCreditLedger = (idx: number, ledger: ChartOfAccount) => {
    updateCreditLine(idx, {
      ledgerId: ledger.id,
      ledgerName: ledger.accountName,
      debit: 0,
    });
  };

  const addCreditLine = () => {
    clearError();
    setCreditLines((prev) => [...prev, EMPTY_LINE()]);
  };

  const removeCreditLine = (idx: number) => {
    clearError();
    setCreditLines((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  };

  const buildPayloadLines = (forPost: boolean) => {
    const raw = buildReceiptVoucherLinesFromGrid(
      receiptLedgerId ?? 0,
      receiptLedgerName,
      creditLines,
    );
    const normalized = forPost ? compactPostedVoucherLines(raw) : compactDraftVoucherLines(raw);
    return applyAutoPartyToLines(normalized, coaRecords);
  };

  const handleSaveDraft = () => {
    clearError();
    const draftErr = validateVoucherDraft({ date });
    if (draftErr) {
      setError(draftErr);
      return;
    }
    const lines = buildPayloadLines(false);
    const payload = {
      date,
      financialYearId: resolvedFinancialYearId,
      financialYearName: resolvedFinancialYearName,
      referenceNo,
      narration,
      lines,
      status: "draft" as const,
      entryMode: "double" as const,
    };
    if (isEdit && resolvedVoucherId != null) {
      updateVoucher(resolvedVoucherId, payload);
    } else {
      createVoucher("receipt", payload);
    }
    onDone();
  };

  const handlePost = () => {
    clearError();
    if (!date) {
      setError("Date is required.");
      return;
    }
    if (!resolvedFinancialYearId) {
      setError("No active financial year found.");
      return;
    }

    const gridErr = validateReceiptVoucherGridForPost(receiptLedgerId, creditLines, coaRecords);
    if (gridErr) {
      setError(gridErr);
      return;
    }

    const lines = buildPayloadLines(true);
    const postErr = validateVoucherForPost({
      date,
      narration,
      lines,
      financialYearId: resolvedFinancialYearId,
    });
    if (postErr) {
      setError(postErr);
      return;
    }

    const result = executeManualVoucherPost({
      voucherType: "receipt",
      voucherId: isEdit ? resolvedVoucherId : null,
      payload: {
        date,
        financialYearId: resolvedFinancialYearId,
        financialYearName: resolvedFinancialYearName,
        referenceNo,
        narration,
        lines,
        status: "draft",
        entryMode: "double",
      },
    });

    if (!result.success) {
      setError(result.error ?? "Failed to post voucher.");
      return;
    }
    onDone();
  };

  const shellTitle =
    readOnly && !isNew ? `View ${label}` : isEdit ? `Edit ${label}` : `New ${label}`;

  if (mounted && !isNew && !existingVoucher) {
    return (
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Transactions", shellTitle, cancelHref)}
        title={shellTitle}
        description="Record money received — bank/cash is debited and the selected ledger is credited."
        layout="standard"
        className="max-w-none w-full"
        actions={
          <Button variant="outline" size="sm" className={VOUCHER_BUTTON_CLASS} onClick={onDone}>
            Back
          </Button>
        }
      >
        <VoucherNotFoundMessage message="Receipt voucher not found." />
      </AccountsPageShell>
    );
  }

  if (!mounted) {
    return (
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Transactions", shellTitle, cancelHref)}
        title={shellTitle}
        description="Record money received — bank/cash is debited and the selected ledger is credited."
        layout="standard"
        className="max-w-none w-full"
      >
        <div className="mx-4 my-4 border border-border rounded-xl bg-muted/10 h-64 animate-pulse" />
      </AccountsPageShell>
    );
  }

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Transactions", shellTitle, cancelHref)}
      title={shellTitle}
      description="Record money received — bank/cash is debited and the selected ledger is credited."
      layout="standard"
      className="max-w-none w-full"
      actions={
        readOnly ? (
          <>
            <Button variant="outline" size="sm" className={VOUCHER_BUTTON_CLASS} onClick={onDone}>
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
            <Button variant="outline" size="sm" className={cn(VOUCHER_BUTTON_CLASS, "gap-1")} onClick={onDone}>
              <X className="w-4 h-4" /> Cancel
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={cn(VOUCHER_BUTTON_CLASS, "gap-1")}
              onClick={handleSaveDraft}
            >
              <Save className="w-4 h-4" /> Save Draft
            </Button>
            <Button
              size="sm"
              className={cn(VOUCHER_BUTTON_CLASS, "bg-brand-600 hover:bg-brand-700 text-white gap-1")}
              onClick={handlePost}
              disabled={!receiptLedgerId || totalCredit <= 0}
            >
              <Save className="w-4 h-4" /> Post Voucher
            </Button>
          </>
        )
      }
    >
      <div className="flex flex-col w-full">
        {error && <div className={cn(VOUCHER_ERROR_CLASS, "mx-4 mt-4")}>{error}</div>}

        <div className="px-4 sm:px-6 py-5 border-b border-border/60">
          <div className="w-full space-y-3">
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

            <FormRow label="Receipt#" required>
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
          </div>
        </div>

        <div className="px-4 sm:px-6 py-4 border-b border-border/40 bg-muted/10">
          <div className="max-w-2xl space-y-1">
            <label className={VOUCHER_LABEL_CLASS}>
              Receipt Account (Dr)<span className="text-red-500 ml-0.5">*</span>
            </label>
            {readOnly ? (
              <p className="text-[13px] py-2">{receiptLedgerName || "—"}</p>
            ) : (
              <GroupedLedgerSelect
                value={receiptLedgerId}
                fallbackLabel={receiptLedgerName}
                onChange={selectReceiptAccount}
                placeholder="Select bank, cash, OD or CC account…"
                ledgerFilter={receiptDebitFilter}
                quickAddScope="receipt_debit"
                listMaxHeight={300}
                className="text-[13px]"
              />
            )}
            <VoucherLedgerCurBalance ledger={receiptLedger} asOfDate={date} />
            {receiptLedger && totalCredit > 0 && (
              <p className="text-[11px] text-muted-foreground pt-0.5">
                <span className="font-semibold text-brand-700">Dr</span> {receiptLedger.accountName}{" "}
                <span className="tabular-nums">{formatMoney(totalCredit)}</span>
              </p>
            )}
          </div>
        </div>

        <div className="px-4 sm:px-6 py-5 pb-8 w-full">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Ledger entries (Cr)
          </p>
          <div className="border border-border/60 rounded-lg bg-white shadow-sm overflow-hidden w-full">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-xs">
                <thead className="border-b border-border/60">
                  <tr>
                    <th className="w-8 px-2 py-2.5" />
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                      Ledger (Cr)
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
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground min-w-[140px]">
                      Narration
                    </th>
                    <th className="w-10 px-2 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {creditLines.map((line, idx) => (
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
                              onChange={(ledger) => selectCreditLedger(idx, ledger)}
                              placeholder="Select customer, income, capital…"
                              ledgerFilter={creditLedgerFilter}
                              quickAddScope="receipt_credit"
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
                          onChange={(e) => updateCreditLine(idx, { remarks: e.target.value })}
                          placeholder="Description"
                          disabled={readOnly}
                          rows={2}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <AccountsMoneyInput
                          compact={false}
                          className={cn(VOUCHER_INPUT_CLASS, VOUCHER_MONEY_INPUT_CLASS, "bg-muted/20")}
                          value={0}
                          onChange={() => undefined}
                          disabled
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <AccountsMoneyInput
                          compact={false}
                          className={cn(VOUCHER_INPUT_CLASS, VOUCHER_MONEY_INPUT_CLASS)}
                          value={line.credit || 0}
                          onChange={(v) => updateCreditLine(idx, { credit: v, debit: 0 })}
                          disabled={readOnly}
                        />
                      </td>
                      <td className="px-2 py-1.5 align-top">
                        {idx === 0 ? (
                          readOnly ? (
                            <span className="text-[13px] py-2 block">{narration || "—"}</span>
                          ) : (
                            <Input
                              className="h-8 text-xs rounded-lg"
                              value={narration}
                              onChange={(e) => {
                                clearError();
                                setNarration(e.target.value);
                              }}
                              placeholder="Optional narration…"
                              maxLength={500}
                            />
                          )
                        ) : (
                          <span className="text-muted-foreground/40 block py-2 text-center">—</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        {!readOnly && creditLines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeCreditLine(idx)}
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
                  onClick={addCreditLine}
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
          <div className="mt-2 mb-2 px-4 sm:px-6">
            <JournalLedgerImpactPreview
              lines={impactLines}
              totalDebit={totalDebit}
              totalCredit={totalCredit}
              balanced={balanced}
            />
          </div>
        )}

        {readOnly && resolvedVoucherId && (
          <div className="mt-4 px-4 sm:px-6 pb-6">
            <AccountsDocumentWorkflowSection
              category="receipt_voucher"
              documentId={resolvedVoucherId}
              workflow={existingVoucher?.workflow}
              legacyStatus={existingVoucher?.status}
              onUpdated={() => setWorkflowRefreshKey((k) => k + 1)}
            />
          </div>
        )}
      </div>
    </AccountsPageShell>
  );
}
