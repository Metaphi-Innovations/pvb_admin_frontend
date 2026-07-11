"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  ExternalLink,
  Paperclip,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  getBankReconAccounts,
  getBankReconAccountById,
  maskAccountNumber,
} from "@/app/(app)/accounts/bank-reconciliation/bank-reconciliation-v2-data";
import {
  emptyManualForm,
  EXPECTED_VOUCHER_TYPE_OPTIONS,
  PARTY_TYPE_OPTIONS,
  TRANSACTION_MODE_OPTIONS,
  type DuplicateCheckResult,
  type ManualTransactionFormState,
} from "@/lib/accounts/bank-recon-manual-types";
import {
  canEditManualTransaction,
  getManualAccountDisplay,
  isStatementLinked,
  recordToForm,
  runDuplicateCheck,
  saveManualTransaction,
  updateManualTransaction,
  validateManualForm,
} from "@/lib/accounts/bank-recon-manual-service";
import { getBankReconTransactionById } from "@/lib/accounts/bank-recon-register";

const FIELD_CLASS =
  "h-9 text-sm rounded-lg border border-border focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:border-brand-400";

function SectionHeading({ label }: { label: string }) {
  return (
    <div className="pb-2 border-b border-border mb-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  );
}

function FieldWrap({
  label,
  required,
  error,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-medium">
        {label}
        {required ? <span className="text-red-500 ml-0.5">*</span> : null}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

function DuplicatePanel({
  result,
  onViewExisting,
  onContinue,
  onCancel,
  onMarkReview,
}: {
  result: DuplicateCheckResult;
  onViewExisting: (id: string) => void;
  onContinue?: () => void;
  onCancel: () => void;
  onMarkReview?: () => void;
}) {
  if (result.type === "none") return null;

  const isExact = result.type === "exact";

  return (
    <div
      className={cn(
        "rounded-xl border p-3 space-y-2",
        isExact ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50",
      )}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className={cn("w-4 h-4 flex-shrink-0 mt-0.5", isExact ? "text-red-500" : "text-amber-500")} />
        <div className="min-w-0 flex-1">
          <p className={cn("text-xs font-semibold", isExact ? "text-red-700" : "text-amber-700")}>
            {isExact ? "Exact Duplicate Detected" : "Possible Duplicate"}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {isExact
              ? "A transaction with the same bank account, reference number, amount and transaction type already exists. Review the existing transaction instead of creating a duplicate."
              : result.reason}
          </p>
          <p className="text-xs font-medium text-foreground mt-2">{result.summary}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 pt-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-[11px] gap-1"
          onClick={() => onViewExisting(result.existingId)}
        >
          <ExternalLink className="w-3 h-3" />
          View Existing
        </Button>
        {!isExact && onContinue ? (
          <Button type="button" size="sm" variant="outline" className="h-7 text-[11px]" onClick={onContinue}>
            Continue as Separate
          </Button>
        ) : null}
        {!isExact && onMarkReview ? (
          <Button type="button" size="sm" variant="outline" className="h-7 text-[11px]" onClick={onMarkReview}>
            Mark for Review
          </Button>
        ) : null}
        <Button type="button" size="sm" variant="ghost" className="h-7 text-[11px]" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export interface BankReconManualTransactionSheetProps {
  open: boolean;
  onClose: () => void;
  bankAccountId?: string;
  editTransactionId?: string | null;
  onSaved?: () => void;
  onViewExisting?: (id: string) => void;
}

export function BankReconManualTransactionSheet({
  open,
  onClose,
  bankAccountId,
  editTransactionId,
  onSaved,
  onViewExisting,
}: BankReconManualTransactionSheetProps) {
  const isEdit = Boolean(editTransactionId);
  const editRecord = editTransactionId ? getBankReconTransactionById(editTransactionId) : undefined;
  const statementLinked = editRecord ? isStatementLinked(editRecord) : false;
  const readOnlyBankFields = statementLinked;

  const [form, setForm] = useState<ManualTransactionFormState>(() =>
    emptyManualForm(bankAccountId ?? ""),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicate, setDuplicate] = useState<DuplicateCheckResult>({ type: "none" });
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [pendingSave, setPendingSave] = useState<"record" | "draft" | "another" | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const accounts = useMemo(() => getBankReconAccounts(), []);

  useEffect(() => {
    if (!open) return;
    if (editRecord) {
      setForm(recordToForm(editRecord));
    } else {
      setForm(emptyManualForm(bankAccountId ?? ""));
    }
    setErrors({});
    setDuplicate({ type: "none" });
    setOverrideReason("");
    setPendingSave(null);
  }, [open, bankAccountId, editRecord, editTransactionId]);

  const set = useCallback(<K extends keyof ManualTransactionFormState>(key: K, value: ManualTransactionFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      const dup = runDuplicateCheck(form, editTransactionId ?? undefined);
      setDuplicate(dup);
    }, 300);
    return () => clearTimeout(t);
  }, [
    open,
    form.bankAccountId,
    form.direction,
    form.amount,
    form.referenceNumber,
    form.utrNumber,
    form.transactionIdRef,
    form.chequeNumber,
    form.bookDate,
    form.transactionDate,
    form.narration,
    editTransactionId,
  ]);

  const accountDisplay = getManualAccountDisplay(form.bankAccountId);
  const selectedAccount = getBankReconAccountById(form.bankAccountId);

  const handleSave = async (mode: "record" | "draft" | "another") => {
    const fieldErrors = validateManualForm(form, mode === "draft");
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    if (mode !== "draft") {
      const dup = runDuplicateCheck(form, editTransactionId ?? undefined);
      if (dup.type === "exact") {
        setDuplicate(dup);
        return;
      }
      if (dup.type === "possible" && !overrideReason.trim()) {
        setDuplicate(dup);
        setPendingSave(mode);
        setOverrideOpen(true);
        return;
      }
    }

    let result;
    if (isEdit && editTransactionId) {
      result = updateManualTransaction(editTransactionId, form, {
        duplicateOverrideReason: overrideReason.trim() || undefined,
      });
    } else {
      result = saveManualTransaction(form, {
        asDraft: mode === "draft",
        duplicateOverrideReason: overrideReason.trim() || undefined,
      });
    }

    if (!result.ok) {
      if (result.duplicate) setDuplicate(result.duplicate);
      setToast(result.error ?? "Save failed");
      return;
    }

    setToast(isEdit ? "Manual transaction updated" : mode === "draft" ? "Draft saved" : "Manual transaction saved");
    onSaved?.();

    if (mode === "another") {
      setForm(emptyManualForm(form.bankAccountId));
      setErrors({});
      setDuplicate({ type: "none" });
      setOverrideReason("");
    } else {
      setTimeout(onClose, 400);
    }
  };

  const confirmOverride = () => {
    if (!overrideReason.trim()) return;
    setOverrideOpen(false);
    if (pendingSave) handleSave(pendingSave);
  };

  const handleAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm((prev) => ({
      ...prev,
      attachments: [
        ...prev.attachments,
        {
          id: `att-${Date.now()}`,
          fileName: file.name,
          fileType: file.type || "application/octet-stream",
          fileSize: file.size,
          category: "Other Supporting Document",
          uploadedBy: "Finance User",
          uploadedOn: new Date().toISOString(),
        },
      ],
    }));
    e.target.value = "";
  };

  const statusLabel = isEdit
    ? editRecord?.manualEntryStatus ?? "Recorded"
    : "New";

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent className="max-w-[720px] w-full">
          <SheetHeader>
            <SheetTitle>{isEdit ? "Edit Manual Transaction" : "Add Manual Transaction"}</SheetTitle>
            <SheetDescription>
              Record a bank transaction before it appears on the statement · Status: {statusLabel}
            </SheetDescription>
          </SheetHeader>

          <SheetBody className="space-y-4 pb-6">
            {statementLinked ? (
              <div className="bg-navy-50 border border-navy-100 rounded-lg px-3 py-2 text-xs text-navy-700">
                This entry is linked with a bank statement. Bank-confirmed fields are read-only.
              </div>
            ) : null}

            <div>
              <SectionHeading label="A. Bank & Transaction Details" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <FieldWrap label="Bank Account" required error={errors.bankAccountId} className="md:col-span-2">
                  <Select
                    value={form.bankAccountId}
                    onValueChange={(v) => set("bankAccountId", v)}
                    disabled={readOnlyBankFields || Boolean(bankAccountId && !isEdit)}
                  >
                    <SelectTrigger className={FIELD_CLASS}>
                      <SelectValue placeholder="Select bank account…" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.bankName} · {a.accountNickname} · {maskAccountNumber(a.accountNumber)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldWrap>
                <FieldWrap label="Bank Name">
                  <Input readOnly value={accountDisplay.bankName} className={cn(FIELD_CLASS, "bg-muted/30")} />
                </FieldWrap>
                <FieldWrap label="Masked Account Number">
                  <Input
                    readOnly
                    value={selectedAccount ? maskAccountNumber(selectedAccount.accountNumber) : accountDisplay.maskedNumber}
                    className={cn(FIELD_CLASS, "bg-muted/30")}
                  />
                </FieldWrap>
                <FieldWrap label="Account Type">
                  <Input readOnly value={accountDisplay.accountType} className={cn(FIELD_CLASS, "bg-muted/30")} />
                </FieldWrap>
                <FieldWrap label="Transaction Direction" required>
                  <Select
                    value={form.direction}
                    onValueChange={(v) => set("direction", v as ManualTransactionFormState["direction"])}
                    disabled={readOnlyBankFields}
                  >
                    <SelectTrigger className={FIELD_CLASS}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Deposit">Deposit</SelectItem>
                      <SelectItem value="Withdrawal">Withdrawal</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldWrap>
                <FieldWrap label="Transaction Mode">
                  <Select
                    value={form.transactionMode}
                    onValueChange={(v) => set("transactionMode", v as ManualTransactionFormState["transactionMode"])}
                    disabled={readOnlyBankFields}
                  >
                    <SelectTrigger className={FIELD_CLASS}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRANSACTION_MODE_OPTIONS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldWrap>
                <FieldWrap label="Amount (₹)" required error={errors.amount}>
                  <Input
                    value={form.amount}
                    onChange={(e) => set("amount", e.target.value)}
                    placeholder="0.00"
                    disabled={readOnlyBankFields}
                    className={FIELD_CLASS}
                  />
                </FieldWrap>
                <FieldWrap label="Currency">
                  <Input readOnly value={form.currency} className={cn(FIELD_CLASS, "bg-muted/30")} />
                </FieldWrap>
                <FieldWrap label="Transaction Status">
                  <Input readOnly value={statusLabel} className={cn(FIELD_CLASS, "bg-muted/30")} />
                </FieldWrap>
              </div>
            </div>

            <div>
              <SectionHeading label="B. Reference Details" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <FieldWrap label="Reference Number">
                  <Input
                    value={form.referenceNumber}
                    onChange={(e) => set("referenceNumber", e.target.value)}
                    disabled={readOnlyBankFields}
                    className={FIELD_CLASS}
                  />
                </FieldWrap>
                <FieldWrap label="UTR Number">
                  <Input
                    value={form.utrNumber}
                    onChange={(e) => set("utrNumber", e.target.value)}
                    disabled={readOnlyBankFields}
                    className={FIELD_CLASS}
                  />
                </FieldWrap>
                <FieldWrap label="Transaction ID">
                  <Input
                    value={form.transactionIdRef}
                    onChange={(e) => set("transactionIdRef", e.target.value)}
                    disabled={readOnlyBankFields}
                    className={FIELD_CLASS}
                  />
                </FieldWrap>
                <FieldWrap label="Cheque Number" className={form.transactionMode === "Cheque" ? "ring-1 ring-brand-200 rounded-lg p-1" : ""}>
                  <Input
                    value={form.chequeNumber}
                    onChange={(e) => set("chequeNumber", e.target.value)}
                    disabled={readOnlyBankFields}
                    className={FIELD_CLASS}
                  />
                </FieldWrap>
                <FieldWrap label="Instrument Number">
                  <Input value={form.instrumentNumber} onChange={(e) => set("instrumentNumber", e.target.value)} disabled={readOnlyBankFields} className={FIELD_CLASS} />
                </FieldWrap>
                <FieldWrap label="Bank Slip Number">
                  <Input value={form.bankSlipNumber} onChange={(e) => set("bankSlipNumber", e.target.value)} disabled={readOnlyBankFields} className={FIELD_CLASS} />
                </FieldWrap>
                <FieldWrap label="External Reference" className="md:col-span-2">
                  <Input value={form.externalReference} onChange={(e) => set("externalReference", e.target.value)} disabled={readOnlyBankFields} className={FIELD_CLASS} />
                </FieldWrap>
                <FieldWrap label="Narration" className="md:col-span-3">
                  <Textarea
                    rows={2}
                    value={form.narration}
                    onChange={(e) => set("narration", e.target.value)}
                    disabled={readOnlyBankFields}
                    className="text-sm rounded-lg border border-border min-h-[60px]"
                  />
                </FieldWrap>
              </div>
              {form.transactionMode === "Cheque" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-3 pt-3 border-t border-border/60">
                  <FieldWrap label="Cheque Date">
                    <Input type="date" value={form.chequeDate} onChange={(e) => set("chequeDate", e.target.value)} disabled={readOnlyBankFields} className={FIELD_CLASS} />
                  </FieldWrap>
                  <FieldWrap label="Deposited Date">
                    <Input type="date" value={form.depositedDate} onChange={(e) => set("depositedDate", e.target.value)} disabled={readOnlyBankFields} className={FIELD_CLASS} />
                  </FieldWrap>
                  <FieldWrap label="Drawer Bank">
                    <Input value={form.drawerBank} onChange={(e) => set("drawerBank", e.target.value)} disabled={readOnlyBankFields} className={FIELD_CLASS} />
                  </FieldWrap>
                  <FieldWrap label="Drawer Branch">
                    <Input value={form.drawerBranch} onChange={(e) => set("drawerBranch", e.target.value)} disabled={readOnlyBankFields} className={FIELD_CLASS} />
                  </FieldWrap>
                </div>
              ) : null}
            </div>

            <div>
              <SectionHeading label="C. Party & Accounting Reference" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <FieldWrap label="Party Type">
                  <Select value={form.partyType} onValueChange={(v) => set("partyType", v as ManualTransactionFormState["partyType"])}>
                    <SelectTrigger className={FIELD_CLASS}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PARTY_TYPE_OPTIONS.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldWrap>
                <FieldWrap label="Party / Ledger" className="md:col-span-2">
                  <Input value={form.partyLedger} onChange={(e) => set("partyLedger", e.target.value)} placeholder="Optional" className={FIELD_CLASS} />
                </FieldWrap>
                <FieldWrap label="Expected Voucher Type">
                  <Select value={form.expectedVoucherType} onValueChange={(v) => set("expectedVoucherType", v as ManualTransactionFormState["expectedVoucherType"])}>
                    <SelectTrigger className={FIELD_CLASS}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EXPECTED_VOUCHER_TYPE_OPTIONS.map((v) => (
                        <SelectItem key={v} value={v}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldWrap>
                <FieldWrap label="Existing Voucher Reference">
                  <Input value={form.existingVoucherRef} onChange={(e) => set("existingVoucherRef", e.target.value)} className={FIELD_CLASS} />
                </FieldWrap>
                <FieldWrap label="Customer / Vendor Reference">
                  <Input value={form.customerVendorRef} onChange={(e) => set("customerVendorRef", e.target.value)} className={FIELD_CLASS} />
                </FieldWrap>
                <FieldWrap label="Invoice Reference">
                  <Input value={form.invoiceReference} onChange={(e) => set("invoiceReference", e.target.value)} className={FIELD_CLASS} />
                </FieldWrap>
                <FieldWrap label="Purpose / Category">
                  <Input value={form.purposeCategory} onChange={(e) => set("purposeCategory", e.target.value)} className={FIELD_CLASS} />
                </FieldWrap>
                <FieldWrap label="Cost Centre">
                  <Input value={form.costCentre} onChange={(e) => set("costCentre", e.target.value)} className={FIELD_CLASS} />
                </FieldWrap>
              </div>
            </div>

            <div>
              <SectionHeading label="D. Dates" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <FieldWrap label="Book Date" required error={errors.bookDate}>
                  <Input type="date" value={form.bookDate} onChange={(e) => set("bookDate", e.target.value)} disabled={readOnlyBankFields} className={FIELD_CLASS} />
                </FieldWrap>
                <FieldWrap label="Transaction Date">
                  <Input type="date" value={form.transactionDate} onChange={(e) => set("transactionDate", e.target.value)} disabled={readOnlyBankFields} className={FIELD_CLASS} />
                </FieldWrap>
                <FieldWrap label="Expected Clearing Date">
                  <Input type="date" value={form.expectedClearingDate} onChange={(e) => set("expectedClearingDate", e.target.value)} disabled={readOnlyBankFields} className={FIELD_CLASS} />
                </FieldWrap>
                <FieldWrap label="Statement Date">
                  <Input readOnly value={editRecord?.statementDate || "—"} className={cn(FIELD_CLASS, "bg-muted/30")} />
                </FieldWrap>
                <FieldWrap label="Value Date">
                  <Input readOnly value={editRecord?.valueDate || "—"} className={cn(FIELD_CLASS, "bg-muted/30")} />
                </FieldWrap>
                <FieldWrap label="Reconciliation Date">
                  <Input readOnly value={editRecord?.reconciliationDate || "—"} className={cn(FIELD_CLASS, "bg-muted/30")} />
                </FieldWrap>
              </div>
            </div>

            <div>
              <SectionHeading label="E. Remarks & Attachments" />
              <div className="grid grid-cols-1 gap-3 mb-3">
                <FieldWrap label="Internal Remarks">
                  <Textarea rows={2} value={form.internalRemarks} onChange={(e) => set("internalRemarks", e.target.value)} className="text-sm rounded-lg border border-border" />
                </FieldWrap>
                <FieldWrap label="Bank Narration">
                  <Textarea rows={2} value={form.bankNarration} onChange={(e) => set("bankNarration", e.target.value)} disabled={readOnlyBankFields} className="text-sm rounded-lg border border-border" />
                </FieldWrap>
                <FieldWrap label="Follow-up Note">
                  <Textarea rows={2} value={form.followUpNote} onChange={(e) => set("followUpNote", e.target.value)} className="text-sm rounded-lg border border-border" />
                </FieldWrap>
              </div>
              <div className="space-y-2">
                <input ref={fileRef} type="file" className="hidden" onChange={handleAttachment} />
                <Button type="button" variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => fileRef.current?.click()}>
                  <Paperclip className="w-3.5 h-3.5" />
                  Add Attachment
                </Button>
                {form.attachments.length > 0 ? (
                  <ul className="space-y-1">
                    {form.attachments.map((a) => (
                      <li key={a.id} className="flex items-center gap-2 text-xs bg-muted/20 rounded-lg px-2.5 py-1.5 border border-border/60">
                        <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="flex-1 truncate font-medium">{a.fileName}</span>
                        <span className="text-[10px] text-muted-foreground">{a.category}</span>
                        <span className="text-[10px] text-muted-foreground">{(a.fileSize / 1024).toFixed(0)} KB</span>
                        {!isEdit ? (
                          <button type="button" onClick={() => setForm((p) => ({ ...p, attachments: p.attachments.filter((x) => x.id !== a.id) }))}>
                            <X className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500" />
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px] text-muted-foreground">No attachments</p>
                )}
              </div>
            </div>

            <div>
              <SectionHeading label="F. Duplicate Check Result" />
              <DuplicatePanel
                result={duplicate}
                onViewExisting={(id) => onViewExisting?.(id)}
                onContinue={() => {
                  setPendingSave("record");
                  setOverrideOpen(true);
                }}
                onMarkReview={() => {
                  setPendingSave("record");
                  setOverrideOpen(true);
                }}
                onCancel={() => setDuplicate({ type: "none" })}
              />
              {duplicate.type === "none" ? (
                <p className="text-[11px] text-muted-foreground px-1">No duplicate detected for current reference and amount.</p>
              ) : null}
            </div>

            {editRecord?.manualTransactionNumber ? (
              <p className="text-[11px] text-muted-foreground">
                Internal ID: <span className="font-mono text-brand-700">{editRecord.manualTransactionNumber}</span>
              </p>
            ) : null}
          </SheetBody>

          <SheetFooter className="gap-2">
            <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
              Cancel
            </Button>
            {!isEdit ? (
              <>
                <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => handleSave("draft")}>
                  Save as Draft
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => handleSave("another")}>
                  Save & Add Another
                </Button>
              </>
            ) : null}
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
              onClick={() => handleSave("record")}
              disabled={isEdit && editRecord && !canEditManualTransaction(editRecord)}
            >
              <Check className="w-3.5 h-3.5" />
              {isEdit ? "Update Manual Transaction" : "Save Manual Transaction"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Continue Despite Possible Duplicate?</DialogTitle>
            <DialogDescription>A reason is required to save this as a separate transaction.</DialogDescription>
          </DialogHeader>
          <Textarea
            rows={3}
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            placeholder="Explain why this is not a duplicate…"
            className="text-sm"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setOverrideOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white" onClick={confirmOverride} disabled={!overrideReason.trim()}>
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {toast ? (
        <div className="fixed bottom-5 right-5 z-[400] flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl bg-emerald-600 text-white text-sm font-medium animate-in slide-in-from-bottom-2">
          {toast}
          <button type="button" onClick={() => setToast(null)}><X className="w-4 h-4" /></button>
        </div>
      ) : null}
    </>
  );
}
