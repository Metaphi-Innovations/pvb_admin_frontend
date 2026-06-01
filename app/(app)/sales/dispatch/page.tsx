"use client";

import React, { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Truck, Plus, Download, Search, SlidersHorizontal, X, MoreVertical, ChevronDown, ChevronsUpDown, Eye, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface Dispatch {
  id: number;
  dispatchNo: string;
  soRef: string;
  customer: string;
  vehicle: string;
  driver: string;
  packages: number;
  weight: string;
  status: "scheduled" | "in-transit" | "delivered" | "failed";
  dispatchDate: string;
  estimatedDelivery: string;
  territory: string;
}

const SEED: Dispatch[] = [
  { id: 1, dispatchNo: "DSP-2024-001", soRef: "SO-2024-001", customer: "Green Valley Agro", vehicle: "MH-12-AB-1234", driver: "Suresh Kumar", packages: 12, weight: "450 kg", status: "delivered", dispatchDate: "2024-01-16", estimatedDelivery: "2024-01-17", territory: "North Zone" },
  { id: 2, dispatchNo: "DSP-2024-002", soRef: "SO-2024-002", customer: "Kisan Fertilizers Ltd", vehicle: "GJ-05-CD-5678", driver: "Ramesh Patel", packages: 8, weight: "320 kg", status: "in-transit", dispatchDate: "2024-01-18", estimatedDelivery: "2024-01-19", territory: "South Zone" },
  { id: 3, dispatchNo: "DSP-2024-003", soRef: "SO-2024-005", customer: "Sunrise Crops", vehicle: "UP-32-EF-9012", driver: "Mohan Lal", packages: 15, weight: "600 kg", status: "delivered", dispatchDate: "2024-01-14", estimatedDelivery: "2024-01-15", territory: "North Zone" },
  { id: 4, dispatchNo: "DSP-2024-004", soRef: "SO-2024-007", customer: "BioGrow Agro", vehicle: "KA-41-GH-3456", driver: "Suresh Kumar", packages: 20, weight: "800 kg", status: "scheduled", dispatchDate: "2024-01-23", estimatedDelivery: "2024-01-24", territory: "South Zone" },
  { id: 5, dispatchNo: "DSP-2024-005", soRef: "SO-2024-008", customer: "Fertile Lands Ltd", vehicle: "WB-22-IJ-7890", driver: "Rajiv Singh", packages: 6, weight: "240 kg", status: "in-transit", dispatchDate: "2024-01-23", estimatedDelivery: "2024-01-24", territory: "East Zone" },
  { id: 6, dispatchNo: "DSP-2024-006", soRef: "SO-2024-009", customer: "CropCare India", vehicle: "RJ-14-KL-2345", driver: "Ankit Sharma", packages: 25, weight: "1000 kg", status: "delivered", dispatchDate: "2024-01-11", estimatedDelivery: "2024-01-12", territory: "West Zone" },
];

const STATUS_CFG = {
  scheduled:  { bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-500"    },
  "in-transit":{ bg: "bg-amber-50",  text: "text-amber-700",   dot: "bg-amber-400"   },
  delivered:  { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  failed:     { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-400"     },
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CFG[status as keyof typeof STATUS_CFG] ?? STATUS_CFG.scheduled;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium", cfg.bg, cfg.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
      {status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ")}
    </span>
  );
}

export default function DispatchPage() {
  const [dispatches] = useState<Dispatch[]>(SEED);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("dispatchDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [openMenu, setOpenMenu] = useState<number | null>(null);

  const filtered = useMemo(() => {
    let d = dispatches.filter(x => {
      const q = search.toLowerCase();
      return !q || x.dispatchNo.toLowerCase().includes(q) || x.customer.toLowerCase().includes(q) || x.vehicle.toLowerCase().includes(q);
    });
    return [...d].sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sortKey];
      const bv = (b as unknown as Record<string, unknown>)[sortKey];
      const cmp = String(av ?? "").localeCompare(String(bv ?? ""), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [dispatches, search, sortKey, sortDir]);

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

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Dispatch</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Track shipments and delivery status</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="h-8 px-3 text-xs border border-border rounded-lg inline-flex items-center gap-1.5 font-medium text-muted-foreground hover:bg-muted transition-colors">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <button className="h-8 px-3 text-xs rounded-lg inline-flex items-center gap-1.5 font-medium bg-brand-600 hover:bg-brand-700 text-white transition-colors">
              <Plus className="w-3.5 h-3.5" /> New Dispatch
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total Dispatches", value: dispatches.length, icon: Truck, accent: true },
            { label: "Scheduled", value: dispatches.filter(d => d.status === "scheduled").length, icon: Package },
            { label: "In Transit", value: dispatches.filter(d => d.status === "in-transit").length, icon: Truck },
            { label: "Delivered", value: dispatches.filter(d => d.status === "delivered").length, icon: Package },
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
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search dispatch, customer, vehicle…"
              className="w-full h-8 pl-8 pr-3 text-xs border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-300" />
          </div>
          <p className="text-xs text-muted-foreground ml-auto">{filtered.length} records</p>
        </div>

        <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <SortTh label="Dispatch No" colKey="dispatchNo" />
                  <SortTh label="Customer" colKey="customer" />
                  <SortTh label="SO Ref" colKey="soRef" />
                  <SortTh label="Vehicle" colKey="vehicle" />
                  <SortTh label="Driver" colKey="driver" />
                  <SortTh label="Packages" colKey="packages" />
                  <SortTh label="Status" colKey="status" />
                  <SortTh label="Dispatch Date" colKey="dispatchDate" />
                  <th className="px-4 py-2.5 w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => (
                  <tr key={d.id} className="border-b border-border/60 hover:bg-muted/20 transition-colors group">
                    <td className="px-4 py-2"><span className="font-mono text-xs font-semibold text-brand-700">{d.dispatchNo}</span></td>
                    <td className="px-4 py-2"><p className="text-xs font-semibold text-foreground">{d.customer}</p><p className="text-[11px] text-muted-foreground">{d.territory}</p></td>
                    <td className="px-4 py-2"><span className="font-mono text-xs text-muted-foreground">{d.soRef}</span></td>
                    <td className="px-4 py-2"><span className="font-mono text-xs text-foreground">{d.vehicle}</span></td>
                    <td className="px-4 py-2 text-xs text-foreground">{d.driver}</td>
                    <td className="px-4 py-2 text-xs text-center text-foreground">{d.packages} pkgs / {d.weight}</td>
                    <td className="px-4 py-2"><StatusPill status={d.status} /></td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{d.dispatchDate}</td>
                    <td className="px-4 py-2">
                      <div className="relative flex justify-end">
                        <button onClick={() => setOpenMenu(openMenu === d.id ? null : d.id)}
                          className="p-1.5 hover:bg-muted rounded-md transition-colors opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto">
                          <MoreVertical className="w-4 h-4 text-muted-foreground" />
                        </button>
                        {openMenu === d.id && (
                          <div className="absolute right-0 top-7 z-50 bg-white border border-border rounded-xl shadow-lg w-40 py-1">
                            <button className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-muted"><Eye className="w-3.5 h-3.5 text-muted-foreground" /> View Details</button>
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
            <p className="text-[11px] text-muted-foreground">Showing <span className="font-medium text-foreground">{filtered.length}</span> of <span className="font-medium text-foreground">{dispatches.length}</span> records</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
