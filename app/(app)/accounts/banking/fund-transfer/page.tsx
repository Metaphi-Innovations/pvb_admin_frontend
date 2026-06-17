"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { StatusBadge, SectionTabs } from "@/app/(app)/accounts/components/AccountsUI";
import { loadFundTransfers } from "@/lib/accounts/accounts-mock-data";
import { formatMoney } from "@/lib/accounts/money-format";
import { Input } from "@/components/ui/input";

export default function FundTransferPage() {
  const [tab, setTab] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const records = loadFundTransfers();

  const rows = useMemo(() => {
    let list = records;
    if (tab !== "all") list = list.filter((r) => r.status === tab);
    if (dateFrom) list = list.filter((r) => r.date >= dateFrom);
    if (dateTo) list = list.filter((r) => r.date <= dateTo);
    return list;
  }, [records, tab, dateFrom, dateTo]);

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Banking", "Fund Transfer")}
      title="Fund Transfer"
      description="Transfers between bank and cash accounts via contra vouchers."
      actions={
        <Button size="sm" className="h-8 text-xs bg-brand-600 text-white gap-1">
          <Plus className="w-3.5 h-3.5" /> New Transfer
        </Button>
      }
      filters={
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <Input type="date" className="h-8 text-xs w-36" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <Input type="date" className="h-8 text-xs w-36" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <SectionTabs
            tabs={[
              { id: "all", label: "All" },
              { id: "draft", label: "Draft" },
              { id: "posted", label: "Posted" },
              { id: "cancelled", label: "Cancelled" },
            ]}
            active={tab}
            onChange={setTab}
          />
        </div>
      }
      layout="split"
    >
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full text-table">
          <thead className="bg-muted/20 border-b border-border/60 sticky top-0">
            <tr>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase text-muted-foreground">Reference</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase text-muted-foreground">Date</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase text-muted-foreground">From</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase text-muted-foreground">To</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase text-muted-foreground">Amount</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/40 hover:bg-muted/20">
                <td className="px-4 py-2.5 text-xs font-mono font-semibold">{r.reference}</td>
                <td className="px-4 py-2.5 text-xs">{r.date}</td>
                <td className="px-4 py-2.5 text-xs">{r.fromAccount}</td>
                <td className="px-4 py-2.5 text-xs">{r.toAccount}</td>
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
