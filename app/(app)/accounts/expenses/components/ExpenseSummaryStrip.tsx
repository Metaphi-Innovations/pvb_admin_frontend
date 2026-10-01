"use client";

import { formatINR } from "../expense-utils";

export function ExpenseSummaryStrip({
  total,
  approved,
  paid,
  pending,
}: {
  total: number;
  approved: number;
  paid: number;
  pending: number;
}) {
  const items = [
    { label: "Total Expense", value: total },
    { label: "Approved", value: approved },
    { label: "Paid", value: paid },
    { label: "Pending", value: pending },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 px-3 py-2 bg-muted/20 border border-border/50 rounded-lg text-xs">
      {items.map((item, i) => (
        <span key={item.label} className="inline-flex items-center gap-2">
          {i > 0 && <span className="text-border hidden sm:inline">|</span>}
          <span className="text-muted-foreground">{item.label}</span>
          <span className="font-semibold text-foreground tabular-nums">{formatINR(item.value)}</span>
        </span>
      ))}
    </div>
  );
}
