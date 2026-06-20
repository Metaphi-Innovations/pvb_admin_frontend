"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GripVertical, Plus, Save, Trash2, X } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { GroupedLedgerSelect } from "@/components/accounts/GroupedLedgerSelect";
import { JournalLedgerImpactPreview } from "@/components/accounts/JournalLedgerImpactPreview";
import { LedgerImpactPreview } from "@/components/accounts/LedgerImpactPreview";
import { journalEntryImpact } from "@/lib/accounts/ledger-impact-previews";
import { formatMoney, MONEY_INPUT_CLASS } from "@/lib/accounts/money-format";
import { resolveLedgerContactType } from "@/lib/accounts/voucher-ledger-groups";
import { cn } from "@/lib/utils";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { StatusBadge } from "@/app/(app)/accounts/components/AccountsUI";
import { getCustomersForInvoice } from "@/app/(app)/accounts/invoices/invoices-data";
import { getVendorsForDebitNote } from "@/app/(app)/accounts/debit-notes/debit-notes-data";
import { loadEmployees } from "@/app/(app)/user-management/employee/employee-data";
import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import type { RecordStatus } from "@/app/(app)/accounts/data";
import {
  EMPTY_LINE,
  calcLineTotals,
  createVoucher,
  generateVoucherNumber,
  loadVouchers,
  validateVoucherDraft,
  validateVoucherForPost,
  VOUCHER_TYPE_LABELS,
  type VoucherLine,
  type VoucherTypeCode,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import { findLedgerById } from "@/lib/accounts/coa-hierarchy";
import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import { VoucherContactMasterHint } from "@/components/accounts/master-fetch/VoucherContactMasterHint";

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
}: ZohoVoucherEntryFormProps) {
  const label = VOUCHER_TYPE_LABELS[voucherType];
  const financialYears = useMemo(() => loadFinancialYears(), []);
  const activeFy = useMemo(() => financialYears.find((fy) => fy.status === "active"), [financialYears]);
  const customers = useMemo(() => getCustomersForInvoice(), []);
  const vendors = useMemo(() => getVendorsForDebitNote(), []);
  const employees = useMemo(
    () => loadEmployees().filter((e) => e.status === "active"),
    [],
  );
  const coaRecords = useMemo(() => loadChartOfAccounts(), []);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [financialYearId, setFinancialYearId] = useState<string>(activeFy ? String(activeFy.id) : "");
  const [referenceNo, setReferenceNo] = useState("");
  const [narration, setNarration] = useState("");
  const [lines, setLines] = useState<VoucherLine[]>(
    initialLines ?? [EMPTY_LINE(), EMPTY_LINE()],
  );
  const [error, setError] = useState<string | null>(null);

  const previewNumber = useMemo(
    () => voucherNumber ?? generateVoucherNumber(voucherType, loadVouchers()),
    [voucherNumber, voucherType],
  );

  const { totalDebit, totalCredit } = calcLineTotals(lines);
  const difference = Math.abs(totalDebit - totalCredit);
  const balanced = difference < 0.01 && totalDebit > 0;
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

  const updateLine = (idx: number, patch: Partial<VoucherLine>) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
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
    setLines((prev) => [...prev, EMPTY_LINE()]);
  }, []);

  const removeLine = (idx: number) => {
    setLines((prev) => (prev.length > 2 ? prev.filter((_, i) => i !== idx) : prev));
  };

  const buildPayload = (postStatus: "draft" | "posted") => ({
    date,
    financialYearId: financialYearId ? Number(financialYearId) : null,
    financialYearName: selectedFy?.name ?? "",
    referenceNo,
    narration,
    lines,
    status: postStatus,
  });

  const handleSaveDraft = () => {
    const err = validateVoucherDraft({ date });
    if (err) {
      setError(err);
      return;
    }
    createVoucher(voucherType, buildPayload("draft"));
    onDone();
  };

  const handlePost = () => {
    if (showFinancialYear && !financialYearId) {
      setError("Financial year is required.");
      return;
    }
    const err = validateVoucherForPost({ date, narration, lines });
    if (err) {
      setError(err);
      return;
    }
    createVoucher(voucherType, buildPayload("posted"));
    onDone();
  };

  const handleCancel = () => {
    onDone();
  };

  useEffect(() => {
    if (readOnly) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "Enter" && balanced) {
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
  }, [balanced, date, narration, lines, financialYearId, referenceNo, addLine, readOnly]);

  const contactTypeForLine = (line: VoucherLine) => {
    if (!line.ledgerId) return null;
    const ledger = findLedgerById(line.ledgerId, coaRecords);
    return ledger ? resolveLedgerContactType(ledger, coaRecords) : null;
  };

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb(breadcrumbSection, `New ${label}`, cancelHref)}
      title={`New ${label}`}
      description="Full-width journal entry. Add ledger rows, ensure debit equals credit before posting."
      actions={
        readOnly ? (
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleCancel}>
            Back
          </Button>
        ) : (
          <>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={handleCancel}>
              <X className="w-3.5 h-3.5" /> Cancel
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleSaveDraft}>
              Save Draft
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1"
              onClick={handlePost}
              disabled={!balanced}
            >
              <Save className="w-3.5 h-3.5" /> Post Voucher
            </Button>
          </>
        )
      }
      layout="standard"
      className="h-full min-h-0 max-w-none"
    >
      <div className="flex flex-col flex-1 min-h-0">
        {error && (
          <div className="mx-4 mt-4 text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <div className="px-4 py-4 border-b border-border/60 bg-muted/5">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Date</Label>
              <Input
                className="h-9 text-xs bg-white"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={readOnly}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Voucher Number</Label>
              <Input className="h-9 text-xs font-mono bg-muted/30" value={previewNumber} readOnly disabled />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Reference Number</Label>
              <Input
                className="h-9 text-xs bg-white"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                disabled={readOnly}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Currency</Label>
              <Input className="h-9 text-xs bg-muted/30" value="INR - Indian Rupee" readOnly disabled />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Status</Label>
              <div className="h-9 flex items-center">
                <StatusBadge status={status} />
              </div>
            </div>
            {showFinancialYear && (
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Financial Year</Label>
                <Select value={financialYearId} onValueChange={setFinancialYearId} disabled={readOnly}>
                  <SelectTrigger className="h-9 text-xs bg-white">
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
              </div>
            )}
          </div>
          {extraHeader && <div className="mt-3">{extraHeader}</div>}
          <div className="mt-3 space-y-1">
            <Label className="text-[11px] text-muted-foreground">Narration / Notes</Label>
            <Textarea
              className="text-xs min-h-[52px] resize-none bg-white"
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              placeholder="Voucher narration…"
              disabled={readOnly}
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Entry Lines</h2>
            {!readOnly && (
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addLine} type="button">
                <Plus className="w-3 h-3" /> Add New Row
              </Button>
            )}
          </div>

          <div className="border border-border/60 rounded-lg overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[960px]">
                <thead className="bg-muted/20 border-b border-border/60">
                  <tr>
                    <th className="w-8 px-2 py-2.5" />
                    <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase text-muted-foreground w-[28%]">
                      Account / Ledger
                    </th>
                    <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase text-muted-foreground w-[22%]">
                      Description
                    </th>
                    <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase text-muted-foreground w-[18%]">
                      Contact (INR)
                    </th>
                    <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase text-muted-foreground w-[12%]">
                      Debit
                    </th>
                    <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase text-muted-foreground w-[12%]">
                      Credit
                    </th>
                    <th className="w-10 px-2 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, idx) => {
                    const contactType = contactTypeForLine(line);
                    return (
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
                              ledgerFilter={ledgerFilter}
                            />
                          )}
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            className="h-9 text-xs"
                            value={line.remarks}
                            onChange={(e) => updateLine(idx, { remarks: e.target.value })}
                            placeholder="Description"
                            disabled={readOnly}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          {contactType === "customer" ? (
                            <Select
                              value={line.contactId ? String(line.contactId) : ""}
                              onValueChange={(v) => {
                                const c = customers.find((x) => x.id === Number(v));
                                updateLine(idx, {
                                  contactId: Number(v),
                                  contactName: c?.customerName ?? "",
                                });
                              }}
                              disabled={readOnly}
                            >
                              <SelectTrigger className="h-9 text-xs">
                                <SelectValue placeholder="Select customer *" />
                              </SelectTrigger>
                              <SelectContent className="max-h-[220px]">
                                {[...customers]
                                  .sort((a, b) => a.customerName.localeCompare(b.customerName))
                                  .map((c) => (
                                    <SelectItem key={c.id} value={String(c.id)} className="text-xs">
                                      {c.customerName}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          ) : contactType === "vendor" ? (
                            <Select
                              value={line.contactId ? String(line.contactId) : ""}
                              onValueChange={(v) => {
                                const vnd = vendors.find((x) => x.id === Number(v));
                                updateLine(idx, {
                                  contactId: Number(v),
                                  contactName: vnd?.vendorName ?? "",
                                });
                              }}
                              disabled={readOnly}
                            >
                              <SelectTrigger className="h-9 text-xs">
                                <SelectValue placeholder="Select vendor *" />
                              </SelectTrigger>
                              <SelectContent className="max-h-[220px]">
                                {[...vendors]
                                  .sort((a, b) => a.vendorName.localeCompare(b.vendorName))
                                  .map((v) => (
                                    <SelectItem key={v.id} value={String(v.id)} className="text-xs">
                                      {v.vendorName}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          ) : contactType === "employee" ? (
                            <Select
                              value={line.contactId ? String(line.contactId) : ""}
                              onValueChange={(v) => {
                                const emp = employees.find((x) => x.id === Number(v));
                                updateLine(idx, {
                                  contactId: Number(v),
                                  contactName: emp?.fullName ?? "",
                                });
                              }}
                              disabled={readOnly}
                            >
                              <SelectTrigger className="h-9 text-xs">
                                <SelectValue placeholder="Select employee *" />
                              </SelectTrigger>
                              <SelectContent className="max-h-[220px]">
                                {[...employees]
                                  .sort((a, b) => a.fullName.localeCompare(b.fullName))
                                  .map((e) => (
                                    <SelectItem key={e.id} value={String(e.id)} className="text-xs">
                                      {e.fullName}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          ) : readOnly && line.contactName ? (
                            <span className="text-xs py-2 block">{line.contactName}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground/40 py-2 block select-none">—</span>
                          )}
                          <VoucherContactMasterHint
                            contactType={contactType}
                            contactId={line.contactId}
                            customers={customers}
                            vendors={vendors}
                            employees={employees}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            className={cn("h-9 text-xs", MONEY_INPUT_CLASS)}
                            type="number"
                            min={0}
                            step="0.01"
                            value={line.debit || ""}
                            onChange={(e) =>
                              updateLine(idx, { debit: Number(e.target.value) || 0, credit: 0 })
                            }
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
                            onChange={(e) =>
                              updateLine(idx, { credit: Number(e.target.value) || 0, debit: 0 })
                            }
                            disabled={readOnly}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          {!readOnly && (
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
                    );
                  })}
                </tbody>
              </table>
            </div>

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
                  <span className="font-medium">Difference</span>
                  <span
                    className={cn(
                      "text-right tabular-nums font-semibold col-span-2",
                      !balanced && difference > 0 ? "text-red-600" : "text-foreground",
                    )}
                  >
                    {!balanced && difference > 0
                      ? `Difference = ${formatMoney(difference)}`
                      : formatMoney(0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {impactLines.length > 0 &&
            (voucherType === "journal" ? (
              <div className="mt-4">
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

          {!readOnly && !balanced && totalDebit + totalCredit > 0 && (
            <p className="text-[11px] text-red-600 mt-2">
              Debit total must equal Credit total before posting. Save as Draft is allowed.
            </p>
          )}
        </div>
      </div>
    </AccountsPageShell>
  );
}
