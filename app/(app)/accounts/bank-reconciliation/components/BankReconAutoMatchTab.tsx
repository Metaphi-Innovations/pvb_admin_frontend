"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Loader2, RotateCcw, Settings2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AccountsSummaryCards } from "@/components/accounts/AccountsSummaryCards";
import { formatMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import {
  bulkAcceptExactMatches,
  loadMatchRun,
  rejectMatch,
  runAutoMatch,
  updateStatementMatchStatusFromRun,
} from "@/lib/accounts/bank-recon-match-service";
import type { AutoMatchRunResult, MatchCategory, StatementMatchGroup } from "@/lib/accounts/bank-recon-match-types";
import { BankReconMatchConfigPanel } from "./BankReconMatchConfigPanel";
import { BankReconMatchReviewSheet } from "./BankReconMatchReviewSheet";
import { BankReconFindMatchSheet } from "./BankReconFindMatchSheet";

const QUICK_CHIPS: { id: MatchCategory | "all" | "accepted"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "exact", label: "Exact" },
  { id: "suggested", label: "Suggested" },
  { id: "multiple", label: "Multiple Candidates" },
  { id: "no_match", label: "No Match" },
  { id: "rejected", label: "Rejected" },
  { id: "accepted", label: "Accepted" },
];

function MatchRow({
  group,
  selected,
  onSelect,
  onReview,
}: {
  group: StatementMatchGroup;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onReview: () => void;
}) {
  const stmt = group.statement;
  const amt = stmt.deposit || stmt.withdrawal;
  const top = group.candidates[0];

  return (
    <div className="flex items-start gap-2 px-3 py-2 border-b border-border/60 hover:bg-muted/20 text-xs">
      {group.category === "exact" ? (
        <input type="checkbox" checked={selected} onChange={(e) => onSelect(e.target.checked)} className="mt-1 accent-brand-600" />
      ) : (
        <span className="w-4" />
      )}
      <div className="flex-1 min-w-0 grid grid-cols-1 lg:grid-cols-2 gap-2">
        <div>
          <p className="font-medium text-foreground truncate">{stmt.reference || stmt.chequeNo || "No ref"}</p>
          <p className="text-[11px] text-muted-foreground line-clamp-1">{stmt.narration}</p>
          <p className="text-[11px] text-muted-foreground">{stmt.statementDate} · {stmt.deposit > 0 ? "Deposit" : "Withdrawal"} {formatMoney(amt)}</p>
        </div>
        <div>
          {top ? (
            <>
              <p className="font-medium truncate">{top.bookTarget.voucherNo} · {top.bookTarget.partyLedger}</p>
              <p className="text-[11px] text-brand-700 font-semibold">{top.confidence}% confidence</p>
              <p className="text-[11px] text-muted-foreground line-clamp-1">{top.reasons.slice(0, 2).join(" · ")}</p>
            </>
          ) : group.combinedHint ? (
            <p className="text-[11px] text-purple-700">{group.combinedHint.message}</p>
          ) : (
            <p className="text-[11px] text-muted-foreground">No match found</p>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1 flex-shrink-0">
        <CategoryBadge category={group.category} />
        <Button type="button" size="sm" variant="outline" className="h-7 text-[11px] px-2" onClick={onReview}>
          Review
        </Button>
      </div>
    </div>
  );
}

function CategoryBadge({ category }: { category: MatchCategory | "accepted" }) {
  const cfg: Record<string, string> = {
    exact: "bg-emerald-50 text-emerald-700 border-emerald-200",
    suggested: "bg-amber-50 text-amber-700 border-amber-200",
    multiple: "bg-purple-50 text-purple-700 border-purple-200",
    no_match: "bg-slate-100 text-slate-600 border-slate-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
    accepted: "bg-emerald-50 text-emerald-700 border-emerald-200",
    combined_hint: "bg-navy-50 text-navy-700 border-navy-200",
  };
  const label = category === "no_match" ? "No Match" : category.charAt(0).toUpperCase() + category.slice(1).replace("_", " ");
  return (
    <span className={cn("inline-flex px-1.5 py-0.5 rounded-md border text-[10px] font-semibold", cfg[category] ?? cfg.no_match)}>
      {label}
    </span>
  );
}

interface BankReconAutoMatchTabProps {
  bankAccountId: string;
  selectedTransactionIds?: string[];
  onRefresh?: () => void;
}

export function BankReconAutoMatchTab({
  bankAccountId,
  selectedTransactionIds,
  onRefresh,
}: BankReconAutoMatchTabProps) {
  const [run, setRun] = useState<AutoMatchRunResult | null>(() => loadMatchRun(bankAccountId));
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [chip, setChip] = useState<MatchCategory | "all" | "accepted">("all");
  const [reviewGroup, setReviewGroup] = useState<StatementMatchGroup | null>(null);
  const [findStatementId, setFindStatementId] = useState<string | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [selectedExact, setSelectedExact] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setRun(loadMatchRun(bankAccountId));
  }, [bankAccountId]);

  const handleRun = useCallback(async () => {
    setRunning(true);
    setProgress("Scanning transactions…");
    await new Promise((r) => setTimeout(r, 100));
    setProgress("Comparing with book entries…");
    const result = runAutoMatch({
      bankAccountId,
      transactionIds: selectedTransactionIds?.length ? selectedTransactionIds : undefined,
    });
    updateStatementMatchStatusFromRun(bankAccountId);
    setRun(result);
    setProgress("");
    setRunning(false);
    onRefresh?.();
  }, [bankAccountId, selectedTransactionIds, onRefresh]);

  const filteredGroups = useMemo(() => {
    if (!run) return [];
    if (chip === "all") return run.groups;
    return run.groups.filter((g) => g.category === chip);
  }, [run, chip]);

  const summaryItems = run
    ? [
        { label: "Scanned", value: String(run.summary.scanned) },
        { label: "Exact", value: String(run.summary.exact), accent: run.summary.exact > 0 },
        { label: "Suggested", value: String(run.summary.suggested) },
        { label: "Multiple", value: String(run.summary.multiple) },
        { label: "No Match", value: String(run.summary.noMatch) },
        { label: "Pending Review", value: String(run.summary.pendingReview) },
        { label: "Matched Amount", value: formatMoney(run.summary.totalMatchedAmount) },
        { label: "Unmatched Amount", value: formatMoney(run.summary.totalUnmatchedAmount), warn: run.summary.totalUnmatchedAmount > 0 },
      ]
    : [];

  const handleBulkAccept = () => {
    const ids = Array.from(selectedExact);
    if (!ids.length) return;
    const result = bulkAcceptExactMatches({ bankAccountId, statementTransactionIds: ids });
    setToast(`Accepted ${result.accepted} exact match(es)${result.failed ? `, ${result.failed} failed` : ""}`);
    setRun(loadMatchRun(bankAccountId));
    setSelectedExact(new Set());
    onRefresh?.();
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
          onClick={handleRun}
          disabled={running}
        >
          {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          Run Auto Match
        </Button>
        <Button type="button" size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => setConfigOpen(true)}>
          <Settings2 className="w-3.5 h-3.5" />
          Configuration
        </Button>
        {selectedExact.size > 0 && (
          <Button type="button" size="sm" className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleBulkAccept}>
            <Check className="w-3.5 h-3.5" />
            Accept Selected Exact ({selectedExact.size})
          </Button>
        )}
        {running && progress ? (
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" /> {progress}
          </span>
        ) : null}
      </div>

      {run ? (
        <>
          <AccountsSummaryCards items={summaryItems} columns={4} className="px-0" />
          <div className="grid grid-cols-2 gap-2 text-[11px] px-0.5">
            <div className="rounded-lg border border-border px-2.5 py-1.5 bg-muted/20">
              Deposits matched: <span className="font-semibold">{formatMoney(run.summary.depositMatched)}</span>
            </div>
            <div className="rounded-lg border border-border px-2.5 py-1.5 bg-muted/20">
              Withdrawals matched: <span className="font-semibold">{formatMoney(run.summary.withdrawalMatched)}</span>
            </div>
          </div>
        </>
      ) : (
        <p className="text-xs text-muted-foreground px-1">Run auto match to compare statement lines with book transactions and vouchers.</p>
      )}

      <div className="flex flex-wrap gap-1">
        {QUICK_CHIPS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setChip(c.id)}
            className={cn(
              "h-6 px-2 text-[11px] rounded-md border font-medium",
              chip === c.id ? "bg-brand-50 border-brand-200 text-brand-700" : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
        <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
          <p className="text-xs font-semibold text-foreground">Match Results</p>
          <p className="text-[11px] text-muted-foreground">{filteredGroups.length} items</p>
        </div>
        {!run || filteredGroups.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No match results in this category.</p>
        ) : (
          filteredGroups.map((g) => (
            <MatchRow
              key={g.statementTransactionId}
              group={g}
              selected={selectedExact.has(g.statementTransactionId)}
              onSelect={(checked) => {
                setSelectedExact((prev) => {
                  const next = new Set(prev);
                  if (checked) next.add(g.statementTransactionId);
                  else next.delete(g.statementTransactionId);
                  return next;
                });
              }}
              onReview={() => setReviewGroup(g)}
            />
          ))
        )}
      </div>

      <BankReconMatchReviewSheet
        bankAccountId={bankAccountId}
        group={reviewGroup}
        open={Boolean(reviewGroup)}
        onClose={() => setReviewGroup(null)}
        onAccepted={() => {
          setRun(loadMatchRun(bankAccountId));
          setReviewGroup(null);
          onRefresh?.();
        }}
        onFindAnother={(id) => {
          setReviewGroup(null);
          setFindStatementId(id);
        }}
        onReject={(statementId, bookTargetId, reason) => {
          rejectMatch({ bankAccountId, statementTransactionId: statementId, bookTargetId, reason });
          setRun(loadMatchRun(bankAccountId));
          onRefresh?.();
        }}
      />

      <BankReconFindMatchSheet
        bankAccountId={bankAccountId}
        statementTransactionId={findStatementId}
        open={Boolean(findStatementId)}
        onClose={() => setFindStatementId(null)}
        onAccepted={() => {
          setRun(loadMatchRun(bankAccountId));
          setFindStatementId(null);
          onRefresh?.();
        }}
      />

      <BankReconMatchConfigPanel bankAccountId={bankAccountId} open={configOpen} onClose={() => setConfigOpen(false)} />

      {toast ? (
        <div className="fixed bottom-5 right-5 z-[400] flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl bg-emerald-600 text-white text-sm font-medium">
          {toast}
          <button type="button" onClick={() => setToast(null)}><X className="w-4 h-4" /></button>
        </div>
      ) : null}
    </div>
  );
}
