"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getBankReconAccounts,
  maskAccountNumber,
} from "../bank-reconciliation-v2-data";

export function BankReconSelectAccountDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: (accountId: string) => void;
}) {
  const accounts = getBankReconAccounts();
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");

  useEffect(() => {
    if (open && accounts.length > 0) {
      setAccountId(accounts[0]!.id);
    }
  }, [open, accounts]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">{title}</DialogTitle>
          <DialogDescription className="text-xs">{description}</DialogDescription>
        </DialogHeader>
        {accounts.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">
            No bank accounts found. Add a bank account under Banking → Bank Accounts first.
          </p>
        ) : (
          <div className="space-y-1.5 py-1">
            <Label className="text-xs font-medium">Bank Account</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id} className="text-xs">
                    {a.accountNickname} · {maskAccountNumber(a.accountNumber)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
            disabled={!accountId}
            onClick={() => {
              if (accountId) onConfirm(accountId);
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
