"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { StatusBadge, SectionTabs } from "@/app/(app)/accounts/components/AccountsUI";
import { loadPaymentRuns } from "@/lib/accounts/accounts-mock-data";
import { formatMoney } from "@/lib/accounts/money-format";

export default function PaymentRunsPage() {
  const [tab, setTab] = useState("all");
  const records = loadPaymentRuns();

  const rows = useMemo(() => {
    if (tab === "all") return records;
    return records.filter((r) => r.status === tab);
  }, [records, tab]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: records.length };
    for (const r of records) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [records]);

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Payables", "Payment Runs")}
      title="Payment Runs"
      description="Batch vendor and employee claim payments for approval and execution."
      actions={
        <Button size="sm" className="h-8 text-xs bg-brand-600 text-white gap-1">
          <Plus className="w-3.5 h-3.5" /> New Payment Run
        </Button>
      }
      filters={
        <SectionTabs
          tabs={[
            { id: "all", label: "All" },
            { id: "draft", label: "Draft" },
            { id: "approved", label: "Approved" },
            { id: "paid", label: "Paid" },
            { id: "cancelled", label: "Cancelled" },
          ]}
          active={tab}
          onChange={setTab}
          counts={counts}
        />
      }
      layout="split"
    >
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full text-table">
          <thead className="bg-muted/20 border-b border-border/60 sticky top-0">
            <tr>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase text-muted-foreground">Run No.</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase text-muted-foreground">Date</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase text-muted-foreground">Branch</th>
              <th className="px-4 py-2.5 text-center text-[10px] font-semibold uppercase text-muted-foreground">Payees</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase text-muted-foreground">Total</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/40 hover:bg-muted/20">
                <td className="px-4 py-2.5 text-xs font-mono font-semibold">{r.runNo}</td>
                <td className="px-4 py-2.5 text-xs">{r.date}</td>
                <td className="px-4 py-2.5 text-xs">{r.branch}</td>
                <td className="px-4 py-2.5 text-xs text-center">{r.payeeCount}</td>
                <td className="px-4 py-2.5 text-xs text-right tabular-nums">{formatMoney(r.totalAmount)}</td>
                <td className="px-4 py-2.5"><StatusBadge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AccountsPageShell>
  );
}
