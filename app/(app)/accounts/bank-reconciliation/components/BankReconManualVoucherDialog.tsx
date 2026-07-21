"use client";

import React, { useEffect, useMemo, useState } from "react";
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
import { findActiveLinkForBook } from "@/lib/accounts/bank-recon-tally-store";
import {
  TALLY_EVENT,
  type BankReconBookTransaction,
  type BankReconTallyLink,
} from "@/lib/accounts/bank-recon-tally-types";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 py-1.5 border-b border-border/50 last:border-0">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-foreground break-words">{value}</span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
      {children}
    </p>
  );
}

function formatReconciledAt(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function statusLabel(link: BankReconTallyLink | null): string {
  if (link?.status === "RECONCILED") return "Reconciled";
  if (link?.status === "MARKED_FOR_REVIEW") return "Marked for Review";
  return "Unreconciled";
}

/**
 * Read-only voucher + reconciliation detail for recon-only overlay fixtures.
 * Reconciliation fields are read from the persisted BankReconTallyLink (localStorage).
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
  const [linkTick, setLinkTick] = useState(0);

  useEffect(() => {
    if (!open) return;
    const handler = () => setLinkTick((t) => t + 1);
    window.addEventListener(TALLY_EVENT, handler);
    return () => window.removeEventListener(TALLY_EVENT, handler);
  }, [open]);

  const overlay = useMemo(() => {
    if (!book || !isManualDemoAccount(book.bankAccountId)) return null;
    const acct = getManualDemoAccount(book.bankAccountId);
    const key = book.id.split(":").slice(2).join(":");
    const movement = getManualDemoMovements(book.bankAccountId).find((m) => m.key === key);
    return { acct, movement };
  }, [book]);

  const link = useMemo(() => {
    void linkTick;
    if (!book || !open) return null;
    return findActiveLinkForBook(book.id) ?? null;
  }, [book, open, linkTick]);

  if (!book) return null;

  const isReconciled = link?.status === "RECONCILED";
  const bankAccountLabel =
    book.ledgerName ||
    overlay?.acct?.accountNickname ||
    overlay?.acct?.bankName ||
    "—";
  const amountLabel =
    book.deposit > 0
      ? `Deposit ${formatMoney(book.deposit)}`
      : book.withdrawal > 0
        ? `Withdrawal ${formatMoney(book.withdrawal)}`
        : "—";
  const narration = overlay?.movement?.narration?.trim() || null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-brand-600" />
            </div>
            Transaction Details
          </DialogTitle>
          <DialogDescription className="pt-1 text-xs">
            Read-only recon demo details. Bank Date and reconciliation metadata come from the
            persisted reconciliation link (localStorage).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <SectionLabel>Voucher Details</SectionLabel>
            <div className="rounded-xl border border-border bg-muted/20 px-3 py-1">
              <InfoRow label="Voucher Date" value={book.voucherDate} />
              <InfoRow label="Voucher Type" value={book.voucherType} />
              <InfoRow
                label="Voucher Number"
                value={<span className="font-mono text-brand-700">{book.voucherNumber}</span>}
              />
              <InfoRow label="Particulars" value={book.particulars} />
              <InfoRow label="Bank Account" value={bankAccountLabel} />
              <InfoRow
                label="Instrument / Cheque / UTR"
                value={book.instrumentNumber || "—"}
              />
              <InfoRow label="Instrument Date" value={book.instrumentDate || "—"} />
              <InfoRow label="Amount" value={amountLabel} />
              {narration ? <InfoRow label="Narration" value={narration} /> : null}
            </div>
          </div>

          <div>
            <SectionLabel>Bank Reconciliation</SectionLabel>
            <div className="rounded-xl border border-border bg-muted/20 px-3 py-1">
              <InfoRow label="Reconciliation Status" value={statusLabel(link)} />
              <InfoRow
                label="Bank Date"
                value={isReconciled && link?.bankDate ? link.bankDate : "—"}
              />
              <InfoRow
                label="Reconciled By"
                value={isReconciled && link?.reconciledBy ? link.reconciledBy : "—"}
              />
              <InfoRow
                label="Reconciled At"
                value={
                  isReconciled && link?.reconciledAt
                    ? formatReconciledAt(link.reconciledAt)
                    : "—"
                }
              />
            </div>
          </div>
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
