"use client";

import React, { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { FileText, Plus, Download, Search, MoreVertical, Eye, Edit, Trash2, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Voucher {
  id: number;
  voucherNo: string;
  type: "journal" | "payment" | "receipt" | "contra";
  date: string;
  amount: number;
  narration: string;
  status: "draft" | "posted";
  createdBy: string;
}

const SEED: Voucher[] = [
  { id: 1, voucherNo: "JV-2024-001", type: "journal", date: "2024-01-02", amount: 125000, narration: "Sales booking - Green Valley Agro", status: "posted", createdBy: "Mohan Verma" },
  { id: 2, voucherNo: "PV-2024-001", type: "payment", date: "2024-01-05", amount: 85000, narration: "Payment to AgriSupplies Ltd", status: "posted", createdBy: "Mohan Verma" },
  { id: 3, voucherNo: "RV-2024-001", type: "receipt", date: "2024-01-08", amount: 100000, narration: "Receipt from Farmtech Solutions", status: "posted", createdBy: "Mohan Verma" },
  { id: 4, voucherNo: "PV-2024-002", type: "payment", date: "2024-01-10", amount: 250000, narration: "January salary disbursement", status: "posted", createdBy: "Mohan Verma" },
  { id: 5, voucherNo: "JV-2024-002", type: "journal", date: "2024-01-12", amount: 310000, narration: "Sales booking - BioGrow Agro", status: "posted", createdBy: "Mohan Verma" },
  { id: 6, voucherNo: "CV-2024-001", type: "contra", date: "2024-01-15", amount: 50000, narration: "Cash to bank transfer", status: "posted", createdBy: "Mohan Verma" },
  { id: 7, voucherNo: "RV-2024-002", type: "receipt", date: "2024-01-18", amount: 200000, narration: "Receipt from CropCare India", status: "draft", createdBy: "Mohan Verma" },
  { id: 8, voucherNo: "PV-2024-003", type: "payment", date: "2024-01-20", amount: 45000, narration: "Office rent January 2024", status: "draft", createdBy: "Mohan Verma" },
];

const TYPE_COLORS: Record<string, string> = {
  journal: "bg-purple-100 text-purple-700",
  payment: "bg-red-100 text-red-700",
  receipt: "bg-emerald-100 text-emerald-700",
  contra:  "bg-amber-100 text-amber-700",
};

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

export default function VouchersPage() {
  const [vouchers] = useState<Voucher[]>(SEED);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [openMenu, setOpenMenu] = useState<number | null>(null);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filtered = useMemo(() => {
    let d = vouchers.filter(v => {
      const q = search.toLowerCase();
      return !q || v.voucherNo.toLowerCase().includes(q) || v.narration.toLowerCase().includes(q);
    });
    return [...d].sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sortKey];
      const bv = (b as unknown as Record<string, unknown>)[sortKey];
      const cmp = String(av ?? "").localeCompare(String(bv ?? ""), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [vouchers, search, sortKey, sortDir]);

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Vouchers</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Journal, payment, receipt, and contra vouchers</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="h-8 px-3 text-xs border border-border rounded-lg inline-flex items-center gap-1.5 font-medium text-muted-foreground hover:bg-muted transition-colors">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <button className="h-8 px-3 text-xs rounded-lg inline-flex items-center gap-1.5 font-medium bg-brand-600 hover:bg-brand-700 text-white transition-colors">
              <Plus className="w-3.5 h-3.5" /> New Voucher
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total", value: vouchers.length, color: "bg-brand-600" },
            { label: "Journal", value: vouchers.filter(v => v.type === "journal").length, color: "bg-purple-500" },
            { label: "Payment", value: vouchers.filter(v => v.type === "payment").length, color: "bg-red-500" },
            { label: "Receipt", value: vouchers.filter(v => v.type === "receipt").length, color: "bg-emerald-500" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-border p-3 flex items-center gap-3">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", color)}>
                <FileText className="w-4 h-4 text-white" />
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
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vouchers…"
              className="w-full h-8 pl-8 pr-3 text-xs border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-300" />
          </div>
        </div>

        <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <SortTh label="Voucher No" colKey="voucherNo" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Type" colKey="type" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Date" colKey="date" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Amount" colKey="amount" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground">Narration</th>
                  <SortTh label="Status" colKey="status" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-2.5 w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => (
                  <tr key={v.id} className="border-b border-border/60 hover:bg-muted/20 transition-colors group">
                    <td className="px-4 py-2"><span className="font-mono text-xs font-semibold text-brand-700">{v.voucherNo}</span></td>
                    <td className="px-4 py-2">
                      <span className={cn("text-[11px] px-2 py-0.5 rounded-full font-semibold capitalize", TYPE_COLORS[v.type])}>
                        {v.type}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{v.date}</td>
                    <td className="px-4 py-2 text-xs font-semibold text-foreground">₹{v.amount.toLocaleString()}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground max-w-[200px] truncate">{v.narration}</td>
                    <td className="px-4 py-2">
                      <span className={cn("inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium",
                        v.status === "posted" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600")}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", v.status === "posted" ? "bg-emerald-500" : "bg-slate-400")} />
                        {v.status.charAt(0).toUpperCase() + v.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="relative flex justify-end">
                        <button onClick={() => setOpenMenu(openMenu === v.id ? null : v.id)}
                          className="p-1.5 hover:bg-muted rounded-md opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all">
                          <MoreVertical className="w-4 h-4 text-muted-foreground" />
                        </button>
                        {openMenu === v.id && (
                          <div className="absolute right-0 top-7 z-50 bg-white border border-border rounded-xl shadow-lg w-40 py-1">
                            <button className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-muted"><Eye className="w-3.5 h-3.5 text-muted-foreground" /> View</button>
                            {v.status === "draft" && <button className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-muted"><Edit className="w-3.5 h-3.5 text-muted-foreground" /> Edit</button>}
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
            <p className="text-[11px] text-muted-foreground">Showing <span className="font-medium text-foreground">{filtered.length}</span> of <span className="font-medium text-foreground">{vouchers.length}</span> vouchers</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
