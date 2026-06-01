"use client";

import React, { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  FileText, Plus, Download, Search, SlidersHorizontal, X,
  MoreVertical, ChevronDown, ChevronsUpDown, Eye, Edit, Trash2,
  CheckCircle2, Clock, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Invoice {
  id: number;
  invoiceNo: string;
  soRef: string;
  customer: string;
  amount: number;
  paid: number;
  status: "draft" | "sent" | "paid" | "partial" | "overdue";
  invoiceDate: string;
  dueDate: string;
  territory: string;
}

const SEED: Invoice[] = [
  { id: 1, invoiceNo: "INV-2024-001", soRef: "SO-2024-001", customer: "Green Valley Agro", amount: 125000, paid: 125000, status: "paid", invoiceDate: "2024-01-17", dueDate: "2024-02-16", territory: "North Zone" },
  { id: 2, invoiceNo: "INV-2024-002", soRef: "SO-2024-003", customer: "Farmtech Solutions", amount: 234000, paid: 100000, status: "partial", invoiceDate: "2024-01-21", dueDate: "2024-02-20", territory: "East Zone" },
  { id: 3, invoiceNo: "INV-2024-003", soRef: "SO-2024-005", customer: "Sunrise Crops", amount: 189000, paid: 189000, status: "paid", invoiceDate: "2024-01-15", dueDate: "2024-02-14", territory: "North Zone" },
  { id: 4, invoiceNo: "INV-2024-004", soRef: "SO-2024-007", customer: "BioGrow Agro", amount: 310000, paid: 0, status: "sent", invoiceDate: "2024-01-23", dueDate: "2024-02-22", territory: "South Zone" },
  { id: 5, invoiceNo: "INV-2024-005", soRef: "SO-2024-009", customer: "CropCare India", amount: 445000, paid: 200000, status: "overdue", invoiceDate: "2024-01-12", dueDate: "2024-02-11", territory: "West Zone" },
  { id: 6, invoiceNo: "INV-2024-006", soRef: "SO-2024-002", customer: "Kisan Fertilizers Ltd", amount: 78500, paid: 0, status: "draft", invoiceDate: "2024-01-19", dueDate: "2024-02-18", territory: "South Zone" },
  { id: 7, invoiceNo: "INV-2024-007", soRef: "SO-2024-008", customer: "Fertile Lands Ltd", amount: 67500, paid: 67500, status: "paid", invoiceDate: "2024-01-24", dueDate: "2024-02-23", territory: "East Zone" },
];

const STATUS_CFG = {
  draft:   { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
  sent:    { bg: "bg-blue-50",   text: "text-blue-700",  dot: "bg-blue-500"  },
  paid:    { bg: "bg-emerald-50",text: "text-emerald-700",dot:"bg-emerald-500"},
  partial: { bg: "bg-amber-50",  text: "text-amber-700", dot: "bg-amber-400" },
  overdue: { bg: "bg-red-50",    text: "text-red-700",   dot: "bg-red-400"   },
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CFG[status as keyof typeof STATUS_CFG] ?? STATUS_CFG.draft;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium", cfg.bg, cfg.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function SortTh({ label, colKey, sortKey, sortDir, onSort }: {
  label: string; colKey: string; sortKey: string; sortDir: "asc" | "desc"; onSort: (k: string) => void;
}) {
  const active = sortKey === colKey;
  return (
    <th onClick={() => onSort(colKey)} className={cn("px-4 py-3 text-left text-xs font-semibold cursor-pointer select-none group whitespace-nowrap", active && "bg-brand-50/60")}>
      <div className="flex items-center gap-1.5">
        <span className={active ? "text-brand-700" : "text-foreground"}>{label}</span>
        {active ? <ChevronDown className={cn("w-3 h-3 text-brand-600 transition-transform", sortDir === "desc" && "rotate-180")} />
          : <ChevronsUpDown className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground" />}
      </div>
    </th>
  );
}

export default function InvoicesPage() {
  const [invoices] = useState<Invoice[]>(SEED);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortKey, setSortKey] = useState("invoiceDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [openMenu, setOpenMenu] = useState<number | null>(null);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };
  const toggleStatus = (s: string) => setFilterStatus(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);

  const filtered = useMemo(() => {
    let d = invoices.filter(i => {
      const q = search.toLowerCase();
      return !q || i.invoiceNo.toLowerCase().includes(q) || i.customer.toLowerCase().includes(q);
    });
    if (filterStatus.length) d = d.filter(i => filterStatus.includes(i.status));
    return [...d].sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sortKey];
      const bv = (b as unknown as Record<string, unknown>)[sortKey];
      const cmp = String(av ?? "").localeCompare(String(bv ?? ""), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [invoices, search, filterStatus, sortKey, sortDir]);

  const totalAmount = invoices.reduce((s, i) => s + i.amount, 0);
  const totalPaid = invoices.reduce((s, i) => s + i.paid, 0);
  const totalOutstanding = totalAmount - totalPaid;

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Invoices</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Customer invoices and payment tracking</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="h-8 px-3 text-xs border border-border rounded-lg inline-flex items-center gap-1.5 font-medium text-muted-foreground hover:bg-muted transition-colors">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <button className="h-8 px-3 text-xs rounded-lg inline-flex items-center gap-1.5 font-medium bg-brand-600 hover:bg-brand-700 text-white transition-colors">
              <Plus className="w-3.5 h-3.5" /> New Invoice
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total Invoiced", value: `₹${(totalAmount / 100000).toFixed(1)}L`, icon: FileText, accent: true },
            { label: "Total Collected", value: `₹${(totalPaid / 100000).toFixed(1)}L`, icon: CheckCircle2 },
            { label: "Outstanding", value: `₹${(totalOutstanding / 100000).toFixed(1)}L`, icon: Clock },
            { label: "Overdue", value: invoices.filter(i => i.status === "overdue").length, icon: AlertCircle },
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

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-[9px] text-muted-foreground pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoices, customers…"
              className="w-full h-8 pl-8 pr-3 text-xs border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-300" />
          </div>
          <div className="relative">
            <button onClick={() => setFilterOpen(p => !p)}
              className={cn("h-8 px-2.5 text-xs border rounded-lg inline-flex items-center gap-1.5 font-medium transition-colors",
                filterStatus.length ? "border-brand-400 bg-brand-50 text-brand-700" : "border-border text-muted-foreground hover:bg-muted")}>
              <SlidersHorizontal className="w-3.5 h-3.5" /> Filter
              {filterStatus.length > 0 && <span className="w-4 h-4 text-[10px] bg-brand-600 text-white rounded-full inline-flex items-center justify-center font-bold">{filterStatus.length}</span>}
            </button>
            {filterOpen && (
              <div className="absolute top-9 left-0 z-50 bg-white border border-border rounded-xl shadow-lg w-52 p-0">
                <div className="px-3 py-2.5 border-b border-border"><p className="text-xs font-semibold">Filter by Status</p></div>
                <div className="px-3 py-2.5 space-y-2">
                  {Object.keys(STATUS_CFG).map(s => (
                    <label key={s} className="flex items-center gap-2.5 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded accent-brand-600" checked={filterStatus.includes(s)} onChange={() => toggleStatus(s)} />
                      <span className="text-xs capitalize">{s}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          {filterStatus.map(s => (
            <span key={s} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium">
              {s} <button onClick={() => toggleStatus(s)}><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>

        <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <SortTh label="Invoice No" colKey="invoiceNo" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Customer" colKey="customer" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="SO Ref" colKey="soRef" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Amount" colKey="amount" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Paid" colKey="paid" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Status" colKey="status" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Due Date" colKey="dueDate" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-2.5 w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => (
                  <tr key={inv.id} className="border-b border-border/60 hover:bg-muted/20 transition-colors group">
                    <td className="px-4 py-2"><span className="font-mono text-xs font-semibold text-brand-700">{inv.invoiceNo}</span></td>
                    <td className="px-4 py-2"><p className="text-xs font-semibold text-foreground">{inv.customer}</p><p className="text-[11px] text-muted-foreground">{inv.territory}</p></td>
                    <td className="px-4 py-2"><span className="font-mono text-xs text-muted-foreground">{inv.soRef}</span></td>
                    <td className="px-4 py-2 text-xs font-semibold">₹{inv.amount.toLocaleString()}</td>
                    <td className="px-4 py-2 text-xs text-emerald-700 font-medium">₹{inv.paid.toLocaleString()}</td>
                    <td className="px-4 py-2"><StatusPill status={inv.status} /></td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{inv.dueDate}</td>
                    <td className="px-4 py-2">
                      <div className="relative flex justify-end">
                        <button onClick={() => setOpenMenu(openMenu === inv.id ? null : inv.id)}
                          className="p-1.5 hover:bg-muted rounded-md transition-colors opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto">
                          <MoreVertical className="w-4 h-4 text-muted-foreground" />
                        </button>
                        {openMenu === inv.id && (
                          <div className="absolute right-0 top-7 z-50 bg-white border border-border rounded-xl shadow-lg w-40 py-1">
                            <button className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-muted"><Eye className="w-3.5 h-3.5 text-muted-foreground" /> View</button>
                            <button className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-muted"><Edit className="w-3.5 h-3.5 text-muted-foreground" /> Edit</button>
                            <div className="border-t border-border my-1" />
                            <button className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
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
            <p className="text-[11px] text-muted-foreground">Showing <span className="font-medium text-foreground">{filtered.length}</span> of <span className="font-medium text-foreground">{invoices.length}</span> invoices</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
