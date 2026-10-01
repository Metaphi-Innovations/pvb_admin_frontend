"use client";

import React, { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Wallet, Plus, Download, Search, MoreVertical, ChevronDown, ChevronsUpDown, Eye, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Collection {
  id: number;
  collectionNo: string;
  invoiceRef: string;
  customer: string;
  amount: number;
  mode: "cash" | "cheque" | "upi" | "neft" | "rtgs";
  status: "pending" | "cleared" | "bounced";
  collectionDate: string;
  clearedDate: string;
  collectedBy: string;
  territory: string;
}

const SEED: Collection[] = [
  { id: 1, collectionNo: "COL-2024-001", invoiceRef: "INV-2024-001", customer: "Green Valley Agro", amount: 125000, mode: "neft", status: "cleared", collectionDate: "2024-01-20", clearedDate: "2024-01-21", collectedBy: "Rajesh Kumar", territory: "North Zone" },
  { id: 2, collectionNo: "COL-2024-002", invoiceRef: "INV-2024-003", customer: "Sunrise Crops", amount: 189000, mode: "rtgs", status: "cleared", collectionDate: "2024-01-18", clearedDate: "2024-01-18", collectedBy: "Rajesh Kumar", territory: "North Zone" },
  { id: 3, collectionNo: "COL-2024-003", invoiceRef: "INV-2024-002", customer: "Farmtech Solutions", amount: 100000, mode: "cheque", status: "pending", collectionDate: "2024-01-25", clearedDate: "-", collectedBy: "Amit Sharma", territory: "East Zone" },
  { id: 4, collectionNo: "COL-2024-004", invoiceRef: "INV-2024-005", customer: "CropCare India", amount: 200000, mode: "upi", status: "cleared", collectionDate: "2024-01-22", clearedDate: "2024-01-22", collectedBy: "Neha Patel", territory: "West Zone" },
  { id: 5, collectionNo: "COL-2024-005", invoiceRef: "INV-2024-007", customer: "Fertile Lands Ltd", amount: 67500, mode: "cash", status: "cleared", collectionDate: "2024-01-25", clearedDate: "2024-01-25", collectedBy: "Amit Sharma", territory: "East Zone" },
  { id: 6, collectionNo: "COL-2024-006", invoiceRef: "INV-2024-002", customer: "Farmtech Solutions", amount: 50000, mode: "cheque", status: "bounced", collectionDate: "2024-01-15", clearedDate: "-", collectedBy: "Amit Sharma", territory: "East Zone" },
];

const STATUS_CFG = {
  pending: { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-400"   },
  cleared: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  bounced: { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-400"     },
};

const MODE_COLORS: Record<string, string> = {
  cash: "bg-green-100 text-green-700",
  cheque: "bg-purple-100 text-purple-700",
  upi: "bg-blue-100 text-blue-700",
  neft: "bg-sky-100 text-sky-700",
  rtgs: "bg-indigo-100 text-indigo-700",
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CFG[status as keyof typeof STATUS_CFG] ?? STATUS_CFG.pending;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium", cfg.bg, cfg.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function CollectionsPage() {
  const [collections] = useState<Collection[]>(SEED);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("collectionDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [openMenu, setOpenMenu] = useState<number | null>(null);

  const filtered = useMemo(() => {
    let d = collections.filter(c => {
      const q = search.toLowerCase();
      return !q || c.collectionNo.toLowerCase().includes(q) || c.customer.toLowerCase().includes(q);
    });
    return [...d].sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sortKey];
      const bv = (b as unknown as Record<string, unknown>)[sortKey];
      const cmp = String(av ?? "").localeCompare(String(bv ?? ""), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [collections, search, sortKey, sortDir]);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  function SortTh({ label, colKey }: { label: string; colKey: string }) {
    const active = sortKey === colKey;
    return (
      <th onClick={() => handleSort(colKey)} className={cn("px-4 py-3 text-left text-xs font-semibold cursor-pointer select-none group whitespace-nowrap", active && "bg-brand-50/60")}>
        <div className="flex items-center gap-1.5">
          <span className={active ? "text-brand-700" : "text-foreground"}>{label}</span>
          {active ? <ChevronDown className={cn("w-3 h-3 text-brand-600", sortDir === "desc" && "rotate-180")} />
            : <ChevronsUpDown className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground" />}
        </div>
      </th>
    );
  }

  const totalCleared = collections.filter(c => c.status === "cleared").reduce((s, c) => s + c.amount, 0);
  const totalPending = collections.filter(c => c.status === "pending").reduce((s, c) => s + c.amount, 0);

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Collections</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Track payment collections from customers</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="h-8 px-3 text-xs border border-border rounded-lg inline-flex items-center gap-1.5 font-medium text-muted-foreground hover:bg-muted transition-colors">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <button className="h-8 px-3 text-xs rounded-lg inline-flex items-center gap-1.5 font-medium bg-brand-600 hover:bg-brand-700 text-white transition-colors">
              <Plus className="w-3.5 h-3.5" /> Record Collection
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total Collections", value: collections.length, icon: Wallet, accent: true },
            { label: "Cleared", value: `₹${(totalCleared / 100000).toFixed(1)}L`, icon: CheckCircle2 },
            { label: "Pending", value: `₹${(totalPending / 1000).toFixed(0)}K`, icon: Clock },
            { label: "Bounced", value: collections.filter(c => c.status === "bounced").length, icon: TrendingUp },
          ].map(({ label, value, icon: Icon, accent }) => (
            <div key={label} className="bg-white rounded-xl border border-border p-3 flex items-center gap-3">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", accent ? "bg-brand-600" : "bg-muted")}>
                <Icon className={cn("w-4 h-4", accent ? "text-white" : "text-muted-foreground")} />
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
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search collections, customers…"
              className="w-full h-8 pl-8 pr-3 text-xs border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-300" />
          </div>
        </div>

        <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <SortTh label="Collection No" colKey="collectionNo" />
                  <SortTh label="Customer" colKey="customer" />
                  <SortTh label="Invoice Ref" colKey="invoiceRef" />
                  <SortTh label="Amount" colKey="amount" />
                  <SortTh label="Mode" colKey="mode" />
                  <SortTh label="Status" colKey="status" />
                  <SortTh label="Date" colKey="collectionDate" />
                  <SortTh label="Collected By" colKey="collectedBy" />
                  <th className="px-4 py-2.5 w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} className="border-b border-border/60 hover:bg-muted/20 transition-colors group">
                    <td className="px-4 py-2"><span className="font-mono text-xs font-semibold text-brand-700">{c.collectionNo}</span></td>
                    <td className="px-4 py-2"><p className="text-xs font-semibold text-foreground">{c.customer}</p><p className="text-[11px] text-muted-foreground">{c.territory}</p></td>
                    <td className="px-4 py-2"><span className="font-mono text-xs text-muted-foreground">{c.invoiceRef}</span></td>
                    <td className="px-4 py-2 text-xs font-semibold text-foreground">₹{c.amount.toLocaleString()}</td>
                    <td className="px-4 py-2">
                      <span className={cn("text-[11px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide", MODE_COLORS[c.mode])}>
                        {c.mode}
                      </span>
                    </td>
                    <td className="px-4 py-2"><StatusPill status={c.status} /></td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{c.collectionDate}</td>
                    <td className="px-4 py-2 text-xs text-foreground">{c.collectedBy}</td>
                    <td className="px-4 py-2">
                      <div className="relative flex justify-end">
                        <button onClick={() => setOpenMenu(openMenu === c.id ? null : c.id)}
                          className="p-1.5 hover:bg-muted rounded-md transition-colors opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto">
                          <MoreVertical className="w-4 h-4 text-muted-foreground" />
                        </button>
                        {openMenu === c.id && (
                          <div className="absolute right-0 top-7 z-50 bg-white border border-border rounded-xl shadow-lg w-36 py-1">
                            <button className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-muted"><Eye className="w-3.5 h-3.5 text-muted-foreground" /> View</button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-border bg-muted/20">
            <p className="text-[11px] text-muted-foreground">Showing <span className="font-medium text-foreground">{filtered.length}</span> of <span className="font-medium text-foreground">{collections.length}</span> records</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
