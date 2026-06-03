"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { getPandL } from "../../data";

export default function PLPage() {
  const pl = getPandL();
  return (
    <AppLayout>
      <div className="max-w-[900px] mx-auto space-y-4">
        <h1 className="text-lg font-semibold">P&amp;L</h1>
        <div className="bg-white border border-border/60 rounded-lg p-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Income</span><span>{pl.income.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Expenses</span><span>{pl.expense.toFixed(2)}</span></div>
          <div className="border-t border-border/60 pt-2 flex justify-between font-semibold">
            <span>Net Profit / Loss</span>
            <span className={pl.net >= 0 ? "text-emerald-700" : "text-red-700"}>{pl.net.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
