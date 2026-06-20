"use client";

import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/accounts/money-format";

export interface JournalImpactRow {
  ledger: string;
  debit?: number;
  credit?: number;
  note?: string;
}

export function JournalLedgerImpactPreview({
  lines,
  totalDebit,
  totalCredit,
  balanced,
  className,
}: {
  lines: JournalImpactRow[];
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
  className?: string;
}) {
  const debitLines = lines.filter((l) => (l.debit ?? 0) > 0);
  const creditLines = lines.filter((l) => (l.credit ?? 0) > 0);

  if (!lines.length) return null;

  return (
    <div className={cn("bg-white rounded-lg border border-border/60 p-4 space-y-4", className)}>
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Ledger Impact Preview
        </h2>
        <p className="text-[11px] text-muted-foreground mt-1">
          Accounting entries when this journal is posted. Draft saves do not post to the ledger.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-md border border-border/50 overflow-hidden">
          <div className="px-3 py-2 bg-muted/25 border-b border-border/50">
            <p className="text-[10px] font-semibold uppercase text-muted-foreground">Debit Side</p>
          </div>
          <div className="divide-y divide-border/30">
            {debitLines.length === 0 ? (
              <p className="px-3 py-4 text-xs text-muted-foreground">—</p>
            ) : (
              debitLines.map((line, i) => (
                <div key={`d-${line.ledger}-${i}`} className="px-3 py-2 text-xs">
                  <p className="font-medium">{line.ledger}</p>
                  <p className="tabular-nums text-emerald-800 font-semibold mt-0.5">
                    {formatMoney(line.debit ?? 0)}
                  </p>
                  {line.note ? (
                    <p className="text-[10px] text-muted-foreground mt-0.5">{line.note}</p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-md border border-border/50 overflow-hidden">
          <div className="px-3 py-2 bg-muted/25 border-b border-border/50">
            <p className="text-[10px] font-semibold uppercase text-muted-foreground">Credit Side</p>
          </div>
          <div className="divide-y divide-border/30">
            {creditLines.length === 0 ? (
              <p className="px-3 py-4 text-xs text-muted-foreground">—</p>
            ) : (
              creditLines.map((line, i) => (
                <div key={`c-${line.ledger}-${i}`} className="px-3 py-2 text-xs">
                  <p className="font-medium">{line.ledger}</p>
                  <p className="tabular-nums text-red-700 font-semibold mt-0.5">
                    {formatMoney(line.credit ?? 0)}
                  </p>
                  {line.note ? (
                    <p className="text-[10px] text-muted-foreground mt-0.5">{line.note}</p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div
        className={cn(
          "text-xs font-medium pt-2 border-t border-border/40",
          balanced ? "text-emerald-700" : "text-red-600",
        )}
      >
        {balanced
          ? `Total Debit = Total Credit (${formatMoney(totalDebit)})`
          : `Difference = ${formatMoney(Math.abs(totalDebit - totalCredit))}`}
      </div>
    </div>
  );
}
