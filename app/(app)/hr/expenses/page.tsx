"use client";

import React, { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Receipt, Plus, Download, Search, MoreVertical, Eye, Check, X, Clock, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExpenseClaim {
  id: number;
  claimNo: string;
  empCode: string;
  name: string;
  department: string;
  category: "travel" | "accommodation" | "food" | "communication" | "misc";
  amount: number;
  description: string;
  status: "pending" | "approved" | "rejected" | "paid";
  submittedOn: string;
  approvedBy: string;
  claimDate: string;
}

const SEED: ExpenseClaim[] = [
  { id: 1, claimNo: "EXP-001", empCode: "EMP-001", name: "Rajesh Kumar", department: "Sales", category: "travel", amount: 4500, description: "Travel to Delhi client meeting", status: "approved", submittedOn: "2024-01-20", approvedBy: "Sunita Rao", claimDate: "2024-01-18" },
  { id: 2, claimNo: "EXP-002", empCode: "EMP-002", name: "Priya Singh", department: "Sales", category: "accommodation", amount: 3200, description: "Hotel stay - Hyderabad visit", status: "paid", submittedOn: "2024-01-18", approvedBy: "Sunita Rao", claimDate: "2024-01-15" },
  { id: 3, claimNo: "EXP-003", empCode: "EMP-003", name: "Amit Sharma", department: "Sales", category: "food", amount: 1800, description: "Client lunch meetings", status: "pending", submittedOn: "2024-01-24", approvedBy: "-", claimDate: "2024-01-22" },
  { id: 4, claimNo: "EXP-004", empCode: "EMP-004", name: "Neha Patel", department: "Sales", category: "travel", amount: 6700, description: "Field visits - West Zone", status: "approved", submittedOn: "2024-01-22", approvedBy: "Sunita Rao", claimDate: "2024-01-20" },
  { id: 5, claimNo: "EXP-005", empCode: "EMP-005", name: "Vikram Das", department: "Sales", category: "misc", amount: 2100, description: "Office supplies for field", status: "rejected", submittedOn: "2024-01-19", approvedBy: "Sunita Rao", claimDate: "2024-01-17" },
  { id: 6, claimNo: "EXP-006", empCode: "EMP-001", name: "Rajesh Kumar", department: "Sales", category: "travel", amount: 3800, description: "Train tickets for North Zone tour", status: "pending", submittedOn: "2024-01-25", approvedBy: "-", claimDate: "2024-01-24" },
];

const STATUS_CFG = {
  pending:  { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-400"   },
  approved: { bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-500"    },
  rejected: { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-400"     },
  paid:     { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
};

const CAT_COLORS: Record<string, string> = {
  travel:        "bg-blue-100 text-blue-700",
  accommodation: "bg-purple-100 text-purple-700",
  food:          "bg-amber-100 text-amber-700",
  communication: "bg-sky-100 text-sky-700",
  misc:          "bg-slate-100 text-slate-600",
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

export default function ExpensesPage() {
  const [claims] = useState<ExpenseClaim[]>(SEED);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [openMenu, setOpenMenu] = useState<number | null>(null);

  const filtered = useMemo(() => {
    let d = claims.filter(c => {
      const q = search.toLowerCase();
      return !q || c.name.toLowerCase().includes(q) || c.claimNo.toLowerCase().includes(q);
    });
    if (filterStatus.length) d = d.filter(c => filterStatus.includes(c.status));
    return d;
  }, [claims, search, filterStatus]);

  const totalAmount = claims.reduce((s, c) => s + c.amount, 0);
  const approvedAmount = claims.filter(c => c.status === "approved" || c.status === "paid").reduce((s, c) => s + c.amount, 0);

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Expense Claims</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Employee expense reimbursements</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="h-8 px-3 text-xs border border-border rounded-lg inline-flex items-center gap-1.5 font-medium text-muted-foreground hover:bg-muted transition-colors">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <button className="h-8 px-3 text-xs rounded-lg inline-flex items-center gap-1.5 font-medium bg-brand-600 hover:bg-brand-700 text-white transition-colors">
              <Plus className="w-3.5 h-3.5" /> New Claim
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total Claims", value: claims.length, icon: Receipt, accent: true },
            { label: "Pending", value: claims.filter(c => c.status === "pending").length, icon: Clock },
            { label: "Total Amount", value: `₹${totalAmount.toLocaleString()}`, icon: Wallet },
            { label: "Approved Amt", value: `₹${approvedAmount.toLocaleString()}`, icon: Check },
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
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search claims…"
              className="w-full h-8 pl-8 pr-3 text-xs border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-300" />
          </div>
          <div className="flex items-center gap-1.5">
            {["", "pending", "approved", "rejected", "paid"].map(s => (
              <button key={s} onClick={() => setFilterStatus(s ? [s] : [])}
                className={cn("h-7 px-3 text-xs rounded-lg border transition-colors font-medium",
                  (s === "" ? filterStatus.length === 0 : filterStatus.includes(s))
                    ? "bg-brand-600 text-white border-brand-600"
                    : "border-border text-muted-foreground hover:bg-muted")}>
                {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  {["Claim No", "Employee", "Category", "Amount", "Description", "Claim Date", "Status", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} className="border-b border-border/60 hover:bg-muted/20 transition-colors group">
                    <td className="px-4 py-2"><span className="font-mono text-xs font-semibold text-brand-700">{c.claimNo}</span></td>
                    <td className="px-4 py-2">
                      <p className="text-xs font-semibold text-foreground">{c.name}</p>
                      <p className="text-[11px] text-muted-foreground">{c.empCode} · {c.department}</p>
                    </td>
                    <td className="px-4 py-2">
                      <span className={cn("text-[11px] px-2 py-0.5 rounded-full font-semibold capitalize", CAT_COLORS[c.category])}>
                        {c.category}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs font-semibold text-foreground">₹{c.amount.toLocaleString()}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground max-w-[180px] truncate">{c.description}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{c.claimDate}</td>
                    <td className="px-4 py-2"><StatusPill status={c.status} /></td>
                    <td className="px-4 py-2">
                      <div className="relative flex items-center gap-1 justify-end">
                        {c.status === "pending" && (
                          <>
                            <button className="p-1 hover:bg-emerald-50 rounded text-emerald-600 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button className="p-1 hover:bg-red-50 rounded text-red-500 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <button onClick={() => setOpenMenu(openMenu === c.id ? null : c.id)}
                          className="p-1.5 hover:bg-muted rounded-md opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all">
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
            <p className="text-[11px] text-muted-foreground">Showing <span className="font-medium text-foreground">{filtered.length}</span> of <span className="font-medium text-foreground">{claims.length}</span> claims</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
