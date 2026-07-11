"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, X } from "lucide-react";
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
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { GroupedLedgerSelect } from "@/components/accounts/GroupedLedgerSelect";
import { VOUCHER_LEDGER_SELECT_COMPACT } from "@/components/accounts/voucher-simple-form-ui";
import { cn } from "@/lib/utils";
import {
  getBankReconAccounts,
  maskAccountNumber,
} from "@/app/(app)/accounts/bank-reconciliation/bank-reconciliation-v2-data";
import { listOutstandingInvoicesForPartyLedger } from "../bank-reconciliation-data";
import {
  emptyManualForm,
  directionToManualType,
  MANUAL_AGAINST_OPTIONS,
  manualTypeToDirection,
  type ManualTransactionFormState,
  type ManualTransactionType,
} from "@/lib/accounts/bank-recon-manual-types";
import {
  canEditManualTransaction,
  isStatementLinked,
  recordToForm,
  saveManualTransaction,
  sumInvoiceAllocations,
  updateManualTransaction,
  validateManualForm,
} from "@/lib/accounts/bank-recon-manual-service";
import { getBankReconTransactionById } from "@/lib/accounts/bank-recon-register";
import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { resolveLedgerType } from "@/lib/accounts/ledger-detail-utils";
import { useCoaRecords } from "@/lib/accounts/use-coa-records";
import { ManualInvoiceAllocationTable } from "./ManualInvoiceAllocationTable";

const FIELD_CLASS =
  "h-9 text-sm rounded-lg border border-border focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:border-brand-400";

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

function inferPartyType(ledgerId: number, coaRecords: ChartOfAccount[]) {
  const ledger = coaRecords.find((r) => r.id === ledgerId);
  if (!ledger) return "Other Ledger" as const;
  const type = resolveLedgerType(ledger, coaRecords);
  if (type === "Customer") return "Customer" as const;
  if (type === "Vendor") return "Vendor" as const;
  if (type === "Bank") return "Bank" as const;
  if (type === "Expense") return "Expense Ledger" as const;
  if (type === "Income" || type === "Sales") return "Income Ledger" as const;
  return "Other Ledger" as const;
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
}: BankReconManualTransactionSheetProps) {
  const isEdit = Boolean(editTransactionId);
  const editRecord = editTransactionId ? getBankReconTransactionById(editTransactionId) : undefined;
  const statementLinked = editRecord ? isStatementLinked(editRecord) : false;
  const readOnlyCoreFields = statementLinked;

  const coaRecords = useCoaRecords();
  const accounts = useMemo(() => getBankReconAccounts(), []);

  const [form, setForm] = useState<ManualTransactionFormState>(() =>
    emptyManualForm(bankAccountId ?? ""),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  const transactionType: ManualTransactionType = directionToManualType(form.direction);
  const transactionAmount = Number(form.amount.replace(/,/g, "").trim()) || 0;

  const outstandingInvoices = useMemo(() => {
    if (!form.partyLedgerId || form.againstType !== "Invoice") return [];
    return listOutstandingInvoicesForPartyLedger(
      form.partyLedgerId,
      form.partyLedger,
      form.direction,
    );
  }, [form.partyLedgerId, form.partyLedger, form.direction, form.againstType]);

  useEffect(() => {
    if (!open) return;
    if (editRecord) {
      const next = recordToForm(editRecord);
      setForm(next);
      const preselected = new Set(
        Object.entries(next.invoiceAllocations)
          .filter(([, v]) => Number(v) > 0)
          .map(([k]) => k),
      );
      setSelectedInvoiceIds(preselected);
    } else {
      setForm(emptyManualForm(bankAccountId ?? ""));
      setSelectedInvoiceIds(new Set());
    }
    setErrors({});
  }, [open, bankAccountId, editRecord, editTransactionId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const set = useCallback(<K extends keyof ManualTransactionFormState>(key: K, value: ManualTransactionFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleTransactionTypeChange = (type: ManualTransactionType) => {
    setForm((prev) => ({
      ...prev,
      direction: manualTypeToDirection(type),
      invoiceAllocations: {},
    }));
    setSelectedInvoiceIds(new Set());
  };

  const handlePartyLedgerChange = (ledger: ChartOfAccount) => {
    setForm((prev) => ({
      ...prev,
      partyLedgerId: ledger.id,
      partyLedger: ledger.accountName,
      partyType: inferPartyType(ledger.id, coaRecords),
      invoiceAllocations: {},
    }));
    setSelectedInvoiceIds(new Set());
  };

  const handleAgainstChange = (against: ManualTransactionFormState["againstType"]) => {
    setForm((prev) => ({
      ...prev,
      againstType: against,
      invoiceAllocations: {},
    }));
    setSelectedInvoiceIds(new Set());
  };

  const handleAllocationChange = (invoiceId: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      invoiceAllocations: { ...prev.invoiceAllocations, [invoiceId]: value },
    }));
    if (Number(value) > 0) {
      setSelectedInvoiceIds((prev) => new Set(prev).add(invoiceId));
    }
  };

  const handleToggleInvoice = (invoiceId: string, checked: boolean, balance: number) => {
    setSelectedInvoiceIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(invoiceId);
      else next.delete(invoiceId);
      return next;
    });

    setForm((prev) => {
      const nextAlloc = { ...prev.invoiceAllocations };
      if (checked) {
        const cap = Math.min(balance, transactionAmount || balance);
        nextAlloc[invoiceId] = cap > 0 ? String(cap) : "";
      } else {
        delete nextAlloc[invoiceId];
      }
      return { ...prev, invoiceAllocations: nextAlloc };
    });
  };

  const combinedReference = form.referenceNumber || form.utrNumber || form.chequeNumber;

  const handleSave = async (mode: "record" | "draft" | "another") => {
    const normalizedForm: ManualTransactionFormState = {
      ...form,
      bookDate: form.transactionDate || form.bookDate,
      referenceNumber: combinedReference.trim(),
      utrNumber: combinedReference.trim(),
      expectedVoucherType: transactionType === "Receipt" ? "Receipt Voucher" : "Payment Voucher",
    };

    const fieldErrors = validateManualForm(
      normalizedForm,
      mode === "draft",
      outstandingInvoices,
    );
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    let result;
    if (isEdit && editTransactionId) {
      result = updateManualTransaction(
        editTransactionId,
        normalizedForm,
        {},
        outstandingInvoices,
      );
    } else {
      result = saveManualTransaction(
        normalizedForm,
        { asDraft: mode === "draft" },
        outstandingInvoices,
      );
    }

    if (!result.ok) {
      setToast(result.error ?? "Save failed");
      return;
    }

    setToast(
      isEdit
        ? "Manual transaction updated"
        : mode === "draft"
          ? "Draft saved"
          : "Manual transaction saved",
    );
    onSaved?.();

    if (mode === "another") {
      setForm(emptyManualForm(normalizedForm.bankAccountId));
      setSelectedInvoiceIds(new Set());
      setErrors({});
    } else {
      setTimeout(onClose, 400);
    }
  };

  const statusLabel = isEdit ? editRecord?.manualEntryStatus ?? "Recorded" : "New";
  const allocatedTotal = sumInvoiceAllocations(form.invoiceAllocations);

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent className="max-w-[520px] w-full">
          <SheetHeader>
            <SheetTitle>{isEdit ? "Edit Manual Transaction" : "Add Manual Transaction"}</SheetTitle>
            <SheetDescription>
              Record a bank transaction · {statusLabel}
            </SheetDescription>
          </SheetHeader>

          <SheetBody className="space-y-3 pb-4">
            {statementLinked ? (
              <div className="bg-navy-50 border border-navy-100 rounded-lg px-3 py-2 text-xs text-navy-700">
                Linked to bank statement — core fields are read-only.
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <FieldWrap label="Transaction Type" required>
                <Select
                  value={transactionType}
                  onValueChange={(v) => handleTransactionTypeChange(v as ManualTransactionType)}
                  disabled={readOnlyCoreFields}
                >
                  <SelectTrigger className={FIELD_CLASS}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Receipt">Receipt</SelectItem>
                    <SelectItem value="Payment">Payment</SelectItem>
                  </SelectContent>
                </Select>
              </FieldWrap>

              <FieldWrap label="Bank Account" required error={errors.bankAccountId}>
                <Select
                  value={form.bankAccountId}
                  onValueChange={(v) => set("bankAccountId", v)}
                  disabled={readOnlyCoreFields || Boolean(bankAccountId && !isEdit)}
                >
                  <SelectTrigger className={FIELD_CLASS}>
                    <SelectValue placeholder="Select bank account…" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.bankName} · {maskAccountNumber(a.accountNumber)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldWrap>
            </div>

            <FieldWrap label="Party / Ledger" required error={errors.partyLedgerId}>
              <GroupedLedgerSelect
                value={form.partyLedgerId}
                fallbackLabel={form.partyLedger || undefined}
                onChange={handlePartyLedgerChange}
                placeholder="Search ledger…"
                disabled={readOnlyCoreFields}
                {...VOUCHER_LEDGER_SELECT_COMPACT}
              />
            </FieldWrap>

            <FieldWrap label="Against" required>
              <Select
                value={form.againstType}
                onValueChange={(v) => handleAgainstChange(v as ManualTransactionFormState["againstType"])}
              >
                <SelectTrigger className={FIELD_CLASS}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MANUAL_AGAINST_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldWrap>

            {form.againstType === "Invoice" ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Invoice Reference & Allocation</Label>
                {!form.partyLedgerId ? (
                  <p className="text-[11px] text-muted-foreground rounded-lg bg-muted/20 border border-border/60 px-3 py-2">
                    Select a party / ledger to load outstanding invoices.
                  </p>
                ) : (
                  <ManualInvoiceAllocationTable
                    invoices={outstandingInvoices}
                    allocations={form.invoiceAllocations}
                    transactionAmount={transactionAmount}
                    errors={errors}
                    selectedIds={selectedInvoiceIds}
                    onAllocationChange={handleAllocationChange}
                    onToggleInvoice={handleToggleInvoice}
                  />
                )}
              </div>
            ) : null}

            {form.againstType === "Advance" ? (
              <p className="text-[11px] text-muted-foreground rounded-lg bg-muted/20 border border-border/60 px-3 py-2">
                Recorded as an advance against {form.partyLedger || "the selected party"}.
              </p>
            ) : null}

            {form.againstType === "On Account" ? (
              <p className="text-[11px] text-muted-foreground rounded-lg bg-muted/20 border border-border/60 px-3 py-2">
                Amount remains unallocated for later adjustment.
              </p>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <FieldWrap label="Amount (₹)" required error={errors.amount}>
                <Input
                  value={form.amount}
                  onChange={(e) => set("amount", e.target.value)}
                  placeholder="0.00"
                  disabled={readOnlyCoreFields}
                  className={FIELD_CLASS}
                />
              </FieldWrap>

              <FieldWrap label="Transaction Date" required error={errors.transactionDate}>
                <Input
                  type="date"
                  value={form.transactionDate}
                  onChange={(e) => set("transactionDate", e.target.value)}
                  disabled={readOnlyCoreFields}
                  className={FIELD_CLASS}
                />
              </FieldWrap>
            </div>

            <FieldWrap label="Reference No. / UTR / Cheque No.">
              <Input
                value={combinedReference}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    referenceNumber: v,
                    utrNumber: v,
                    chequeNumber: v,
                  }));
                }}
                disabled={readOnlyCoreFields}
                placeholder="UTR, cheque or reference number"
                className={FIELD_CLASS}
              />
            </FieldWrap>

            <FieldWrap label="Narration">
              <Textarea
                rows={2}
                value={form.narration}
                onChange={(e) => set("narration", e.target.value)}
                disabled={readOnlyCoreFields}
                className="text-sm rounded-lg border border-border min-h-[56px]"
              />
            </FieldWrap>

            <FieldWrap label="Cost Centre">
              <Input
                value={form.costCentre}
                onChange={(e) => set("costCentre", e.target.value)}
                placeholder="Optional"
                className={FIELD_CLASS}
              />
            </FieldWrap>

            {form.againstType === "Invoice" && allocatedTotal > 0 ? (
              <p className="text-[11px] text-muted-foreground">
                Total allocated: ₹{allocatedTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
            ) : null}

            {editRecord?.manualTransactionNumber ? (
              <p className="text-[11px] text-muted-foreground">
                ID: <span className="font-mono text-brand-700">{editRecord.manualTransactionNumber}</span>
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
              {isEdit ? "Update" : "Save"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {toast ? (
        <div className="fixed bottom-5 right-5 z-[400] flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl bg-emerald-600 text-white text-sm font-medium animate-in slide-in-from-bottom-2">
          {toast}
          <button type="button" onClick={() => setToast(null)}><X className="w-4 h-4" /></button>
        </div>
      ) : null}
    </>
  );
}
