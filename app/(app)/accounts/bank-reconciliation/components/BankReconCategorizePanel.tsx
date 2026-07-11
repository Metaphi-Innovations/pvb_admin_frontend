"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, Loader2 } from "lucide-react";
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
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { GroupedLedgerSelect } from "@/components/accounts/GroupedLedgerSelect";
import { cn } from "@/lib/utils";
import type { BankReconTransactionRecord } from "@/lib/accounts/bank-recon-register";
import {
  categorizeBankTransaction,
  canCategorizeTransaction,
} from "@/lib/accounts/bank-recon-categorize-service";
import type { BankReconCategorizeCategory } from "@/lib/accounts/bank-recon-categorize-types";
import {
  DEPOSIT_CATEGORIZE_OPTIONS,
  WITHDRAWAL_CATEGORIZE_OPTIONS,
} from "@/lib/accounts/bank-recon-categorize-types";
import { bankReconLedgerFilterForCategory } from "@/lib/accounts/bank-recon-coa-filters";

export function BankReconCategorizePanel({
  transaction,
  onSaved,
  presetCategory,
}: {
  transaction: BankReconTransactionRecord;
  onSaved: () => void;
  presetCategory?: BankReconCategorizeCategory;
}) {
  const isDeposit = (transaction.deposit ?? 0) > 0;
  const stmtAmount = transaction.deposit || transaction.withdrawal;

  const [category, setCategory] = useState<BankReconCategorizeCategory | "">(presetCategory ?? "");
  const [ledgerId, setLedgerId] = useState<number | null>(null);
  const [transactionDate, setTransactionDate] = useState("");
  const [accountAmount, setAccountAmount] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [narration, setNarration] = useState("");
  const [costCentre, setCostCentre] = useState("");
  const [againstType, setAgainstType] = useState<"invoice" | "advance" | "on_account">("on_account");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const coaFilter = useMemo(() => {
    if (category === "expense" || category === "bank_charges" || category === "interest_expense") {
      return bankReconLedgerFilterForCategory("expense");
    }
    if (category === "interest_income" || category === "other_income") {
      return bankReconLedgerFilterForCategory("interest_income");
    }
    if (category === "bank_transfer") {
      return bankReconLedgerFilterForCategory("transfer");
    }
    return undefined;
  }, [category]);

  useEffect(() => {
    setCategory(presetCategory ?? "");
    setLedgerId(null);
    setTransactionDate(transaction.statementDate || transaction.bookDate || "");
    setAccountAmount(String(stmtAmount));
    setReferenceNo(transaction.reference || transaction.utrNumber || "");
    setNarration(transaction.narration || "");
    setCostCentre("");
    setAgainstType("on_account");
    setError(null);
  }, [transaction.id, presetCategory, stmtAmount, transaction]);

  const categoryOptions = isDeposit ? DEPOSIT_CATEGORIZE_OPTIONS : WITHDRAWAL_CATEGORIZE_OPTIONS;

  const handleSave = () => {
    if (!category) {
      setError("Select a transaction type.");
      return;
    }
    if (!ledgerId && category !== "bank_transfer") {
      setError("Select a party / ledger.");
      return;
    }
    setSaving(true);
    setError(null);
    const result = categorizeBankTransaction({
      statementTransactionId: transaction.id,
      bankAccountId: transaction.bankAccountId,
      category,
      transactionDate,
      referenceNo,
      narration,
      costCentre: costCentre || undefined,
      ledgerId,
      accountAmount: parseFloat(accountAmount) || stmtAmount,
      bankAmount: parseFloat(accountAmount) || stmtAmount,
      advanceHandling: againstType === "advance" ? "keep_advance" : againstType === "on_account" ? "apply_later" : undefined,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error ?? "Could not categorise.");
      return;
    }
    onSaved();
  };

  if (!canCategorizeTransaction(transaction)) {
    return (
      <p className="text-xs text-muted-foreground text-center py-4">
        This transaction is already matched or cannot be categorised.
      </p>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-y-auto space-y-2.5 pb-2">
      <div className="space-y-1">
        <Label className="text-xs font-medium">
          Transaction Type <span className="text-red-500">*</span>
        </Label>
        <Select value={category || "__none__"} onValueChange={(v) => setCategory(v === "__none__" ? "" : (v as BankReconCategorizeCategory))}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Select type…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-xs">Select…</SelectItem>
            {categoryOptions.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs font-medium">
          Party / Ledger <span className="text-red-500">*</span>
        </Label>
        <GroupedLedgerSelect
          value={ledgerId}
          onChange={(ledger) => setLedgerId(ledger.id)}
          placeholder="Search ledger…"
          ledgerFilter={coaFilter}
          compact
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs font-medium">Against</Label>
        <Select value={againstType} onValueChange={(v) => setAgainstType(v as typeof againstType)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="invoice" className="text-xs">Invoice</SelectItem>
            <SelectItem value="advance" className="text-xs">Advance</SelectItem>
            <SelectItem value="on_account" className="text-xs">On Account</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs font-medium">Transaction Date</Label>
          <Input type="date" className="h-8 text-xs" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium">Amount</Label>
          <AccountsMoneyInput className="h-8 text-xs" value={accountAmount} onChange={(v) => setAccountAmount(String(v))} />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs font-medium">Reference No.</Label>
        <Input className="h-8 text-xs font-mono" value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} />
      </div>

      <div className="space-y-1">
        <Label className="text-xs font-medium">Narration</Label>
        <Textarea rows={2} className="text-xs resize-none" value={narration} onChange={(e) => setNarration(e.target.value)} />
      </div>

      <div className="space-y-1">
        <Label className="text-xs font-medium">Cost Centre (optional)</Label>
        <Input className="h-8 text-xs" value={costCentre} onChange={(e) => setCostCentre(e.target.value)} placeholder="Optional" />
      </div>

      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </p>
      )}

      <Button
        size="sm"
        className={cn("h-8 text-xs gap-1.5 w-full bg-brand-600 hover:bg-brand-700 text-white mt-auto")}
        onClick={handleSave}
        disabled={saving || !category}
      >
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
        Categorise & Post
      </Button>
    </div>
  );
}
