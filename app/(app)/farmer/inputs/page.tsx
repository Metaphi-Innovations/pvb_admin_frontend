"use client";

import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Package, Plus, Download, Search, MoreVertical, Eye, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface InputDistribution {
  id: number;
  distNo: string;
  farmer: string;
  farmerCode: string;
  village: string;
  product: string;
  category: "seed" | "fertilizer" | "pesticide" | "equipment";
  quantity: string;
  value: number;
  scheme: string;
  status: "pending" | "distributed" | "acknowledged";
  distributedDate: string;
  distributedBy: string;
}

const SEED: InputDistribution[] = [
  { id: 1, distNo: "INP-001", farmer: "Ramesh Patel", farmerCode: "FMR-001", village: "Navapura", product: "BT Cotton Seeds", category: "seed", quantity: "10 packets", value: 2500, scheme: "PM Kisan", status: "distributed", distributedDate: "2024-01-15", distributedBy: "Field Agent A" },
  { id: 2, distNo: "INP-002", farmer: "Mahesh Singh", farmerCode: "FMR-003", village: "Bhanpur", product: "DAP Fertilizer", category: "fertilizer", quantity: "50 kg", value: 1350, scheme: "Subsidy Scheme", status: "acknowledged", distributedDate: "2024-01-18", distributedBy: "Field Agent B" },
  { id: 3, distNo: "INP-003", farmer: "Haridas Patil", farmerCode: "FMR-006", village: "Mohol", product: "Chlorpyrifos Spray", category: "pesticide", quantity: "2 liters", value: 800, scheme: "Direct Purchase", status: "pending", distributedDate: "-", distributedBy: "-" },
  { id: 4, distNo: "INP-004", farmer: "Suresh Kumar", farmerCode: "FMR-002", village: "Kheralu", product: "Wheat Seeds (GW-322)", category: "seed", quantity: "20 kg", value: 1200, scheme: "PM Kisan", status: "distributed", distributedDate: "2024-01-20", distributedBy: "Field Agent A" },
  { id: 5, distNo: "INP-005", farmer: "Prakash Rao", farmerCode: "FMR-004", village: "Tandur", product: "Sprinkler Set", category: "equipment", quantity: "1 unit", value: 15000, scheme: "PMKSY", status: "acknowledged", distributedDate: "2024-01-22", distributedBy: "Field Agent C" },
];

const STATUS_CFG = {
  pending:      { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-400"   },
  distributed:  { bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-500"    },
  acknowledged: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
};

const CAT_COLORS: Record<string, string> = {
  seed:       "bg-emerald-100 text-emerald-700",
  fertilizer: "bg-blue-100 text-blue-700",
  pesticide:  "bg-amber-100 text-amber-700",
  equipment:  "bg-purple-100 text-purple-700",
};

export default function InputsPage() {
  const [items] = useState<InputDistribution[]>(SEED);
  const [search, setSearch] = useState("");
  const [openMenu, setOpenMenu] = useState<number | null>(null);

  const filtered = items.filter(i => {
    const q = search.toLowerCase();
    return !q || i.farmer.toLowerCase().includes(q) || i.distNo.toLowerCase().includes(q) || i.product.toLowerCase().includes(q);
  });

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Input Distribution</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Track seeds, fertilizers, and equipment distribution</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="h-8 px-3 text-xs border border-border rounded-lg inline-flex items-center gap-1.5 font-medium text-muted-foreground hover:bg-muted transition-colors">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <button className="h-8 px-3 text-xs rounded-lg inline-flex items-center gap-1.5 font-medium bg-brand-600 hover:bg-brand-700 text-white transition-colors">
              <Plus className="w-3.5 h-3.5" /> New Distribution
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total Distributions", value: items.length, icon: Package, accent: true },
            { label: "Pending", value: items.filter(i => i.status === "pending").length, icon: Clock },
            { label: "Distributed", value: items.filter(i => i.status === "distributed").length, icon: Package },
            { label: "Acknowledged", value: items.filter(i => i.status === "acknowledged").length, icon: CheckCircle2 },
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
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search distributions…"
              className="w-full h-8 pl-8 pr-3 text-xs border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-300" />
          </div>
        </div>

        <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                {["Dist No", "Farmer", "Product", "Category", "Quantity", "Value", "Scheme", "Status", "Date", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(i => (
                <tr key={i.id} className="border-b border-border/60 hover:bg-muted/20 transition-colors group">
                  <td className="px-4 py-2"><span className="font-mono text-xs font-semibold text-brand-700">{i.distNo}</span></td>
                  <td className="px-4 py-2"><p className="text-xs font-semibold text-foreground">{i.farmer}</p><p className="text-[11px] text-muted-foreground">{i.village}</p></td>
                  <td className="px-4 py-2 text-xs text-foreground">{i.product}</td>
                  <td className="px-4 py-2"><span className={cn("text-[11px] px-2 py-0.5 rounded-full font-semibold capitalize", CAT_COLORS[i.category])}>{i.category}</span></td>
                  <td className="px-4 py-2 text-xs text-foreground">{i.quantity}</td>
                  <td className="px-4 py-2 text-xs font-semibold text-foreground">₹{i.value.toLocaleString()}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{i.scheme}</td>
                  <td className="px-4 py-2">
                    <span className={cn("inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium",
                      STATUS_CFG[i.status].bg, STATUS_CFG[i.status].text)}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_CFG[i.status].dot)} />
                      {i.status.charAt(0).toUpperCase() + i.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{i.distributedDate}</td>
                  <td className="px-4 py-2">
                    <div className="relative flex justify-end">
                      <button onClick={() => setOpenMenu(openMenu === i.id ? null : i.id)}
                        className="p-1.5 hover:bg-muted rounded-md opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all">
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                      </button>
                      {openMenu === i.id && (
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
          <div className="px-4 py-3 border-t border-border bg-muted/20">
            <p className="text-[11px] text-muted-foreground">{filtered.length} records</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
