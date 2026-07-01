"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { LedgerImpactPreview } from "@/components/accounts/LedgerImpactPreview";
import { journalEntryImpact } from "@/lib/accounts/ledger-impact-previews";
import { formatMoney, MONEY_INPUT_CLASS, parseMoneyInput } from "@/lib/accounts/money-format";
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
  createVoucher,
  generateVoucherNumber,
  getVoucherById,
  isVoucherBalanced,
  loadVouchers,
  normalizeVoucherLineAmounts,
  updateVoucher,
  validateVoucherEntryForPost,
  voucherAmountDifference,
  VOUCHER_TYPE_LABELS,
  type VoucherLine,
  type VoucherTypeCode,
  type AccountingVoucher,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import { findLedgerById } from "@/lib/accounts/coa-hierarchy";
import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { useCoaRecords } from "@/lib/accounts/use-coa-records";
import {
  resolveVoucherLineScope,
  type VoucherLedgerScope,
} from "@/lib/accounts/voucher-quick-add-ledger";
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
  journal: "Record debit and credit entries in any order. Post when ready.",
  receipt: "Record money received in bank or cash from a customer or income source.",
  payment: "Record money paid from bank or cash to a party or expense ledger.",
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
      <label className="text-xs font-medium text-foreground sm:pt-2.5">
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
}

export function ZohoVoucherEntryForm({
  voucherType,
  cancelHref,
  onDone,
  initialLines,
  readOnly = false,
  status = "draft",
  voucherNumber,
  showFinancialYear = voucherType === "journal",
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
}: ZohoVoucherEntryFormProps) {
  const mounted = useClientMounted();
  const label = VOUCHER_TYPE_LABELS[voucherType];
  const isEdit = voucherId != null;
  const financialYears = useMemo(() => (mounted ? loadFinancialYears() : []), [mounted]);
  const activeFy = useMemo(() => financialYears.find((fy) => fy.status === "active"), [financialYears]);
  const coaRecords = useCoaRecords();

  const [date, setDate] = useState("");
  const [financialYearId, setFinancialYearId] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [narration, setNarration] = useState("");
  const [lines, setLines] = useState<VoucherLine[]>([EMPTY_LINE(), EMPTY_LINE()]);
  const [error, setError] = useState<string | null>(null);
  const [workflowRefreshKey, setWorkflowRefreshKey] = useState(0);
  const hydratedKeyRef = useRef<string | number | null>(null);

  const existingVoucher = useMemo(
    () => (mounted && voucherId != null ? getVoucherById(voucherId) : undefined),
    [voucherId, mounted, workflowRefreshKey],
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

    const formKey = voucherId ?? "new";
    if (hydratedKeyRef.current !== formKey) {
      if (initialLines?.length) {
        setLines(initialLines);
      } else if (existingVoucher?.lines?.length) {
        setLines(existingVoucher.lines);
      } else {
        setLines([EMPTY_LINE(), EMPTY_LINE()]);
      }
      hydratedKeyRef.current = formKey;
    }
  }, [mounted, existingVoucher, initialLines, activeFy, voucherId]);

  useEffect(() => {
    if (controlledLines?.length) {
      setLines(controlledLines);
    }
  }, [controlledLines]);

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

  const setLineDebit = (idx: number, raw: string) => {
    updateLine(idx, { debit: parseMoneyInput(raw), credit: 0 });
  };

  const setLineCredit = (idx: number, raw: string) => {
    updateLine(idx, { credit: parseMoneyInput(raw), debit: 0 });
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
    if (showFinancialYear && !financialYearId) {
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
    const err = validateVoucherEntryForPost({ date, lines: enrichedLines });
    if (err) {
      setError(err);
      return;
    }

    const payload = {
      date,
      financialYearId: financialYearId ? Number(financialYearId) : null,
      financialYearName: selectedFy?.name ?? "",
      referenceNo,
      narration,
      lines: enrichedLines,
      status: "posted" as const,
    };
    const voucher =
      isEdit && voucherId != null
        ? updateVoucher(voucherId, payload)
        : createVoucher(voucherType, payload);
    onPostComplete?.(voucher);
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
    showFinancialYear,
    validateBeforePost,
    voucherId,
    voucherType,
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

  const shellTitle = titleOverride ?? (isEdit ? `Edit ${label}` : `New ${label}`);

  if (!mounted) {
    return (
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb(breadcrumbSection, shellTitle, cancelHref)}
        title={shellTitle}
        description={pageDescription}
        layout="standard"
        className="max-w-none w-full"
      >
        <div className="mx-4 my-4 border border-border rounded-xl bg-muted/10 h-64 animate-pulse" />
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
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleCancel}>
              Back
            </Button>
            {existingVoucher && canEditVoucher(existingVoucher) && onEdit && (
              <Button
                size="sm"
                className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
                onClick={onEdit}
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Button>
            )}
          </>
        ) : (
          <>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={handleCancel}>
              <X className="w-3.5 h-3.5" /> Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1"
              onClick={handlePost}
            >
              <Save className="w-3.5 h-3.5" /> Post Voucher
            </Button>
          </>
        )
      }
      layout="standard"
      className="max-w-none w-full"
    >
      <div className="flex flex-col w-full">
        {error && (
          <div className="mx-4 mt-4 text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <div className="px-4 sm:px-6 py-5 border-b border-border/60">
          <div className="max-w-3xl space-y-3">
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

            <FormRow label="Notes">
              <Textarea
                className="text-sm min-h-[72px] resize-y bg-white rounded-lg max-w-2xl"
                value={narration}
                onChange={(e) => {
                  clearError();
                  setNarration(e.target.value);
                }}
                placeholder="Max. 500 characters"
                maxLength={500}
                disabled={readOnly}
              />
            </FormRow>

            {showFinancialYear && (
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
                  <SelectContent>
                    {financialYears.map((fy) => (
                      <SelectItem key={fy.id} value={String(fy.id)} className="text-xs">
                        {fy.name} {fy.status === "active" ? "(Active)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormRow>
            )}
          </div>

          {extraHeader && <div className="mt-4 max-w-3xl">{extraHeader}</div>}
        </div>

        <div className="px-4 sm:px-6 py-5 pb-8">
          <div className="border border-border/60 rounded-lg bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[720px] border-collapse">
                <thead className="border-b border-border/60">
                  <tr>
                    <th className="w-8 px-2 py-2.5" />
                    <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      Account / Ledger
                    </th>
                    <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      Description
                    </th>
                    <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wide text-muted-foreground w-[120px]">
                      Debit
                    </th>
                    <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wide text-muted-foreground w-[120px]">
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
                      <td className="px-2 py-1.5">
                        {readOnly ? (
                          <span className="text-xs font-medium py-2 block">{line.ledgerName || "—"}</span>
                        ) : (
                          <GroupedLedgerSelect
                            value={line.ledgerId}
                            onChange={(ledger) => selectLedger(idx, ledger.id)}
                            placeholder="Select an account"
                            ledgerFilter={ledgerFilter}
                            quickAddScope={
                              quickAddScopeProp ??
                              resolveVoucherLineScope(voucherType, line)
                            }
                          />
                        )}
                      </td>
                      <td className="px-2 py-1.5 align-top">
                        <Textarea
                          className="text-xs min-h-[52px] resize-y rounded-lg"
                          value={line.remarks}
                          onChange={(e) => updateLine(idx, { remarks: e.target.value })}
                          placeholder="Description"
                          disabled={readOnly}
                          rows={2}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          className={cn("h-9 text-xs", MONEY_INPUT_CLASS)}
                          type="number"
                          min={0}
                          step="0.01"
                          value={line.debit || ""}
                          onChange={(e) => setLineDebit(idx, e.target.value)}
                          disabled={readOnly}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && idx === lines.length - 1 && !readOnly) {
                              e.preventDefault();
                              addLine();
                            }
                          }}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          className={cn("h-9 text-xs", MONEY_INPUT_CLASS)}
                          type="number"
                          min={0}
                          step="0.01"
                          value={line.credit || ""}
                          onChange={(e) => setLineCredit(idx, e.target.value)}
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
                            <Trash2 className="w-3.5 h-3.5" />
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
                  className="h-8 text-xs gap-1 text-brand-600 hover:text-brand-700 hover:bg-brand-50"
                  onClick={addLine}
                  type="button"
                >
                  <Plus className="w-3.5 h-3.5" /> Add New Row
                </Button>
              </div>
            )}

            <div className="flex justify-end border-t border-border/60 bg-muted/10 px-4 py-3">
              <div className="w-full max-w-md space-y-1.5 text-xs">
                <div className="grid grid-cols-3 gap-2 text-[10px] uppercase text-muted-foreground font-semibold border-b border-border/40 pb-1">
                  <span />
                  <span className="text-right">Debit</span>
                  <span className="text-right">Credit</span>
                </div>
                <div className="grid grid-cols-3 gap-2 py-1">
                  <span className="text-muted-foreground">Sub Total</span>
                  <span className="text-right tabular-nums">{formatMoney(totalDebit)}</span>
                  <span className="text-right tabular-nums">{formatMoney(totalCredit)}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 py-1 font-semibold border-t border-border/40 pt-1">
                  <span>Total (₹)</span>
                  <span className="text-right tabular-nums">{formatMoney(totalDebit)}</span>
                  <span className="text-right tabular-nums">{formatMoney(totalCredit)}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 py-1 border-t border-border/40 pt-1">
                  <span className="text-[11px] text-muted-foreground">Difference</span>
                  <span
                    className={cn(
                      "col-span-2 text-right tabular-nums text-[11px]",
                      balanced ? "text-muted-foreground" : "text-amber-700",
                    )}
                  >
                    {formatMoney(difference)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {readOnly && impactLines.length > 0 &&
            (voucherType === "journal" ? (
              <div className="mt-4 mb-2">
                <JournalLedgerImpactPreview
                  lines={impactLines}
                  totalDebit={totalDebit}
                  totalCredit={totalCredit}
                  balanced={balanced}
                />
              </div>
            ) : (
              <div className="mt-4">
                <LedgerImpactPreview lines={impactLines} />
              </div>
            ))}

          {readOnly && voucherId && VOUCHER_CATEGORY_MAP[voucherType] && (
            <div className="mt-4 px-4 sm:px-6">
              <AccountsDocumentWorkflowSection
                category={VOUCHER_CATEGORY_MAP[voucherType]!}
                documentId={voucherId}
                workflow={existingVoucher?.workflow}
                legacyStatus={existingVoucher?.status}
                onUpdated={() => setWorkflowRefreshKey((k) => k + 1)}
              />
            </div>
          )}

        </div>
      </div>
    </AccountsPageShell>
  );
}
