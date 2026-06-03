"use client";

import React, { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { Ledger, loadLedgers, nextId, saveLedgers } from "../../data";
import { SortTh, StatusBadge, SectionTabs } from "../../components/AccountsUI";

export default function LedgersPage() {
  const [records, setRecords] = useState<Ledger[]>(loadLedgers());
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [sortKey, setSortKey] = useState("ledgerCode");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    ledgerName: "",
    ledgerCode: "",
    accountType: "Asset" as Ledger["accountType"],
    linkedAccount: "",
    openingBalance: "0",
    balanceType: "Debit" as Ledger["balanceType"],
    status: "active" as Ledger["status"],
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
      r = r.filter((x) => x.ledgerCode.toLowerCase().includes(q) || x.ledgerName.toLowerCase().includes(q));
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
    if (!form.ledgerName.trim() || !form.ledgerCode.trim()) return;
    const opening = Number(form.openingBalance) || 0;
    const next: Ledger = {
      id: nextId(records),
      ledgerName: form.ledgerName,
      ledgerCode: form.ledgerCode,
      accountType: form.accountType,
      linkedAccount: form.linkedAccount,
      openingBalance: opening,
      balanceType: form.balanceType,
      currentBalance: opening,
      status: form.status,
      createdBy: "Admin",
      updatedBy: "Admin",
    };
    const list = [...records, next];
    saveLedgers(list);
    setRecords(list);
    setShowForm(false);
  };

  return (
    <AppLayout>
      <div className="max-w-[1400px] mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Ledgers</h1>
          <Button className="h-9 text-sm bg-brand-600 text-white" onClick={() => setShowForm((v) => !v)}>
            <Plus className="w-4 h-4 mr-1" /> Add Ledger
          </Button>
        </div>

        {showForm && (
          <div className="bg-white border border-border/60 rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input className="h-9 text-sm" placeholder="Ledger Name" value={form.ledgerName} onChange={(e) => setForm((f) => ({ ...f, ledgerName: e.target.value }))} />
            <Input className="h-9 text-sm" placeholder="Ledger Code" value={form.ledgerCode} onChange={(e) => setForm((f) => ({ ...f, ledgerCode: e.target.value.toUpperCase() }))} />
            <Input className="h-9 text-sm" placeholder="Linked Account / Group" value={form.linkedAccount} onChange={(e) => setForm((f) => ({ ...f, linkedAccount: e.target.value }))} />
            <select className="h-9 text-sm border border-border/70 rounded-md px-2" value={form.accountType} onChange={(e) => setForm((f) => ({ ...f, accountType: e.target.value as Ledger["accountType"] }))}>
              {["Asset", "Liability", "Income", "Expense", "Equity"].map((t) => <option key={t}>{t}</option>)}
            </select>
            <Input className="h-9 text-sm" placeholder="Opening Balance" type="number" value={form.openingBalance} onChange={(e) => setForm((f) => ({ ...f, openingBalance: e.target.value }))} />
            <select className="h-9 text-sm border border-border/70 rounded-md px-2" value={form.balanceType} onChange={(e) => setForm((f) => ({ ...f, balanceType: e.target.value as Ledger["balanceType"] }))}>
              <option>Debit</option>
              <option>Credit</option>
            </select>
            <div className="md:col-span-3 flex justify-end gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" className="h-8 text-xs bg-brand-600 text-white" onClick={createRecord}>Save</Button>
            </div>
          </div>
        )}

        <SectionTabs tabs={[{ id: "all", label: "All" }, { id: "active", label: "Active" }, { id: "inactive", label: "Inactive" }]} active={tab} onChange={setTab} counts={counts} />

        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="h-9 pl-9 text-sm" placeholder="Search ledgers" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="bg-white border border-border/60 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-muted/20 border-b border-border/60">
                <tr>
                  <SortTh label="Ledger Name" colKey="ledgerName" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Ledger Code" colKey="ledgerCode" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Account Type" colKey="accountType" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">Opening Balance</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">Current Balance</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">Status</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">Created By</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">Updated By</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id} className="border-b border-border/40 last:border-0 h-11">
                    <td className="px-3 py-2 text-xs">{r.ledgerName}</td>
                    <td className="px-3 py-2 text-xs font-mono">{r.ledgerCode}</td>
                    <td className="px-3 py-2 text-xs">{r.accountType}</td>
                    <td className="px-3 py-2 text-xs">{r.openingBalance.toFixed(2)} {r.balanceType}</td>
                    <td className="px-3 py-2 text-xs font-medium">{r.currentBalance.toFixed(2)}</td>
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
