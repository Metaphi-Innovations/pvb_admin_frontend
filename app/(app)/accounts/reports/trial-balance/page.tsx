"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { getTrialBalanceRows } from "../../data";

export default function TrialBalancePage() {
  const rows = getTrialBalanceRows();
  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto space-y-4">
        <h1 className="text-lg font-semibold">Trial Balance</h1>
        <div className="bg-white border border-border/60 rounded-lg overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-muted/20 border-b border-border/60">
              <tr>
                <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">Ledger</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">Opening Balance</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">Debit</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">Credit</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">Closing Balance</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.ledger} className="border-b border-border/40 last:border-0 h-11">
                  <td className="px-3 py-2 text-xs">{r.ledger}</td>
                  <td className="px-3 py-2 text-xs">{r.opening.toFixed(2)}</td>
                  <td className="px-3 py-2 text-xs">{r.debit.toFixed(2)}</td>
                  <td className="px-3 py-2 text-xs">{r.credit.toFixed(2)}</td>
                  <td className="px-3 py-2 text-xs font-semibold">{r.closing.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
