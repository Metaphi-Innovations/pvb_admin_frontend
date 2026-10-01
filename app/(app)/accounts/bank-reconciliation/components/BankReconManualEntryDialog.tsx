"use client";

import React, { useState } from "react";
import { AlertCircle, Plus } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GroupedLedgerSelect } from "@/components/accounts/GroupedLedgerSelect";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { createManualReconListingEntry } from "@/lib/accounts/bank-recon-manual-service";

export function BankReconManualEntryDialog({
  open,
  onClose,
  bankAccountId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  bankAccountId: string;
  onCreated: (transactionId: string) => void;
}) {
  const [statementDate, setStatementDate] = useState(new Date().toISOString().slice(0, 10));
  const [direction, setDirection] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState("");
  const [ledger, setLedger] = useState<{ id: number; accountName: string } | null>(null);
  const [reference, setReference] = useState("");
  const [narration, setNarration] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setStatementDate(new Date().toISOString().slice(0, 10));
    setDirection("credit");
    setAmount("");
    setLedger(null);
    setReference("");
    setNarration("");
    setError(null);
    setBusy(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSave = () => {
    const amt = Number(amount) || 0;
    if (amt <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (!ledger) {
      setError("Select the ledger for this manual entry.");
      return;
    }
    setBusy(true);
    setError(null);
    const result = createManualReconListingEntry({
      bankAccountId,
      statementDate,
      partyLedgerId: ledger.id,
      partyLedger: ledger.accountName,
      narration: narration.trim() || "Manual bank entry",
      reference: reference.trim(),
      deposit: direction === "credit" ? amt : 0,
      withdrawal: direction === "debit" ? amt : 0,
    });
    setBusy(false);
    if (!result.ok || !result.record) {
      setError(result.error ?? "Could not create manual entry.");
      return;
    }
    onCreated(result.record.id);
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b">
          <DialogTitle className="text-sm font-semibold">Manual Bank Entry</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Adds a row to the reconciliation listing. Reconcile it using the same workflow as imported statement lines.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Date</Label>
              <Input
                type="date"
                className="h-8 text-xs"
                value={statementDate}
                onChange={(e) => setStatementDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Type</Label>
              <Select value={direction} onValueChange={(v) => setDirection(v as "credit" | "debit")}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit" className="text-xs">
                    Credit (Money In)
                  </SelectItem>
                  <SelectItem value="debit" className="text-xs">
                    Debit (Money Out)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-medium">Amount</Label>
            <AccountsMoneyInput className="h-8 text-xs" value={amount} onChange={(v) => setAmount(String(v))} />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-medium">
              Ledger <span className="text-red-500">*</span>
            </Label>
            <GroupedLedgerSelect
              value={ledger?.id ?? null}
              onChange={(l) => setLedger({ id: l.id, accountName: l.accountName })}
              placeholder={direction === "credit" ? "Select customer / income ledger…" : "Select vendor / expense ledger…"}
              compact
            />
            <p className="text-[10px] text-muted-foreground">
              Finance selects the counter ledger here; this pre-fills reconciliation.
            </p>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-medium">Reference / UTR / Cheque</Label>
            <Input className="h-8 text-xs font-mono" value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-medium">Narration</Label>
            <Textarea
              rows={2}
              className="text-xs resize-none"
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {error}
            </p>
          )}
        </div>

        <div className="px-5 py-3 border-t bg-muted/20 flex justify-end gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
            onClick={handleSave}
            disabled={busy}
          >
            <Plus className="w-3.5 h-3.5" />
            Add Entry
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
