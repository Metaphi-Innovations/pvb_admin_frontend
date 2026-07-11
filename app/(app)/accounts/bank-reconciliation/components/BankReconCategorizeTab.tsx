"use client";

import React, { useMemo, useState } from "react";
import { Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import { loadBankReconTransactions, type BankReconTransactionRecord } from "@/lib/accounts/bank-recon-register";
import { canCategorizeTransaction } from "@/lib/accounts/bank-recon-categorize-service";
import { BankReconMatchStatusBadge, BankReconSourceBadge } from "./BankReconBadges";
import { BankReconCategorizeSheet } from "./BankReconCategorizeSheet";

interface BankReconCategorizeTabProps {
  bankAccountId: string;
  onRefresh?: () => void;
  registerTick?: number;
}

export function BankReconCategorizeTab({ bankAccountId, onRefresh, registerTick }: BankReconCategorizeTabProps) {
  const [selected, setSelected] = useState<BankReconTransactionRecord | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const rows = useMemo(() => {
    void registerTick;
    return loadBankReconTransactions(bankAccountId).filter(canCategorizeTransaction);
  }, [bankAccountId, registerTick]);

  const openCategorize = (txn: BankReconTransactionRecord) => {
    setSelected(txn);
    setSheetOpen(true);
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-foreground">Uncategorized & Pending Transactions</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Categorize unmatched lines to create receipt, payment, contra or journal vouchers.
          </p>
        </div>
        <span className="text-[11px] text-muted-foreground">{rows.length} eligible</span>
      </div>

      <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-10">No transactions pending categorization.</p>
        ) : (
          rows.map((txn) => {
            const amt = txn.deposit || txn.withdrawal;
            const isDeposit = txn.deposit > 0;
            return (
              <div
                key={txn.id}
                className="flex items-start gap-2 px-3 py-2 border-b border-border/60 hover:bg-muted/20 text-xs"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{txn.reference || txn.chequeNo || "No reference"}</p>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">{txn.narration}</p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <span className="text-[11px] text-muted-foreground">{txn.statementDate}</span>
                    <BankReconSourceBadge source={txn.source} />
                    <BankReconMatchStatusBadge status={txn.matchStatus} />
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={cn("font-semibold tabular-nums", isDeposit ? "text-emerald-700" : "text-red-700")}>
                    {isDeposit ? "+" : "−"}{formatMoney(amt)}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px] gap-1 px-2"
                    onClick={() => openCategorize(txn)}
                  >
                    <Tag className="w-3 h-3" />
                    Categorize
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <BankReconCategorizeSheet
        transaction={selected}
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          setSelected(null);
        }}
        onSaved={() => {
          onRefresh?.();
        }}
      />
    </div>
  );
}
