"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { StatusBadge, SectionTabs } from "@/app/(app)/accounts/components/AccountsUI";
import { loadInventoryAdjustments } from "@/lib/accounts/accounts-mock-data";
import { formatMoney } from "@/lib/accounts/money-format";

export default function InventoryAdjustmentsPage() {
  const [tab, setTab] = useState("all");
  const records = loadInventoryAdjustments();

  const rows = useMemo(() => {
    if (tab === "all") return records;
    return records.filter((r) => r.status === tab);
  }, [records, tab]);

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Transactions", "Inventory Adjustments")}
      title="Inventory Adjustments"
      description="Stock adjustments from warehouse — UI preview with mock posting status."
      actions={
        <Button size="sm" className="h-8 text-xs bg-brand-600 text-white gap-1">
          <Plus className="w-3.5 h-3.5" /> New Adjustment
        </Button>
      }
      filters={
        <SectionTabs
          tabs={[
            { id: "all", label: "All" },
            { id: "draft", label: "Draft" },
            { id: "approved", label: "Approved" },
            { id: "posted", label: "Posted" },
          ]}
          active={tab}
          onChange={setTab}
        />
      }
      layout="split"
    >
      <div className="flex-1 overflow-auto min-h-0">
        <table className="accounts-table w-full text-table">
          <thead className="border-b border-border/60">
            <tr>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase text-muted-foreground">Adjustment No.</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase text-muted-foreground">Date</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase text-muted-foreground">Warehouse</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase text-muted-foreground">Type</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase text-muted-foreground">Value</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/40 hover:bg-muted/20">
                <td className="px-4 py-2.5 text-xs font-mono font-semibold">{r.adjustmentNo}</td>
                <td className="px-4 py-2.5 text-xs">{r.date}</td>
                <td className="px-4 py-2.5 text-xs">{r.warehouse}</td>
                <td className="px-4 py-2.5 text-xs">{r.type}</td>
                <td className="px-4 py-2.5 text-xs text-right tabular-nums">{formatMoney(r.amount)}</td>
                <td className="px-4 py-2.5"><StatusBadge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AccountsPageShell>
  );
}
