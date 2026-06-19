"use client";

import { useMemo, useState } from "react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { StatusBadge, SectionTabs } from "@/app/(app)/accounts/components/AccountsUI";
import { loadCollectionRecords } from "@/lib/accounts/accounts-mock-data";
import { formatMoney } from "@/lib/accounts/money-format";

export default function CollectionTrackingPage() {
  const [tab, setTab] = useState("all");
  const records = loadCollectionRecords();

  const rows = useMemo(() => {
    if (tab === "all") return records;
    return records.filter((r) => r.status === tab);
  }, [records, tab]);

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Receivables", "Collection Tracking")}
      title="Collection Tracking"
      description="Track collections against customer invoices and outstanding balances."
      filters={
        <SectionTabs
          tabs={[
            { id: "all", label: "All" },
            { id: "open", label: "Open" },
            { id: "partial", label: "Partial" },
            { id: "closed", label: "Closed" },
          ]}
          active={tab}
          onChange={setTab}
        />
      }
      layout="split"
    >
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full text-table">
          <thead className="bg-muted/20 border-b border-border/60 sticky top-0">
            <tr>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase text-muted-foreground">Customer</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase text-muted-foreground">Invoice</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase text-muted-foreground">Due Date</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase text-muted-foreground">Outstanding</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase text-muted-foreground">Collected</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/40 hover:bg-muted/20">
                <td className="px-4 py-2.5 text-xs font-medium">{r.customer}</td>
                <td className="px-4 py-2.5 text-xs font-mono">{r.invoiceNo}</td>
                <td className="px-4 py-2.5 text-xs">{r.dueDate}</td>
                <td className="px-4 py-2.5 text-xs text-right tabular-nums">{formatMoney(r.outstanding)}</td>
                <td className="px-4 py-2.5 text-xs text-right tabular-nums">{formatMoney(r.collected)}</td>
                <td className="px-4 py-2.5"><StatusBadge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AccountsPageShell>
  );
}
