"use client";

import React, { useState } from "react";
import { AlertTriangle, Check, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import { acceptMatch } from "@/lib/accounts/bank-recon-match-service";
import type { MatchRejectReason, StatementMatchGroup } from "@/lib/accounts/bank-recon-match-types";

const REJECT_REASONS: MatchRejectReason[] = [
  "Different Customer",
  "Different Vendor",
  "Reference Does Not Match",
  "Date Difference Too High",
  "Wrong Voucher",
  "Duplicate Transaction",
  "Amount Belongs to Multiple Entries",
  "Other",
];

function CompareRow({ label, ok, detail }: { label: string; ok: boolean | null; detail: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1 border-b border-border/40 text-[11px]">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium text-right", ok === true && "text-emerald-700", ok === false && "text-red-600")}>
        {detail}
      </span>
    </div>
  );
}

interface BankReconMatchReviewSheetProps {
  bankAccountId: string;
  group: StatementMatchGroup | null;
  open: boolean;
  onClose: () => void;
  onAccepted: () => void;
  onFindAnother: (statementId: string) => void;
  onReject: (statementId: string, bookTargetId: string, reason: string) => void;
}

export function BankReconMatchReviewSheet({
  bankAccountId,
  group,
  open,
  onClose,
  onAccepted,
  onFindAnother,
  onReject,
}: BankReconMatchReviewSheetProps) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState<MatchRejectReason>("Other");
  const [rejectNote, setRejectNote] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);

  if (!group) return null;

  const stmt = group.statement;
  const candidate = group.candidates[selectedIdx] ?? group.candidates[0];
  const stmtAmt = stmt.deposit || stmt.withdrawal;

  const handleAccept = () => {
    if (!candidate) return;
    const result = acceptMatch({
      bankAccountId,
      statementTransactionId: group.statementTransactionId,
      candidate,
      matchMethod: "Suggested Accepted",
    });
    if (result.ok) onAccepted();
  };

  const handleReject = () => {
    if (!candidate) return;
    onReject(group.statementTransactionId, candidate.bookTarget.id, rejectNote || rejectReason);
    setRejectOpen(false);
    onClose();
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent className="max-w-[720px] w-full">
          <SheetHeader>
            <SheetTitle>Match Review</SheetTitle>
          </SheetHeader>
          <SheetBody className="space-y-4">
            {group.category === "multiple" && group.candidates.length > 1 ? (
              <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 text-xs text-purple-800">
                Multiple candidates found — select the correct book transaction below.
              </div>
            ) : null}

            {group.combinedHint ? (
              <div className="bg-navy-50 border border-navy-100 rounded-lg px-3 py-2 text-xs text-navy-700">
                Potential Combined Match: {group.combinedHint.message}
              </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-xl border border-border p-3 bg-muted/20">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Statement Transaction</p>
                <p className="text-xs font-semibold">{stmt.reference || stmt.chequeNo || "—"}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{stmt.statementDate} · Value {stmt.valueDate || "—"}</p>
                <p className="text-[11px] mt-1 line-clamp-2">{stmt.narration}</p>
                <p className={cn("text-sm font-bold mt-2", stmt.deposit > 0 ? "text-emerald-700" : "text-red-700")}>
                  {stmt.deposit > 0 ? "Deposit" : "Withdrawal"} {formatMoney(stmtAmt)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">Source: {stmt.source}</p>
              </div>

              {candidate ? (
                <div className="rounded-xl border border-border p-3 bg-brand-50/30">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Book Transaction</p>
                  <p className="text-xs font-semibold">{candidate.bookTarget.voucherNo}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{candidate.bookTarget.bookDate} · {candidate.bookTarget.voucherType}</p>
                  <p className="text-[11px] mt-1">{candidate.bookTarget.partyLedger}</p>
                  <p className="text-[11px]">Ref: {candidate.bookTarget.reference || candidate.bookTarget.chequeNo || "—"}</p>
                  <p className={cn("text-sm font-bold mt-2", candidate.bookTarget.deposit > 0 ? "text-emerald-700" : "text-red-700")}>
                    {formatMoney(candidate.bookTarget.deposit || candidate.bookTarget.withdrawal)}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border p-3 flex items-center justify-center text-xs text-muted-foreground">
                  No book match candidate
                </div>
              )}
            </div>

            {group.candidates.length > 1 ? (
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Candidates</p>
                {group.candidates.map((c, i) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedIdx(i)}
                    className={cn(
                      "w-full text-left px-2.5 py-1.5 rounded-lg border text-xs",
                      selectedIdx === i ? "border-brand-400 bg-brand-50" : "border-border hover:bg-muted/30",
                    )}
                  >
                    {c.bookTarget.voucherNo} · {c.confidence}% · {c.bookTarget.partyLedger}
                  </button>
                ))}
              </div>
            ) : null}

            {candidate ? (
              <div className="rounded-xl border border-border p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                  Comparison · {candidate.confidence}% confidence
                </p>
                <CompareRow label="Amount" ok={true} detail="Exact match" />
                <CompareRow
                  label="Direction"
                  ok={true}
                  detail={stmt.deposit > 0 ? "Deposit" : "Withdrawal"}
                />
                <CompareRow
                  label="Reference"
                  ok={!candidate.mismatches.some((m) => m.includes("Reference"))}
                  detail={candidate.reasons.find((r) => r.includes("Reference") || r.includes("Cheque")) ?? "—"}
                />
                <CompareRow
                  label="Date difference"
                  ok={candidate.dateDifferenceDays !== null && candidate.dateDifferenceDays <= 15}
                  detail={candidate.dateDifferenceDays !== null ? `${candidate.dateDifferenceDays} day(s)` : "—"}
                />
                <CompareRow
                  label="Party"
                  ok={candidate.breakdown.party > 0}
                  detail={candidate.bookTarget.partyLedger}
                />
                <CompareRow
                  label="Narration similarity"
                  ok={candidate.narrationSimilarity >= 0.5}
                  detail={`${Math.round(candidate.narrationSimilarity * 100)}%`}
                />
                <div className="mt-2">
                  <p className="text-[10px] font-semibold text-muted-foreground">Match reasons</p>
                  <ul className="text-[11px] text-foreground list-disc pl-4 mt-0.5">
                    {candidate.reasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>
                {candidate.warnings.length > 0 ? (
                  <div className="mt-2 text-[11px] text-amber-700">{candidate.warnings.join("; ")}</div>
                ) : null}
                {candidate.mismatches.length > 0 ? (
                  <div className="mt-1 text-[11px] text-red-600">{candidate.mismatches.join("; ")}</div>
                ) : null}
              </div>
            ) : null}
          </SheetBody>
          <SheetFooter className="gap-2">
            <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
              Keep Pending
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={() => onFindAnother(group.statementTransactionId)}
            >
              <Search className="w-3.5 h-3.5" />
              Find Another
            </Button>
            {candidate ? (
              <>
                <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => setRejectOpen(true)}>
                  Reject
                </Button>
                <Button type="button" size="sm" className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white" onClick={handleAccept}>
                  <Check className="w-3.5 h-3.5" />
                  Accept Match
                </Button>
              </>
            ) : null}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Reject Match Suggestion
            </DialogTitle>
            <DialogDescription>Select a reason for rejecting this suggestion.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {REJECT_REASONS.map((r) => (
              <label key={r} className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="radio" name="reject" checked={rejectReason === r} onChange={() => setRejectReason(r)} />
                {r}
              </label>
            ))}
            <Textarea rows={2} value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder="Optional note…" className="text-sm" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button size="sm" className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white" onClick={handleReject}>Reject</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
