"use client";

import React from "react";
import { formatMoney, formatMoneyOrDash } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import type { AccountingPreviewLine } from "@/lib/accounts/bank-recon-categorize-types";

export function BankReconAccountingPreview({ lines }: { lines: AccountingPreviewLine[] }) {
  if (lines.length === 0) {
    return (
      <p className="text-[11px] text-muted-foreground px-1">Select category and ledger to preview accounting entries.</p>
    );
  }

  const totalDr = lines.reduce((s, l) => s + l.debit, 0);
  const totalCr = lines.reduce((s, l) => s + l.credit, 0);
  const balanced = Math.abs(totalDr - totalCr) <= 0.009;

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="px-3 py-2 bg-muted/30 border-b border-border">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Accounting Preview</p>
      </div>
      <div className="divide-y divide-border/60">
        {lines.map((line, i) => (
          <div key={i} className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs">
            <div className="min-w-0">
              <p className="font-medium truncate">{line.ledgerName}</p>
              {line.note ? <p className="text-[10px] text-muted-foreground">{line.note}</p> : null}
            </div>
            <div className="flex gap-3 shrink-0 tabular-nums">
              <span className={cn("w-20 text-right", line.debit > 0 && "text-emerald-700 font-semibold")}>
                {line.debit > 0 ? formatMoney(line.debit) : "—"}
              </span>
              <span className={cn("w-20 text-right", line.credit > 0 && "text-red-700 font-semibold")}>
                {line.credit > 0 ? formatMoney(line.credit) : "—"}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted/20 text-[11px]">
        <span className="text-muted-foreground">Total Dr / Cr</span>
        <div className="flex gap-3 tabular-nums font-semibold">
          <span className="w-20 text-right text-emerald-700">{formatMoneyOrDash(totalDr)}</span>
          <span className="w-20 text-right text-red-700">{formatMoneyOrDash(totalCr)}</span>
        </div>
      </div>
      {!balanced ? (
        <p className="text-xs text-red-600 px-3 py-2 border-t border-red-100 bg-red-50">Preview is not balanced.</p>
      ) : null}
    </div>
  );
}
