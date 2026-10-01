"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, Loader2, SkipForward } from "lucide-react";
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
import { GroupedLedgerSelect } from "@/components/accounts/GroupedLedgerSelect";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { formatMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import { getBankReconTransactionById, type BankReconTransactionRecord } from "@/lib/accounts/bank-recon-register";
import {
  applyReconcileStatusAction,
  canReconcileTransaction,
  executeReconcile,
  inferVoucherTypeLabel,
  loadPartyInvoicesForReconcile,
  validateReconcileAllocations,
  type ReconcileAgainstType,
  type ReconcileSaveAction,
} from "@/lib/accounts/bank-recon-reconcile-service";
import { InvoiceAllocationPanel } from "./InvoiceAllocationPanel";

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2 py-0.5 text-[11px]">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right min-w-0">{value}</span>
    </div>
  );
}

export function BankReconReconcilePanel({
  transaction: transactionProp,
  transactionId,
  onComplete,
  onSkip,
}: {
  transaction?: BankReconTransactionRecord | null;
  transactionId: string | null;
  onComplete: (action: ReconcileSaveAction) => void;
  onSkip: () => void;
}) {
  const transaction =
    transactionProp ??
    (transactionId ? getBankReconTransactionById(transactionId) ?? null : null);
  const isDeposit = (transaction?.deposit ?? 0) > 0;
  const stmtAmount = transaction ? transaction.deposit || transaction.withdrawal : 0;

  const [ledgerId, setLedgerId] = useState<number | null>(null);
  const [againstType, setAgainstType] = useState<ReconcileAgainstType>("on_account");
  const [bookDate, setBookDate] = useState("");
  const [reconciliationAmount, setReconciliationAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ledger = useMemo(
    () => (ledgerId ? loadChartOfAccounts().find((l) => l.id === ledgerId) ?? null : null),
    [ledgerId],
  );

  const voucherTypeLabel = inferVoucherTypeLabel(isDeposit);

  const direction = isDeposit ? "Deposit" : "Withdrawal";

  const partyInvoices = useMemo(() => {
    if (!ledger || againstType !== "invoice") return [];
    return loadPartyInvoicesForReconcile(ledger.id, ledger.accountName, direction);
  }, [ledger, againstType, direction]);

  const showInvoicePanel = againstType === "invoice" && ledger != null && partyInvoices.length >= 0;

  useEffect(() => {
    if (!transaction) return;
    setLedgerId(transaction.partyLedgerId ?? null);
    setAgainstType(
      transaction.againstType === "Invoice"
        ? "invoice"
        : transaction.againstType === "Advance"
          ? "advance"
          : "on_account",
    );
    setBookDate(transaction.bookDate || transaction.statementDate || "");
    setReconciliationAmount(String(stmtAmount));
    setRemarks(transaction.narration || "");
    setAllocations({});
    setError(null);
  }, [
    transaction?.id,
    transaction?.partyLedgerId,
    transaction?.againstType,
    transaction?.bookDate,
    transaction?.statementDate,
    transaction?.narration,
    stmtAmount,
  ]);

  const handleAllocationChange = (invoiceId: string, value: string) => {
    setAllocations((prev) => ({ ...prev, [invoiceId]: value }));
  };

  const buildAllocationLines = () =>
    Object.entries(allocations)
      .map(([id, val]) => {
        const amount = Number(val) || 0;
        if (amount <= 0) return null;
        const inv = partyInvoices.find((i) => String(i.id) === id);
        if (direction === "Deposit") {
          return { invoiceId: Number(id), amount, documentNo: inv?.label };
        }
        return { billId: Number(id), amount, documentNo: inv?.label };
      })
      .filter(Boolean) as { invoiceId?: number; billId?: number; amount: number; documentNo?: string }[];

  const runAction = async (action: ReconcileSaveAction) => {
    if (!transaction) return;
    if (action === "skip") {
      onSkip();
      return;
    }

    setSaving(true);
    setError(null);

    if (action === "pending") {
      const res = applyReconcileStatusAction(transaction.id, "pending", remarks);
      setSaving(false);
      if (!res.ok) {
        setError(res.error ?? "Could not save.");
        return;
      }
      onComplete("pending");
      return;
    }

    if (action === "review") {
      const res = applyReconcileStatusAction(transaction.id, "review", remarks);
      setSaving(false);
      if (!res.ok) {
        setError(res.error ?? "Could not save.");
        return;
      }
      onComplete("review");
      return;
    }

    if (!ledgerId) {
      setSaving(false);
      setError("Select a ledger to reconcile to.");
      return;
    }

    const amount = Number(reconciliationAmount) || stmtAmount;

    if (againstType === "invoice") {
      const allocErr = validateReconcileAllocations(allocations, partyInvoices, amount);
      if (allocErr) {
        setSaving(false);
        setError(allocErr);
        return;
      }
    }

    const result = executeReconcile({
      statementTransactionId: transaction.id,
      bankAccountId: transaction.bankAccountId,
      ledgerId,
      againstType,
      bookDate,
      reconciliationAmount: amount,
      voucherTypeLabel,
      remarks,
      allocations: againstType === "invoice" ? buildAllocationLines() : undefined,
      advanceHandling: againstType === "advance" ? "keep_advance" : againstType === "on_account" ? "apply_later" : undefined,
    });

    setSaving(false);
    if (!result.ok) {
      setError(result.error ?? "Reconciliation failed.");
      return;
    }
    onComplete("reconcile");
  };

  if (!transaction) {
    return (
      <div className="flex flex-col h-full border-l border-border bg-muted/10 w-[420px] flex-shrink-0">
        <div className="px-3 py-2 border-b border-border/60 bg-white">
          <p className="text-xs font-semibold text-foreground">Reconciliation</p>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            Select a bank row or click Reconcile to match it with a ledger and book date.
          </p>
        </div>
      </div>
    );
  }

  const canReconcile = canReconcileTransaction(transaction);

  return (
    <div className="flex flex-col h-full border-l border-border bg-white w-[420px] flex-shrink-0">
      <div className="flex-shrink-0 px-3 py-2 border-b border-border/60">
        <p className="text-xs font-semibold text-foreground">Reconciliation</p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
        <div className="rounded-lg border border-border/60 bg-muted/15 px-2.5 py-2 space-y-0.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
            Bank Transaction
          </p>
          <DetailRow label="Date" value={transaction.statementDate || "—"} />
          <DetailRow label="Narration" value={<span className="line-clamp-2 font-normal">{transaction.narration}</span>} />
          <DetailRow
            label="Reference"
            value={transaction.reference || transaction.chequeNo || transaction.utrNumber || "—"}
          />
          <DetailRow
            label={isDeposit ? "Credit" : "Debit"}
            value={
              <span className={isDeposit ? "text-emerald-700" : "text-red-700"}>
                {formatMoney(stmtAmount)}
              </span>
            }
          />
          <DetailRow
            label="Running Balance"
            value={transaction.runningBalance != null ? formatMoney(transaction.runningBalance) : "—"}
          />
        </div>

        {!canReconcile ? (
          <p className="text-xs text-muted-foreground text-center py-2">
            This row is already reconciled.
          </p>
        ) : (
          <>
            <div className="space-y-1">
              <Label className="text-xs font-medium">
                Reconcile To / Ledger <span className="text-red-500">*</span>
              </Label>
              <GroupedLedgerSelect
                value={ledgerId}
                onChange={(l) => setLedgerId(l.id)}
                placeholder="Search active ledger…"
                compact
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Against</Label>
              <Select value={againstType} onValueChange={(v) => setAgainstType(v as ReconcileAgainstType)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="invoice" className="text-xs">
                    Invoice
                  </SelectItem>
                  <SelectItem value="advance" className="text-xs">
                    Advance
                  </SelectItem>
                  <SelectItem value="on_account" className="text-xs">
                    On Account
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {showInvoicePanel && (
              <InvoiceAllocationPanel
                title="Outstanding Invoices"
                invoices={partyInvoices}
                allocations={allocations}
                transactionAmount={Number(reconciliationAmount) || stmtAmount}
                amountLabel={isDeposit ? "Receipt amount" : "Payment amount"}
                onAllocationChange={handleAllocationChange}
                onPayInFull={(id, cap) => setAllocations((p) => ({ ...p, [id]: String(cap) }))}
                onClearAll={() => setAllocations({})}
              />
            )}

            <div className="space-y-1">
              <Label className="text-xs font-medium">
                Reconciliation Amount <span className="text-red-500">*</span>
              </Label>
              <AccountsMoneyInput
                className="h-8 text-xs bg-muted/30"
                value={reconciliationAmount}
                onChange={(v) => setReconciliationAmount(String(v))}
                disabled
              />
              <p className="text-[10px] text-muted-foreground">Prefilled from bank {isDeposit ? "credit" : "debit"}</p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">
                Date as per Books <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                className="h-8 text-xs"
                value={bookDate}
                onChange={(e) => setBookDate(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Voucher Type</Label>
              <Input className="h-8 text-xs bg-muted/30" value={voucherTypeLabel} readOnly disabled />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Remarks / Narration</Label>
              <Textarea
                rows={2}
                className="text-xs resize-none"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>
          </>
        )}

        {error && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {error}
          </p>
        )}
      </div>

      <div className="flex-shrink-0 p-3 border-t border-border/60 bg-muted/20 space-y-1.5">
        {canReconcile && (
          <>
            <Button
              size="sm"
              className="h-8 text-xs w-full gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
              disabled={saving}
              onClick={() => void runAction("reconcile")}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Reconcile
            </Button>
            <div className="grid grid-cols-2 gap-1.5">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[11px]"
                disabled={saving}
                onClick={() => void runAction("pending")}
              >
                Save as Pending
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[11px]"
                disabled={saving}
                onClick={() => void runAction("review")}
              >
                Mark for Review
              </Button>
            </div>
          </>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-[11px] w-full text-muted-foreground"
          disabled={saving}
          onClick={() => void runAction("skip")}
        >
          <SkipForward className="w-3 h-3 mr-1" />
          Skip
        </Button>
      </div>
    </div>
  );
}
