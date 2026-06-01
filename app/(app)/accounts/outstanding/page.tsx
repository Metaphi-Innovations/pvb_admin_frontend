"use client";

import React, { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AlertCircle, Download, Search, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface OutstandingItem {
  id: number;
  party: string;
  partyType: "customer" | "vendor";
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string;
  originalAmount: number;
  paidAmount: number;
  outstanding: number;
  agingDays: number;
  territory: string;
}

const SEED: OutstandingItem[] = [
  { id: 1, party: "Farmtech Solutions", partyType: "customer", invoiceNo: "INV-2024-002", invoiceDate: "2024-01-21", dueDate: "2024-02-20", originalAmount: 234000, paidAmount: 100000, outstanding: 134000, agingDays: 5, territory: "East Zone" },
  { id: 2, party: "CropCare India", partyType: "customer", invoiceNo: "INV-2024-005", invoiceDate: "2024-01-12", dueDate: "2024-02-11", originalAmount: 445000, paidAmount: 200000, outstanding: 245000, agingDays: 14, territory: "West Zone" },
  { id: 3, party: "BioGrow Agro", partyType: "customer", invoiceNo: "INV-2024-004", invoiceDate: "2024-01-23", dueDate: "2024-02-22", originalAmount: 310000, paidAmount: 0, outstanding: 310000, agingDays: 3, territory: "South Zone" },
  { id: 4, party: "Kisan Fertilizers Ltd", partyType: "customer", invoiceNo: "INV-2024-006", invoiceDate: "2024-01-19", dueDate: "2024-02-18", originalAmount: 78500, paidAmount: 0, outstanding: 78500, agingDays: 7, territory: "South Zone" },
  { id: 5, party: "AgriSupplies Ltd", partyType: "vendor", invoiceNo: "BILL-2024-001", invoiceDate: "2024-01-10", dueDate: "2024-02-09", originalAmount: 85000, paidAmount: 0, outstanding: 85000, agingDays: 16, territory: "HQ" },
  { id: 6, party: "SeedsTech Pvt Ltd", partyType: "vendor", invoiceNo: "BILL-2024-003", invoiceDate: "2024-01-18", dueDate: "2024-02-17", originalAmount: 124000, paidAmount: 50000, outstanding: 74000, agingDays: 8, territory: "HQ" },
  { id: 7, party: "Rural Inputs Co.", partyType: "customer", invoiceNo: "INV-2023-048", invoiceDate: "2023-12-15", dueDate: "2024-01-14", originalAmount: 92000, paidAmount: 30000, outstanding: 62000, agingDays: 42, territory: "Central Zone" },
];

function AgingBadge({ days }: { days: number }) {
  const cfg = days > 30 ? "bg-red-100 text-red-700" : days > 15 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700";
  return <span className={cn("text-[11px] px-2 py-0.5 rounded-full font-semibold", cfg)}>{days}d</span>;
}

function SortTh({ label, colKey, sortKey, sortDir, onSort }: {
  label: string; colKey: string; sortKey: string; sortDir: "asc" | "desc"; onSort: (k: string) => void;
}) {
  const active = sortKey === colKey;
  return (
    <th onClick={() => onSort(colKey)} className={cn("px-4 py-3 text-left text-xs font-semibold cursor-pointer select-none group whitespace-nowrap", active && "bg-brand-50/60")}>
      <div className="flex items-center gap-1.5">
        <span className={active ? "text-brand-700" : "text-foreground"}>{label}</span>
        {active ? <ChevronDown className={cn("w-3 h-3 text-brand-600", sortDir === "desc" && "rotate-180")} />
          : <ChevronsUpDown className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground" />}
      </div>
    </th>
  );
}

export default function OutstandingPage() {
  const [items] = useState<OutstandingItem[]>(SEED);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "customer" | "vendor">("all");
  const [sortKey, setSortKey] = useState("agingDays");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filtered = useMemo(() => {
    let d = items.filter(i => {
      const q = search.toLowerCase();
      const matchQ = !q || i.party.toLowerCase().includes(q) || i.invoiceNo.toLowerCase().includes(q);
      const matchTab = activeTab === "all" || i.partyType === activeTab;
      return matchQ && matchTab;
    });
    return [...d].sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sortKey];
      const bv = (b as unknown as Record<string, unknown>)[sortKey];
      const cmp = String(av ?? "").localeCompare(String(bv ?? ""), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [items, search, activeTab, sortKey, sortDir]);

  const totalOutstanding = items.reduce((s, i) => s + i.outstanding, 0);
  const custOutstanding = items.filter(i => i.partyType === "customer").reduce((s, i) => s + i.outstanding, 0);
  const vendOutstanding = items.filter(i => i.partyType === "vendor").reduce((s, i) => s + i.outstanding, 0);
  const overdue = items.filter(i => i.agingDays > 30).length;

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Outstanding</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Receivables and payables aging report</p>
          </div>
          <button className="h-8 px-3 text-xs border border-border rounded-lg inline-flex items-center gap-1.5 font-medium text-muted-foreground hover:bg-muted transition-colors">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total Outstanding", value: `₹${(totalOutstanding / 100000).toFixed(1)}L`, color: "bg-brand-600" },
            { label: "Receivables", value: `₹${(custOutstanding / 100000).toFixed(1)}L`, color: "bg-emerald-600" },
            { label: "Payables", value: `₹${(vendOutstanding / 100000).toFixed(1)}L`, color: "bg-red-500" },
            { label: "Overdue (>30d)", value: overdue, color: "bg-amber-500" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-border p-3 flex items-center gap-3">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", color)}>
                <AlertCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-base font-bold text-foreground leading-none">{value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-[9px] text-muted-foreground pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search party or invoice…"
              className="w-full h-8 pl-8 pr-3 text-xs border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-300" />
          </div>
          <div className="flex items-center gap-1.5">
            {(["all", "customer", "vendor"] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={cn("h-7 px-3 text-xs rounded-lg border transition-colors font-medium capitalize",
                  activeTab === t ? "bg-brand-600 text-white border-brand-600" : "border-border text-muted-foreground hover:bg-muted")}>
                {t === "all" ? "All" : t === "customer" ? "Receivables" : "Payables"}
              </button>
            ))}
          </div>
        </div>

        <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <SortTh label="Party" colKey="party" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Type" colKey="partyType" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Invoice No" colKey="invoiceNo" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Invoice Amt" colKey="originalAmount" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Paid" colKey="paidAmount" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Outstanding" colKey="outstanding" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Due Date" colKey="dueDate" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Aging" colKey="agingDays" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                </tr>
              </thead>
              <tbody>
                {filtered.map(i => (
                  <tr key={i.id} className={cn("border-b border-border/60 hover:bg-muted/20 transition-colors", i.agingDays > 30 && "bg-red-50/30")}>
                    <td className="px-4 py-2"><p className="text-xs font-semibold text-foreground">{i.party}</p><p className="text-[11px] text-muted-foreground">{i.territory}</p></td>
                    <td className="px-4 py-2">
                      <span className={cn("text-[11px] px-2 py-0.5 rounded-full font-semibold capitalize",
                        i.partyType === "customer" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
                        {i.partyType === "customer" ? "Receivable" : "Payable"}
                      </span>
                    </td>
                    <td className="px-4 py-2"><span className="font-mono text-xs text-brand-700">{i.invoiceNo}</span></td>
                    <td className="px-4 py-2 text-xs text-foreground">₹{i.originalAmount.toLocaleString()}</td>
                    <td className="px-4 py-2 text-xs text-emerald-700">₹{i.paidAmount.toLocaleString()}</td>
                    <td className="px-4 py-2 text-xs font-semibold text-red-600">₹{i.outstanding.toLocaleString()}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{i.dueDate}</td>
                    <td className="px-4 py-2"><AgingBadge days={i.agingDays} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-border bg-muted/20">
            <p className="text-[11px] text-muted-foreground">Showing <span className="font-medium text-foreground">{filtered.length}</span> of <span className="font-medium text-foreground">{items.length}</span> items</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
