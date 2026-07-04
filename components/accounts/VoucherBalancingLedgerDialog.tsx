"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GroupedLedgerSelect } from "@/components/accounts/GroupedLedgerSelect";
import { formatMoney } from "@/lib/accounts/money-format";
import type { BalancingLedgerPrompt } from "@/lib/accounts/voucher-auto-balance";
import type { ChartOfAccount } from "@/app/(app)/accounts/data";

interface VoucherBalancingLedgerDialogProps {
  open: boolean;
  prompt: BalancingLedgerPrompt | null;
  amount?: number;
  onClose: () => void;
  onConfirm: (ledger: ChartOfAccount) => void;
}

export function VoucherBalancingLedgerDialog({
  open,
  prompt,
  amount,
  onClose,
  onConfirm,
}: VoucherBalancingLedgerDialogProps) {
  const [ledger, setLedger] = useState<ChartOfAccount | null>(null);

  useEffect(() => {
    if (!open) setLedger(null);
  }, [open, prompt?.title]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">{prompt?.title ?? "Select ledger"}</DialogTitle>
          <DialogDescription className="text-xs pt-1">
            {prompt?.description}
            {amount != null && amount > 0 && (
              <span className="block mt-1.5 font-medium text-foreground">
                Amount: {formatMoney(amount)}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5 py-1">
          <GroupedLedgerSelect
            label={prompt?.fieldLabel ?? "Ledger"}
            required
            value={ledger?.id ?? null}
            onChange={setLedger}
            placeholder="Select ledger…"
            ledgerFilter={prompt?.ledgerFilter}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" className="h-9 text-sm font-medium" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-9 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white"
            disabled={!ledger}
            onClick={() => ledger && onConfirm(ledger)}
          >
            Confirm & Post
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
