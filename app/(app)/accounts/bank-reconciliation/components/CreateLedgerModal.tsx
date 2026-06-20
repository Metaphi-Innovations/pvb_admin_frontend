"use client";

import { useMemo, useState, useCallback } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CoaParentGroupSelector } from "../../masters/chart-of-accounts/components/CoaParentGroupSelector";
import { loadChartOfAccounts, type AccountType, type ChartOfAccount } from "../../data";
import { createLedgerQuick } from "../bank-reconciliation-data";
import { canAddLedgerFromLedgersPage } from "@/lib/accounts/ledger-creation-policy";

const ACCOUNT_TYPES: AccountType[] = ["Asset", "Liability", "Income", "Expense"];

export function CreateLedgerModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (ledger: ChartOfAccount) => void;
}) {
  const records = useMemo(() => loadChartOfAccounts(), [open]);
  const parentFilter = useCallback(
    (node: ChartOfAccount) => canAddLedgerFromLedgersPage(node, records),
    [records],
  );

  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("Expense");
  const [parentGroupId, setParentGroupId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    if (!name.trim()) return;
    try {
      const ledger = createLedgerQuick({
        ledgerName: name.trim(),
        accountType,
        parentGroupId: parentGroupId ?? undefined,
      });
      onCreated(ledger);
      setName("");
      setParentGroupId(null);
      setError(null);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create ledger.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">Create Ledger</DialogTitle>
        </DialogHeader>
        <p className="text-[11px] text-muted-foreground -mt-2">
          Quick-create expense or GST ledgers only. Customer, vendor and bank ledgers are created in their respective masters.
        </p>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="space-y-3 py-1">
          <div className="space-y-1">
            <Label className="text-xs">Ledger Name</Label>
            <Input
              className="h-8 text-xs"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Bank Charges"
            />
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
            <Label className="text-xs">Parent Group / Sub-Group</Label>
            <CoaParentGroupSelector
              records={records}
              value={parentGroupId}
              onChange={setParentGroupId}
              parentFilter={parentFilter}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
            onClick={handleSave}
            disabled={!name.trim()}
          >
            Save Ledger
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
