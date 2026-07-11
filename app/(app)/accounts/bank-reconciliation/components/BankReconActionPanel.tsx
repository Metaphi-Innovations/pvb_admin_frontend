"use client";

import React, { useMemo, useState } from "react";
import { Check, Search, Tag } from "lucide-react";
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
import { formatMoney, formatMoneyOrDash } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import { acceptMatch, findAlternativeMatches } from "@/lib/accounts/bank-recon-match-service";
import { getBankReconTransactionById, type BankReconTransactionRecord } from "@/lib/accounts/bank-recon-register";
import { BankReconMatchStatusBadge } from "./BankReconBadges";
import { BankReconCategorizePanel } from "./BankReconCategorizePanel";
import { BankReconAddTransactionPanel } from "./BankReconAddTransactionPanel";

export type BankReconActionTab = "match" | "categorise" | "add";

const VOUCHER_TYPE_FILTERS = [
  { value: "", label: "All Types" },
  { value: "Receipt", label: "Receipt Voucher" },
  { value: "Payment", label: "Payment Voucher" },
  { value: "Contra", label: "Contra Voucher" },
  { value: "Journal", label: "Journal Voucher" },
  { value: "Sales Invoice", label: "Sales Invoice Receipt" },
  { value: "Purchase Invoice", label: "Purchase Invoice Payment" },
];

function MatchTab({
  bankAccountId,
  transaction,
  onMatched,
  onSwitchToCategorise,
}: {
  bankAccountId: string;
  transaction: BankReconTransactionRecord;
  onMatched: () => void;
  onSwitchToCategorise: () => void;
}) {
  const [search, setSearch] = useState("");
  const [voucherType, setVoucherType] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const stmtAmount = transaction.deposit || transaction.withdrawal;

  const candidates = useMemo(
    () =>
      findAlternativeMatches({
        bankAccountId,
        statementTransactionId: transaction.id,
        search,
        voucherType: voucherType || undefined,
      }),
    [bankAccountId, transaction.id, search, voucherType],
  );

  const selected = candidates.find((c) => c.id === selectedId);
  const difference =
    selected != null
      ? Math.abs(stmtAmount - (selected.bookTarget.deposit || selected.bookTarget.withdrawal))
      : null;

  const handleMatch = (reconcile = false) => {
    if (!selected) return;
    const result = acceptMatch({
      bankAccountId,
      statementTransactionId: transaction.id,
      candidate: selected,
      matchMethod: "Manual Selected",
    });
    if (result.ok) {
      if (reconcile) {
        // Mark as reconciled via match link — status updates via register refresh
      }
      onMatched();
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-shrink-0 space-y-2 pb-2 border-b border-border/60">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2 top-2.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs pl-8"
            placeholder="Search voucher, party, reference…"
          />
        </div>
        <Select value={voucherType || "__all__"} onValueChange={(v) => setVoucherType(v === "__all__" ? "" : v)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VOUCHER_TYPE_FILTERS.map((f) => (
              <SelectItem key={f.value || "__all__"} value={f.value || "__all__"} className="text-xs">
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto mt-2">
        {candidates.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            No matching accounting entries found.
          </p>
        ) : (
          <div className="space-y-1">
            {candidates.map((c) => {
              const bookAmt = c.bookTarget.deposit || c.bookTarget.withdrawal;
              const diff = Math.abs(stmtAmount - bookAmt);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={cn(
                    "w-full text-left rounded-lg border px-2.5 py-2 transition-colors",
                    selectedId === c.id
                      ? "border-brand-400 bg-brand-50/60"
                      : "border-border/60 hover:bg-muted/20",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-brand-700">{c.bookTarget.voucherNo}</span>
                    <span className="text-[10px] text-muted-foreground">{c.bookTarget.voucherType}</span>
                  </div>
                  <p className="text-[11px] text-foreground mt-0.5 truncate">{c.bookTarget.partyLedger}</p>
                  <div className="flex items-center justify-between mt-1 text-[11px]">
                    <span className="text-muted-foreground">{c.bookTarget.bookDate}</span>
                    <span className="font-semibold tabular-nums">{formatMoney(bookAmt)}</span>
                  </div>
                  {diff > 0.009 && (
                    <p className="text-[10px] text-amber-700 mt-0.5">Diff: {formatMoney(diff)}</p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex-shrink-0 pt-2 border-t border-border/60 space-y-1.5 mt-2">
        {selected && difference != null && difference > 0.009 && (
          <p className="text-[11px] text-amber-700">
            Amount difference: {formatMoney(difference)}
          </p>
        )}
        <div className="flex flex-wrap gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[11px] flex-1"
            disabled={!selected}
            onClick={() => handleMatch(false)}
          >
            <Check className="w-3 h-3 mr-1" />
            Match
          </Button>
          <Button
            size="sm"
            className="h-7 text-[11px] flex-1 bg-brand-600 hover:bg-brand-700 text-white"
            disabled={!selected}
            onClick={() => handleMatch(true)}
          >
            Match & Reconcile
          </Button>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-[11px] w-full text-brand-700"
          onClick={onSwitchToCategorise}
        >
          <Tag className="w-3 h-3 mr-1" />
          Categorise instead
        </Button>
      </div>
    </div>
  );
}

export function BankReconActionPanel({
  bankAccountId,
  transactionId,
  activeTab,
  onTabChange,
  onActionComplete,
}: {
  bankAccountId: string;
  transactionId: string | null;
  activeTab: BankReconActionTab;
  onTabChange: (tab: BankReconActionTab) => void;
  onActionComplete: () => void;
}) {
  const transaction = transactionId ? getBankReconTransactionById(transactionId) : null;

  const tabs: { id: BankReconActionTab; label: string }[] = [
    { id: "match", label: "Match" },
    { id: "categorise", label: "Categorise" },
    { id: "add", label: "Add Transaction" },
  ];

  if (!transaction) {
    return (
      <div className="flex flex-col h-full border-l border-border bg-muted/10">
        <div className="px-3 py-2 border-b border-border/60 bg-white">
          <p className="text-xs font-semibold text-foreground">Accounting Action</p>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            Select a bank statement transaction to match, categorise, or add an accounting entry.
          </p>
        </div>
      </div>
    );
  }

  const stmtAmount = transaction.deposit || transaction.withdrawal;

  return (
    <div className="flex flex-col h-full border-l border-border bg-white w-[400px] flex-shrink-0">
      <div className="flex-shrink-0 px-3 py-2 border-b border-border/60 space-y-2">
        <p className="text-xs font-semibold text-foreground">Accounting Action</p>
        <div className="rounded-lg border border-border/60 bg-muted/15 px-2.5 py-2 text-[11px] space-y-0.5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-brand-700 truncate">
              {transaction.reference || transaction.chequeNo || transaction.utrNumber || "—"}
            </span>
            <BankReconMatchStatusBadge status={transaction.matchStatus} />
          </div>
          <p className="line-clamp-2 text-muted-foreground leading-snug">{transaction.narration}</p>
          <div className="flex items-center justify-between pt-0.5">
            <span>{transaction.statementDate}</span>
            <span className="font-semibold tabular-nums">{formatMoney(stmtAmount)}</span>
          </div>
        </div>
        <div className="flex gap-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex-1 h-7 text-[11px] font-medium rounded-md transition-colors",
                activeTab === tab.id
                  ? "bg-brand-600 text-white"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden p-3">
        {activeTab === "match" && (
          <MatchTab
            bankAccountId={bankAccountId}
            transaction={transaction}
            onMatched={onActionComplete}
            onSwitchToCategorise={() => onTabChange("categorise")}
          />
        )}
        {activeTab === "categorise" && (
          <BankReconCategorizePanel
            transaction={transaction}
            onSaved={onActionComplete}
          />
        )}
        {activeTab === "add" && (
          <BankReconAddTransactionPanel
            bankAccountId={bankAccountId}
            transaction={transaction}
            onSaved={onActionComplete}
          />
        )}
      </div>
    </div>
  );
}
