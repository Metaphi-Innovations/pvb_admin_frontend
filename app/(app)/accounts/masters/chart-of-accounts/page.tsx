"use client";

import React, { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { AccountType, ChartOfAccount, loadChartOfAccounts, nextId, saveChartOfAccounts } from "../../data";
import { SortTh, StatusBadge, SectionTabs } from "../../components/AccountsUI";

const TYPES: AccountType[] = ["Asset", "Liability", "Income", "Expense", "Equity"];

export default function ChartOfAccountsPage() {
  const [records, setRecords] = useState<ChartOfAccount[]>(loadChartOfAccounts());
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [sortKey, setSortKey] = useState("accountCode");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    accountCode: "",
    accountName: "",
    accountType: "Asset" as AccountType,
    parentAccount: "",
    description: "",
    status: "active" as "active" | "inactive",
  });

  const counts = useMemo(
    () => ({
      all: records.length,
      active: records.filter((x) => x.status === "active").length,
      inactive: records.filter((x) => x.status === "inactive").length,
    }),
    [records],
  );

  const visible = useMemo(() => {
    let r = [...records];
    if (tab !== "all") r = r.filter((x) => x.status === tab);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((x) => x.accountCode.toLowerCase().includes(q) || x.accountName.toLowerCase().includes(q));
    }
    return r.sort((a, b) => {
      const av = String((a as unknown as Record<string, unknown>)[sortKey] ?? "");
      const bv = String((b as unknown as Record<string, unknown>)[sortKey] ?? "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [records, tab, search, sortKey, sortDir]);

  const handleSort = (k: string) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  };

  const createRecord = () => {
    if (!form.accountCode.trim() || !form.accountName.trim()) return;
    const next: ChartOfAccount = {
      id: nextId(records),
      ...form,
      createdBy: "Admin",
      updatedBy: "Admin",
    };
    const list = [...records, next];
    saveChartOfAccounts(list);
    setRecords(list);
    setShowForm(false);
    setForm({ accountCode: "", accountName: "", accountType: "Asset", parentAccount: "", description: "", status: "active" });
  };

  return (
    <AppLayout>
      <div className="max-w-[1400px] mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Chart of Accounts</h1>
          <Button className="h-9 text-sm bg-brand-600 text-white" onClick={() => setShowForm((v) => !v)}>
            <Plus className="w-4 h-4 mr-1" /> Add Account
          </Button>
        </div>

        {showForm && (
          <div className="bg-white border border-border/60 rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input className="h-9 text-sm" placeholder="Account Code" value={form.accountCode} onChange={(e) => setForm((f) => ({ ...f, accountCode: e.target.value }))} />
            <Input className="h-9 text-sm" placeholder="Account Name" value={form.accountName} onChange={(e) => setForm((f) => ({ ...f, accountName: e.target.value }))} />
            <select className="h-9 text-sm border border-border/70 rounded-md px-2" value={form.accountType} onChange={(e) => setForm((f) => ({ ...f, accountType: e.target.value as AccountType }))}>
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
            <Input className="h-9 text-sm" placeholder="Parent Account" value={form.parentAccount} onChange={(e) => setForm((f) => ({ ...f, parentAccount: e.target.value }))} />
            <Input className="h-9 text-sm md:col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            <div className="md:col-span-3 flex justify-end gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" className="h-8 text-xs bg-brand-600 text-white" onClick={createRecord}>Save</Button>
            </div>
          </div>
        )}

        <SectionTabs tabs={[{ id: "all", label: "All" }, { id: "active", label: "Active" }, { id: "inactive", label: "Inactive" }]} active={tab} onChange={setTab} counts={counts} />

        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="h-9 pl-9 text-sm" placeholder="Search account code or name" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="bg-white border border-border/60 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-muted/20 border-b border-border/60">
                <tr>
                  <SortTh label="Account Code" colKey="accountCode" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Account Name" colKey="accountName" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Account Type" colKey="accountType" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">Parent Account</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">Description</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">Status</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">Created By</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">Updated By</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id} className="border-b border-border/40 last:border-0 h-11">
                    <td className="px-3 py-2 text-xs font-mono">{r.accountCode}</td>
                    <td className="px-3 py-2 text-xs">{r.accountName}</td>
                    <td className="px-3 py-2 text-xs">{r.accountType}</td>
                    <td className="px-3 py-2 text-xs">{r.parentAccount || "—"}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{r.description || "—"}</td>
                    <td className="px-3 py-2"><StatusBadge status={r.status} /></td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{r.createdBy}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{r.updatedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
