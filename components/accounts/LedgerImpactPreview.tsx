"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/accounts/money-format";

export interface LedgerImpactLine {
  ledger: string;
  debit?: number;
  credit?: number;
  note?: string;
}

export function LedgerImpactPreview({
  title = "Ledger Impact Preview",
  lines,
  className,
}: {
  title?: string;
  lines: LedgerImpactLine[];
  className?: string;
}) {
  if (!lines.length) return null;

  return (
    <div className={cn("bg-white rounded-lg border border-border/60 p-4 space-y-3", className)}>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Preview of accounting entries when this document is posted. No actual posting until you
        confirm.
      </p>
      <div className="overflow-x-auto rounded-md border border-border/50">
        <table className="w-full text-xs min-w-[320px]">
          <thead>
            <tr className="border-b border-border/60 bg-muted/20">
              <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Ledger</th>
              <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Debit</th>
              <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Credit</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => (
              <tr key={`${line.ledger}-${i}`} className="border-b border-border/30 last:border-0">
                <td className="px-3 py-2">
                  <span className="font-medium text-foreground">{line.ledger}</span>
                  {line.note ? (
                    <span className="block text-[10px] text-muted-foreground mt-0.5">{line.note}</span>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-emerald-800">
                  {line.debit && line.debit > 0 ? formatMoney(line.debit) : "—"}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-red-700">
                  {line.credit && line.credit > 0 ? formatMoney(line.credit) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
