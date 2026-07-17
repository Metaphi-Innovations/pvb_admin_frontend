"use client";

import React, { useMemo } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatMoney } from "@/lib/accounts/money-format";
import {
  getManualDemoAccount,
  getManualDemoMovements,
  isManualDemoAccount,
} from "@/lib/accounts/bank-recon-manual-demo-overlay";
import type { BankReconBookTransaction } from "@/lib/accounts/bank-recon-tally-types";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 py-1.5 border-b border-border/50 last:border-0">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-foreground break-words">{value}</span>
    </div>
  );
}

/**
 * Read-only voucher detail for recon-only overlay fixtures
 * (does not open shared voucher modules).
 */
export function BankReconManualVoucherDialog({
  open,
  onClose,
  book,
}: {
  open: boolean;
  onClose: () => void;
  book: BankReconBookTransaction | null;
}) {
  const overlay = useMemo(() => {
    if (!book || !isManualDemoAccount(book.bankAccountId)) return null;
    const acct = getManualDemoAccount(book.bankAccountId);
    const key = book.id.split(":").slice(2).join(":");
    const movement = getManualDemoMovements(book.bankAccountId).find((m) => m.key === key);
    return { acct, movement };
  }, [book]);

  if (!book) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-brand-600" />
            </div>
            Voucher Details
          </DialogTitle>
          <DialogDescription className="pt-1 text-xs">
            Read-only recon demo voucher. Amount corrections must be made in the original Payment /
            Receipt / Contra voucher (when linked to live books).
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-border bg-muted/20 px-3 py-1">
          <InfoRow label="Voucher Type" value={book.voucherType} />
          <InfoRow
            label="Voucher No."
            value={<span className="font-mono text-brand-700">{book.voucherNumber}</span>}
          />
          <InfoRow label="Voucher Date" value={book.voucherDate} />
          <InfoRow label="Particulars" value={book.particulars} />
          <InfoRow label="Instrument / UTR" value={book.instrumentNumber || "—"} />
          <InfoRow label="Instrument Date" value={book.instrumentDate || "—"} />
          <InfoRow label="Deposit" value={book.deposit ? formatMoney(book.deposit) : "—"} />
          <InfoRow
            label="Withdrawal"
            value={book.withdrawal ? formatMoney(book.withdrawal) : "—"}
          />
          <InfoRow label="Bank Date" value={book.bankDate || "— (Unreconciled)"} />
          <InfoRow label="Ledger" value={book.ledgerName || overlay?.acct?.accountNickname || "—"} />
          {overlay?.movement?.narration && (
            <InfoRow label="Narration" value={overlay.movement.narration} />
          )}
        </div>

        <div className="flex justify-end pt-1">
          <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
