"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import {
  AMOUNT_MISMATCH_MESSAGE,
  getMatchingStatementCandidates,
  reconcileBankDateOnly,
  reconcileWithStatement,
  saveAsPending,
  validateAmountMatch,
} from "@/lib/accounts/bank-recon-tally-service";
import type {
  BankReconBankTransaction,
  BankReconBookTransaction,
} from "@/lib/accounts/bank-recon-tally-types";
import { ACCOUNTS_FILTER_CONTROL_CLASS, ACCOUNTS_FILTER_LABEL_CLASS } from "@/lib/accounts/accounts-typography";

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2 py-0.5 text-[11px]">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right min-w-0">{value}</span>
    </div>
  );
}

export function BankReconTallyReconcileDialog({
  open,
  onClose,
  book,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  book: BankReconBookTransaction | null;
  onDone: () => void;
}) {
  const [bankDate, setBankDate] = useState("");
  const [selectedStmtId, setSelectedStmtId] = useState<string | null>(null);
  const [remarks, setRemarks] = useState("");
  const [markReview, setMarkReview] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const candidates = useMemo(() => {
    if (!book) return [] as BankReconBankTransaction[];
    return getMatchingStatementCandidates(book.bankAccountId, book.id);
  }, [book]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter(
      (c) =>
        c.narration.toLowerCase().includes(q) ||
        c.reference.toLowerCase().includes(q) ||
        c.bankDate.includes(q),
    );
  }, [candidates, search]);

  const selected = filtered.find((c) => c.id === selectedStmtId) ??
    candidates.find((c) => c.id === selectedStmtId) ??
    null;

  useEffect(() => {
    if (!open || !book) return;
    setBankDate(book.bankDate || book.voucherDate || "");
    setSelectedStmtId(book.suggestedStatementIds[0] ?? null);
    setRemarks(book.remarks ?? "");
    setMarkReview(false);
    setSearch("");
    setError(null);
  }, [open, book?.id]);

  useEffect(() => {
    if (selected?.bankDate && !book?.bankDate) {
      setBankDate(selected.bankDate);
    }
  }, [selected?.id]);

  if (!book) return null;

  const amountSide = book.deposit > 0 ? "Deposit" : "Withdrawal";
  const amount = book.deposit || book.withdrawal;

  const runReconcile = () => {
    setSaving(true);
    setError(null);

    if (selected) {
      const check = validateAmountMatch(book, selected);
      if (!check.ok) {
        setSaving(false);
        setError(check.error);
        return;
      }
      const res = reconcileWithStatement({
        bankAccountId: book.bankAccountId,
        bookTransactionId: book.id,
        bankStatementTransactionId: selected.id,
        bankDate,
        remarks,
        markForReview: markReview,
      });
      setSaving(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onDone();
      onClose();
      return;
    }

    const res = reconcileBankDateOnly({
      bankAccountId: book.bankAccountId,
      bookTransactionId: book.id,
      bankDate,
      remarks,
      markForReview: markReview,
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onDone();
    onClose();
  };

  const runPending = () => {
    setSaving(true);
    const res = saveAsPending(book.bankAccountId, book.id, remarks);
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onDone();
    onClose();
  };

  const mismatchSelected =
    selected != null && !validateAmountMatch(book, selected).ok;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-border">
          <DialogTitle className="text-sm">Reconcile / Update Bank Date</DialogTitle>
          <DialogDescription className="text-[11px]">
            Link the book transaction to a matching statement entry, or enter Bank Date only.
          </DialogDescription>
        </DialogHeader>

        <div className="px-4 py-3 space-y-3 max-h-[70vh] overflow-y-auto">
          <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
              Book Transaction
            </p>
            <Detail label="Voucher Date" value={book.voucherDate} />
            <Detail label="Voucher Type" value={book.voucherType} />
            <Detail
              label="Voucher Number"
              value={<span className="font-mono text-brand-700">{book.voucherNumber}</span>}
            />
            <Detail label="Particulars" value={book.particulars} />
            <Detail label="Reference / UTR / Cheque" value={book.instrumentNumber || "—"} />
            <Detail
              label={amountSide}
              value={<span className="tabular-nums">{formatMoney(amount)}</span>}
            />
          </div>

          <div className="space-y-1.5">
            <Label className={ACCOUNTS_FILTER_LABEL_CLASS}>
              Matching Bank Statement Entry
            </Label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search imported statement rows…"
              className="h-8 text-xs"
            />
            <div className="border border-border rounded-lg max-h-40 overflow-y-auto divide-y divide-border/60">
              {filtered.length === 0 ? (
                <p className="text-[11px] text-muted-foreground px-3 py-3">
                  No matching statement rows. You can still enter Bank Date only.
                </p>
              ) : (
                filtered.map((c) => {
                  const active = selectedStmtId === c.id;
                  const ok = validateAmountMatch(book, c).ok;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedStmtId(c.id);
                        setBankDate(c.bankDate);
                        setError(null);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 text-[11px] hover:bg-muted/40 transition-colors",
                        active && "bg-brand-50",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{c.bankDate}</span>
                        <span className="tabular-nums">
                          {c.deposit > 0
                            ? `Dep ${formatMoney(c.deposit)}`
                            : `Wdl ${formatMoney(c.withdrawal)}`}
                        </span>
                      </div>
                      <p className="text-muted-foreground line-clamp-1 mt-0.5">{c.narration}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[10px]">{c.reference || "—"}</span>
                        {c.matchConfidence && (
                          <span className="text-[10px] text-amber-700">{c.matchConfidence}</span>
                        )}
                        {active && ok && <Check className="w-3 h-3 text-brand-600 ml-auto" />}
                        {!ok && (
                          <span className="text-[10px] text-red-600 ml-auto">Amount mismatch</span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            {selectedStmtId && (
              <button
                type="button"
                className="text-[11px] text-brand-600 hover:underline"
                onClick={() => setSelectedStmtId(null)}
              >
                Clear statement selection (Bank Date only)
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className={ACCOUNTS_FILTER_LABEL_CLASS}>
                Bank Date <span className="text-red-500">*</span>
              </Label>
              <input
                type="date"
                value={bankDate}
                onChange={(e) => setBankDate(e.target.value)}
                className={cn(ACCOUNTS_FILTER_CONTROL_CLASS, "mt-0 w-full")}
              />
            </div>
            <div className="space-y-1">
              <Label className={ACCOUNTS_FILTER_LABEL_CLASS}>Selected Statement</Label>
              <div className="h-8 px-2.5 flex items-center text-[11px] border border-border rounded-lg bg-muted/20 truncate">
                {selected ? selected.bankDate : "None — Bank Date only"}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <Label className={ACCOUNTS_FILTER_LABEL_CLASS}>Remarks</Label>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              className="text-xs"
            />
          </div>

          <label className="flex items-center gap-2 text-[11px] cursor-pointer">
            <Checkbox checked={markReview} onCheckedChange={(v) => setMarkReview(!!v)} />
            Mark for Review
          </label>

          {mismatchSelected && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 space-y-1.5">
              <p className="text-xs text-red-700 flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                {AMOUNT_MISMATCH_MESSAGE}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline" className="h-7 text-[11px]">
                  <Link href={book.viewHref}>View Original Voucher</Link>
                </Button>
                {book.editHref && (
                  <Button asChild size="sm" variant="outline" className="h-7 text-[11px]">
                    <Link href={book.editHref}>Edit Original Voucher</Link>
                  </Button>
                )}
              </div>
            </div>
          )}

          {error && !mismatchSelected && (
            <p className="text-xs text-red-600 flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              {error}
            </p>
          )}
        </div>

        <div className="px-4 py-3 border-t border-border bg-muted/20 flex items-center justify-end gap-2">
          <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            disabled={saving}
            onClick={runPending}
          >
            Save as Pending
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
            disabled={saving || !bankDate || mismatchSelected}
            onClick={runReconcile}
          >
            Reconcile
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
