"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createLedgerQuick } from "../bank-reconciliation-data";
import type { AccountType, Ledger } from "../../data";

const ACCOUNT_TYPES: AccountType[] = ["Asset", "Liability", "Income", "Expense", "Equity"];

export function CreateLedgerModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (ledger: Ledger) => void;
}) {
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("Expense");
  const [linkedAccount, setLinkedAccount] = useState("Miscellaneous");

  const handleSave = () => {
    if (!name.trim()) return;
    const ledger = createLedgerQuick({
      ledgerName: name.trim(),
      accountType,
      linkedAccount: linkedAccount.trim() || "Miscellaneous",
    });
    onCreated(ledger);
    setName("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">Create Ledger</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1">
            <Label className="text-xs">Ledger Name</Label>
            <Input className="h-8 text-xs" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bank Charges" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Account Type</Label>
            <Select value={accountType} onValueChange={(v) => setAccountType(v as AccountType)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="text-xs">
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Linked Account (group)</Label>
            <Input className="h-8 text-xs" value={linkedAccount} onChange={(e) => setLinkedAccount(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white" onClick={handleSave} disabled={!name.trim()}>
            Save Ledger
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
