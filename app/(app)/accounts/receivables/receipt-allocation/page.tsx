"use client";

import { useMemo, useState } from "react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { StatusBadge, SectionTabs } from "@/app/(app)/accounts/components/AccountsUI";
import { loadReceiptAllocations } from "@/lib/accounts/accounts-mock-data";
import { formatMoney } from "@/lib/accounts/money-format";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function ReceiptAllocationPage() {
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const records = loadReceiptAllocations();

  const rows = useMemo(() => {
    let list = records;
    if (tab !== "all") list = list.filter((r) => r.status === tab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) => r.receiptNo.toLowerCase().includes(q) || r.customer.toLowerCase().includes(q),
      );
    }
    return list;
  }, [records, tab, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: records.length };
    for (const r of records) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [records]);

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Receivables", "Receipt Allocation")}
      title="Receipt Allocation"
      description="Allocate receipt vouchers against customer invoices and open receivables."
      filters={
        <div className="space-y-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input className="h-8 text-xs pl-8" placeholder="Search receipt, customer..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <SectionTabs
            tabs={[
              { id: "all", label: "All" },
              { id: "draft", label: "Draft" },
              { id: "approved", label: "Approved" },
              { id: "posted", label: "Posted" },
            ]}
            active={tab}
            onChange={setTab}
            counts={counts}
          />
        </div>
      }
      layout="split"
    >
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full text-table">
          <thead className="bg-muted/20 border-b border-border/60 sticky top-0">
            <tr>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase text-muted-foreground">Receipt No.</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase text-muted-foreground">Date</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase text-muted-foreground">Customer</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase text-muted-foreground">Receipt</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase text-muted-foreground">Allocated</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase text-muted-foreground">Unallocated</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/40 hover:bg-muted/20">
                <td className="px-4 py-2.5 text-xs font-mono font-semibold">{r.receiptNo}</td>
                <td className="px-4 py-2.5 text-xs">{r.date}</td>
                <td className="px-4 py-2.5 text-xs">{r.customer}</td>
                <td className="px-4 py-2.5 text-xs text-right tabular-nums">{formatMoney(r.receiptAmount)}</td>
                <td className="px-4 py-2.5 text-xs text-right tabular-nums">{formatMoney(r.allocated)}</td>
                <td className="px-4 py-2.5 text-xs text-right tabular-nums">{formatMoney(r.unallocated)}</td>
                <td className="px-4 py-2.5"><StatusBadge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AccountsPageShell>
  );
}
