"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { getBalanceSheet } from "../../data";

export default function BalanceSheetPage() {
  const bs = getBalanceSheet();
  return (
    <AppLayout>
      <div className="max-w-[900px] mx-auto space-y-4">
        <h1 className="text-lg font-semibold">Balance Sheet</h1>
        <div className="bg-white border border-border/60 rounded-lg p-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Assets</span><span>{bs.assets.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Liabilities</span><span>{bs.liabilities.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Equity</span><span>{bs.equity.toFixed(2)}</span></div>
        </div>
      </div>
    </AppLayout>
  );
}
