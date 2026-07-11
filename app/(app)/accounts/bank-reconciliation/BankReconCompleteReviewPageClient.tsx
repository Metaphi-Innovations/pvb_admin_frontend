"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Download,
  Printer,
  RotateCcw,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { formatMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import {
  RECONCILIATION_BREADCRUMB,
  bankReconWorkspacePath,
} from "./reconciliation-utils";
import { getBankReconAccountById } from "./bank-reconciliation-v2-data";
import type { BankReconValidationCheck } from "@/lib/accounts/bank-recon-completion-types";
import {
  buildReconciliationReview,
  canCompleteReconciliation,
  canCompleteWithDifference,
  cancelDraftSession,
  completeReconciliation,
  createDraftSession,
  getDefaultPeriodDates,
  getSessionById,
  getSessionReview,
  recompleteReconciliation,
  reopenReconciliation,
} from "@/lib/accounts/bank-recon-completion-service";
import { ensureBankReconCompletionSeeded } from "@/lib/accounts/bank-recon-completion-demo-seed";
import {
  exportReconciliationReportToExcel,
  exportReconciliationReportToPdf,
} from "@/lib/accounts/bank-recon-completion-export";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
      <div className="px-3 py-2 border-b border-border bg-muted/30">
        <p className="text-xs font-semibold text-foreground">{title}</p>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function CheckBadge({ check }: { check: BankReconValidationCheck }) {
  const cfg = {
    Passed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Warning: "bg-amber-50 text-amber-700 border-amber-200",
    Failed: "bg-red-50 text-red-700 border-red-200",
  }[check.status];
  return (
    <div className={cn("flex items-start gap-2 px-2.5 py-2 rounded-lg border text-xs", cfg)}>
      <span className="font-semibold shrink-0">{check.status}</span>
      <div>
        <p className="font-medium">{check.label}</p>
        <p className="text-[11px] opacity-80 mt-0.5">{check.detail}</p>
      </div>
    </div>
  );
}

interface BankReconCompleteReviewPageClientProps {
  accountId: string;
}

export default function BankReconCompleteReviewPageClient({
  accountId,
}: BankReconCompleteReviewPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionIdParam = searchParams.get("sessionId");

  const account = getBankReconAccountById(accountId);
  const defaults = getDefaultPeriodDates(accountId);

  const [periodFrom, setPeriodFrom] = useState(defaults.from);
  const [periodTo, setPeriodTo] = useState(defaults.to);
  const [sessionId, setSessionId] = useState<string | null>(sessionIdParam);
  const [confirmed, setConfirmed] = useState(false);
  const [diffDialogOpen, setDiffDialogOpen] = useState(false);
  const [diffReason, setDiffReason] = useState("");
  const [diffExplanation, setDiffExplanation] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    ensureBankReconCompletionSeeded();
  }, []);

  useEffect(() => {
    const pf = searchParams.get("periodFrom");
    const pt = searchParams.get("periodTo");
    if (pf) setPeriodFrom(pf);
    if (pt) setPeriodTo(pt);
  }, [searchParams]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const session = sessionId ? getSessionById(sessionId) : null;
  const readOnly = session?.locked && session.status !== "Reopened";

  const review = useMemo(() => {
    void tick;
    if (session?.snapshotId && session.locked && session.status !== "Reopened") {
      return getSessionReview(session.id);
    }
    return buildReconciliationReview(accountId, periodFrom, periodTo);
  }, [accountId, periodFrom, periodTo, session, tick]);

  const handlePrepare = useCallback(() => {
    const result = createDraftSession(accountId, periodFrom, periodTo);
    if (!result.ok || !result.session) {
      setToast(result.error ?? "Failed to create session.");
      return;
    }
    setSessionId(result.session.id);
    setTick((t) => t + 1);
    setToast("Reconciliation session prepared.");
  }, [accountId, periodFrom, periodTo]);

  const handleComplete = useCallback(() => {
    if (!sessionId) {
      handlePrepare();
      return;
    }
    if (!confirmed) {
      setToast("Please confirm you have reviewed the reconciliation.");
      return;
    }

    const hasDiff = review && Math.abs(review.formula.finalDifference) >= 0.01;
    if (hasDiff && !canCompleteWithDifference()) {
      setToast("You cannot complete with a difference. Resolve outstanding items.");
      return;
    }
    if (hasDiff && canCompleteWithDifference() && !diffReason.trim()) {
      setDiffDialogOpen(true);
      return;
    }

    const input = {
      sessionId,
      confirmed: true,
      differenceOverride: hasDiff
        ? { reason: diffReason, approvedBy: "Rajesh Kumar", explanation: diffExplanation }
        : undefined,
    };

    const result =
      session?.status === "Reopened"
        ? recompleteReconciliation(sessionId, input)
        : completeReconciliation(input);

    if (!result.ok) {
      setToast(result.error ?? "Completion failed.");
      return;
    }
    setToast("Reconciliation completed successfully.");
    setDiffDialogOpen(false);
    setTick((t) => t + 1);
    setTimeout(() => router.push(bankReconWorkspacePath(accountId)), 1200);
  }, [sessionId, confirmed, review, session, diffReason, diffExplanation, accountId, router, handlePrepare]);

  if (!account || !review) {
    return (
      <AppLayout>
        <p className="text-sm text-muted-foreground p-4">Bank account not found.</p>
      </AppLayout>
    );
  }

  const hasDiff = Math.abs(review.formula.finalDifference) >= 0.01;
  const canComplete = canCompleteReconciliation() && (!hasDiff || canCompleteWithDifference());
  const failedChecks = review.validationChecks.filter((c) => c.status === "Failed");

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto space-y-3">
        <div className="sticky top-0 z-10 bg-background border-b border-border py-3 flex flex-wrap items-center gap-2">
          <Link href={bankReconWorkspacePath(accountId)} className="p-1.5 hover:bg-muted rounded-md">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-navy-700">Complete Reconciliation</h1>
            <p className="text-[11px] text-muted-foreground">
              {account.bankName} · {account.accountNickname} · Review before completion
            </p>
          </div>
          {!readOnly && (
            <>
              <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={handlePrepare}>
                Prepare Session
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs gap-1 bg-brand-600 hover:bg-brand-700 text-white"
                disabled={!canComplete || failedChecks.some((f) => f.id !== "zero-difference")}
                onClick={handleComplete}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Complete Reconciliation
              </Button>
            </>
          )}
          {session && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={() => exportReconciliationReportToExcel(session, review)}
              >
                <Download className="w-3.5 h-3.5" /> Excel
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={() => exportReconciliationReportToPdf(session, review)}
              >
                <Printer className="w-3.5 h-3.5" /> Print
              </Button>
            </>
          )}
        </div>

        {/* Period */}
        {!readOnly && (
          <div className="flex flex-wrap gap-2 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Period From</Label>
              <Input type="date" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} className="h-9 text-sm w-[140px]" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Period To</Label>
              <Input type="date" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} className="h-9 text-sm w-[140px]" />
            </div>
            {session && (
              <span className="text-xs px-2 py-1 rounded-md bg-muted/40 border border-border">
                Status: <strong>{session.status}</strong>
                {session.reconciliationNumber ? ` · ${session.reconciliationNumber}` : ""}
              </span>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Section title="Bank & Period Details">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <p className="text-muted-foreground">Bank</p><p className="font-medium">{review.bankName}</p>
              <p className="text-muted-foreground">Account</p><p className="font-medium">{review.maskedAccountNumber}</p>
              <p className="text-muted-foreground">Period</p><p className="font-medium">{review.periodFrom} — {review.periodTo}</p>
              <p className="text-muted-foreground">Previous Reconciled</p><p className="font-medium">{review.previousReconciliationDate ?? "—"}</p>
              <p className="text-muted-foreground">Statement File</p><p className="font-medium truncate">{review.statementFileName ?? "—"}</p>
              <p className="text-muted-foreground">Prepared By</p><p className="font-medium">{session?.preparedBy ?? "—"}</p>
            </div>
          </Section>

          <Section title="Reconciliation Summary">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              {[
                ["Reconciled Deposits", formatMoney(review.totalReconciledDeposits)],
                ["Reconciled Withdrawals", formatMoney(review.totalReconciledWithdrawals)],
                ["Unpresented Cheques", formatMoney(review.unpresentedCheques)],
                ["Deposits in Transit", formatMoney(review.depositsInTransit)],
                ["Book-only", String(review.bookOnlyCount)],
                ["Statement-only", String(review.statementOnlyCount)],
                ["Partial", String(review.partialCount)],
                ["Adjustments", String(review.adjustmentCount)],
              ].map(([k, v]) => (
                <React.Fragment key={k}>
                  <p className="text-muted-foreground">{k}</p>
                  <p className="font-semibold tabular-nums text-right">{v}</p>
                </React.Fragment>
              ))}
            </div>
          </Section>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Section title="Book Balance Summary">
            <div className="space-y-1 text-xs tabular-nums">
              <div className="flex justify-between"><span>Opening Book Balance</span><span>{formatMoney(review.bookOpeningBalance)}</span></div>
              <div className="flex justify-between text-emerald-700"><span>+ Book Deposits</span><span>{formatMoney(review.bookDeposits)}</span></div>
              <div className="flex justify-between text-red-600"><span>- Book Withdrawals</span><span>{formatMoney(review.bookWithdrawals)}</span></div>
              <div className="flex justify-between font-semibold border-t border-border pt-1"><span>Closing Book Balance</span><span>{formatMoney(review.bookClosingBalance)}</span></div>
            </div>
          </Section>
          <Section title="Statement Balance Summary">
            <div className="space-y-1 text-xs tabular-nums">
              <div className="flex justify-between"><span>Opening Statement Balance</span><span>{formatMoney(review.statementOpeningBalance)}</span></div>
              <div className="flex justify-between text-emerald-700"><span>+ Statement Deposits</span><span>{formatMoney(review.statementDeposits)}</span></div>
              <div className="flex justify-between text-red-600"><span>- Statement Withdrawals</span><span>{formatMoney(review.statementWithdrawals)}</span></div>
              <div className="flex justify-between font-semibold border-t border-border pt-1"><span>Closing Statement Balance</span><span>{formatMoney(review.statementClosingBalance)}</span></div>
            </div>
          </Section>
        </div>

        <Section title="Final Difference Calculation">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1 tabular-nums">
              <p className="font-semibold mb-1">Adjusted Book Balance</p>
              <div className="flex justify-between"><span>Book Closing Balance</span><span>{formatMoney(review.formula.bookClosingBalance)}</span></div>
              <div className="flex justify-between"><span>+ Deposits in Transit</span><span>{formatMoney(review.formula.addDepositsInTransit)}</span></div>
              <div className="flex justify-between"><span>- Unpresented Cheques</span><span>{formatMoney(review.formula.lessUnpresentedCheques)}</span></div>
              <div className="flex justify-between font-semibold border-t border-border pt-1"><span>Adjusted Book Balance</span><span>{formatMoney(review.formula.adjustedBookBalance)}</span></div>
            </div>
            <div className="space-y-1 tabular-nums">
              <p className="font-semibold mb-1">Compare with Statement</p>
              <div className="flex justify-between"><span>Statement Closing Balance</span><span>{formatMoney(review.formula.statementClosingBalance)}</span></div>
              <div className={cn("flex justify-between font-bold text-sm pt-2", hasDiff ? "text-red-600" : "text-emerald-700")}>
                <span>Final Difference</span><span>{formatMoney(review.formula.finalDifference)}</span>
              </div>
              {hasDiff && !canCompleteWithDifference() && (
                <p className="text-[11px] text-red-600 mt-2 flex items-start gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  Reconciliation cannot be completed because the adjusted book balance does not match the statement closing balance.
                </p>
              )}
            </div>
          </div>
        </Section>

        {review.comparisonWithPrevious && (
          <Section title="Comparison with Previous Period">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <p>Previous Closing Book: <strong>{formatMoney(review.comparisonWithPrevious.previousClosingBookBalance ?? 0)}</strong></p>
              <p>Current Opening Book: <strong>{formatMoney(review.comparisonWithPrevious.currentOpeningBookBalance)}</strong></p>
              {!review.comparisonWithPrevious.bookOpeningContinuityOk && (
                <p className="col-span-2 text-red-600 font-medium">Current opening book balance does not match previous completed closing balance.</p>
              )}
            </div>
          </Section>
        )}

        <Section title={`Outstanding Book Entries (${review.outstandingBook.length})`}>
          <div className="overflow-x-auto max-h-[200px]">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 sticky top-0"><tr>
                <th className="px-2 py-1.5 text-left">Date</th><th className="px-2 py-1.5 text-left">Voucher</th>
                <th className="px-2 py-1.5 text-left">Party</th><th className="px-2 py-1.5 text-right">Amount</th>
                <th className="px-2 py-1.5 text-left">Ageing</th><th className="px-2 py-1.5 text-left">Reason</th>
              </tr></thead>
              <tbody>
                {review.outstandingBook.length === 0 ? (
                  <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">No outstanding book entries.</td></tr>
                ) : review.outstandingBook.map((o) => (
                  <tr key={o.bookTargetId} className="border-b border-border/60">
                    <td className="px-2 py-1.5">{o.bookDate}</td>
                    <td className="px-2 py-1.5 font-mono text-brand-700">{o.voucherNo}</td>
                    <td className="px-2 py-1.5">{o.partyLedger}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{formatMoney(o.deposit || o.withdrawal)}</td>
                    <td className="px-2 py-1.5">{o.ageingDays}d</td>
                    <td className="px-2 py-1.5">{o.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title={`Statement-only Entries (${review.statementOnly.length})`}>
          <div className="overflow-x-auto max-h-[160px]">
            <table className="w-full text-xs">
              <thead className="bg-muted/40"><tr>
                <th className="px-2 py-1.5 text-left">Date</th><th className="px-2 py-1.5 text-left">Reference</th>
                <th className="px-2 py-1.5 text-right">Amount</th><th className="px-2 py-1.5 text-left">Action</th>
              </tr></thead>
              <tbody>
                {review.statementOnly.length === 0 ? (
                  <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No statement-only entries.</td></tr>
                ) : review.statementOnly.map((s) => (
                  <tr key={s.statementTransactionId} className="border-b border-border/60">
                    <td className="px-2 py-1.5">{s.statementDate}</td>
                    <td className="px-2 py-1.5">{s.reference || s.narration.slice(0, 40)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{formatMoney(s.deposit || s.withdrawal)}</td>
                    <td className="px-2 py-1.5">{s.requiredAction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Validation Checklist">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {review.validationChecks.map((c) => (
              <CheckBadge key={c.id} check={c} />
            ))}
          </div>
        </Section>

        {!readOnly && (
          <Section title="Completion Confirmation">
            <label className="flex items-start gap-2 text-xs cursor-pointer">
              <Checkbox checked={confirmed} onCheckedChange={(v) => setConfirmed(Boolean(v))} className="mt-0.5" />
              I confirm that I have reviewed the reconciliation details and balances.
            </label>
          </Section>
        )}

        {session?.status === "Completed" || session?.status === "Completed with Difference" ? (
          <Section title="Completion Details">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <p>Completed By: <strong>{session.completedBy}</strong></p>
              <p>Completed On: <strong>{session.completedOn ? new Date(session.completedOn).toLocaleString("en-IN") : "—"}</strong></p>
              {session.differenceOverrideReason && (
                <p className="col-span-2 text-amber-700">Difference override: {session.differenceOverrideReason} (Approved by {session.differenceApprovedBy})</p>
              )}
            </div>
          </Section>
        ) : null}
      </div>

      <Dialog open={diffDialogOpen} onOpenChange={setDiffDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Complete with Difference
            </DialogTitle>
            <DialogDescription>Difference: {formatMoney(review.formula.finalDifference)} — override requires reason and approval.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <Label>Difference Reason *</Label>
              <Input value={diffReason} onChange={(e) => setDiffReason(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label>Explanation *</Label>
              <Textarea rows={3} value={diffExplanation} onChange={(e) => setDiffExplanation(e.target.value)} className="text-sm" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setDiffDialogOpen(false)}>Cancel</Button>
              <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white" onClick={handleComplete}>
                <Check className="w-3.5 h-3.5" /> Complete with Difference
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {toast && (
        <div className="fixed bottom-5 right-5 z-[100] px-4 py-3 rounded-xl shadow-xl bg-emerald-600 text-white text-sm font-medium">
          {toast}
        </div>
      )}
    </AppLayout>
  );
}
