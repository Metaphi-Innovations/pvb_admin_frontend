"use client";

import React, { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Wheat, Plus, Download, Search, SlidersHorizontal, X, MoreVertical, Eye, Edit, Users, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface Farmer {
  id: number;
  farmerCode: string;
  name: string;
  mobile: string;
  village: string;
  district: string;
  state: string;
  landArea: string;
  primaryCrop: string;
  fpoName: string;
  status: "active" | "inactive";
  registeredDate: string;
}

const SEED: Farmer[] = [
  { id: 1, farmerCode: "FMR-001", name: "Ramesh Patel", mobile: "9876501001", village: "Navapura", district: "Anand", state: "Gujarat", landArea: "4.5 acres", primaryCrop: "Cotton", fpoName: "Anand FPO", status: "active", registeredDate: "2023-04-15" },
  { id: 2, farmerCode: "FMR-002", name: "Suresh Kumar", mobile: "9876501002", village: "Kheralu", district: "Mehsana", state: "Gujarat", landArea: "2.0 acres", primaryCrop: "Wheat", fpoName: "Mehsana Kisan FPO", status: "active", registeredDate: "2023-05-20" },
  { id: 3, farmerCode: "FMR-003", name: "Mahesh Singh", mobile: "9876501003", village: "Bhanpur", district: "Raipur", state: "Chhattisgarh", landArea: "6.0 acres", primaryCrop: "Paddy", fpoName: "CG Kisan FPO", status: "active", registeredDate: "2023-03-10" },
  { id: 4, farmerCode: "FMR-004", name: "Prakash Rao", mobile: "9876501004", village: "Tandur", district: "Vikarabad", state: "Telangana", landArea: "3.5 acres", primaryCrop: "Maize", fpoName: "Telangana Agri FPO", status: "active", registeredDate: "2023-06-01" },
  { id: 5, farmerCode: "FMR-005", name: "Rajan Verma", mobile: "9876501005", village: "Barwa", district: "Fatehpur", state: "Uttar Pradesh", landArea: "1.5 acres", primaryCrop: "Sugarcane", fpoName: "UP Kisan FPO", status: "inactive", registeredDate: "2023-02-15" },
  { id: 6, farmerCode: "FMR-006", name: "Haridas Patil", mobile: "9876501006", village: "Mohol", district: "Solapur", state: "Maharashtra", landArea: "8.0 acres", primaryCrop: "Soybean", fpoName: "Solapur FPO", status: "active", registeredDate: "2023-07-12" },
  { id: 7, farmerCode: "FMR-007", name: "Gopal Nair", mobile: "9876501007", village: "Kuttanad", district: "Alappuzha", state: "Kerala", landArea: "1.0 acres", primaryCrop: "Paddy", fpoName: "Kerala Agri FPO", status: "active", registeredDate: "2023-08-05" },
  { id: 8, farmerCode: "FMR-008", name: "Bharat Das", mobile: "9876501008", village: "Srirampur", district: "Murshidabad", state: "West Bengal", landArea: "2.5 acres", primaryCrop: "Jute", fpoName: "WB Kisan FPO", status: "active", registeredDate: "2023-09-18" },
];

export default function FarmerRegistryPage() {
  const [farmers] = useState<Farmer[]>(SEED);
  const [search, setSearch] = useState("");
  const [filterState, setFilterState] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<number | null>(null);

  const states = [...new Set(SEED.map(f => f.state))];
  const filtered = useMemo(() => {
    let d = farmers.filter(f => {
      const q = search.toLowerCase();
      return !q || f.name.toLowerCase().includes(q) || f.farmerCode.toLowerCase().includes(q) || f.village.toLowerCase().includes(q) || f.mobile.includes(q);
    });
    if (filterState.length) d = d.filter(f => filterState.includes(f.state));
    return d;
  }, [farmers, search, filterState]);

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Farmer Registry</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Register and manage farming communities</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="h-8 px-3 text-xs border border-border rounded-lg inline-flex items-center gap-1.5 font-medium text-muted-foreground hover:bg-muted transition-colors">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <button className="h-8 px-3 text-xs rounded-lg inline-flex items-center gap-1.5 font-medium bg-brand-600 hover:bg-brand-700 text-white transition-colors">
              <Plus className="w-3.5 h-3.5" /> Register Farmer
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total Farmers", value: farmers.length, icon: Wheat, accent: true },
            { label: "Active", value: farmers.filter(f => f.status === "active").length, icon: Users },
            { label: "States Covered", value: states.length, icon: MapPin },
            { label: "FPOs Linked", value: new Set(farmers.map(f => f.fpoName)).size, icon: Users },
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
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, code, village…"
              className="w-full h-8 pl-8 pr-3 text-xs border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-300" />
          </div>
          <div className="relative">
            <button onClick={() => setFilterOpen(p => !p)}
              className={cn("h-8 px-2.5 text-xs border rounded-lg inline-flex items-center gap-1.5 font-medium transition-colors",
                filterState.length ? "border-brand-400 bg-brand-50 text-brand-700" : "border-border text-muted-foreground hover:bg-muted")}>
              <SlidersHorizontal className="w-3.5 h-3.5" /> State
              {filterState.length > 0 && <span className="w-4 h-4 text-[10px] bg-brand-600 text-white rounded-full inline-flex items-center justify-center font-bold">{filterState.length}</span>}
            </button>
            {filterOpen && (
              <div className="absolute top-9 left-0 z-50 bg-white border border-border rounded-xl shadow-lg w-52 max-h-64 overflow-y-auto">
                <div className="px-3 py-2.5 border-b border-border sticky top-0 bg-white"><p className="text-xs font-semibold">Filter by State</p></div>
                <div className="px-3 py-2 space-y-1.5">
                  {states.map(s => (
                    <label key={s} className="flex items-center gap-2.5 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded accent-brand-600"
                        checked={filterState.includes(s)} onChange={() => setFilterState(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s])} />
                      <span className="text-xs">{s}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          {filterState.map(s => (
            <span key={s} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium">
              {s} <button onClick={() => setFilterState(p => p.filter(x => x !== s))}><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>

        <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  {["Farmer Code", "Name & Mobile", "Village / District", "State", "Land Area", "Primary Crop", "FPO", "Status", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(f => (
                  <tr key={f.id} className="border-b border-border/60 hover:bg-muted/20 transition-colors group">
                    <td className="px-4 py-2"><span className="font-mono text-xs font-semibold text-brand-700">{f.farmerCode}</span></td>
                    <td className="px-4 py-2"><p className="text-xs font-semibold text-foreground">{f.name}</p><p className="text-[11px] text-muted-foreground">{f.mobile}</p></td>
                    <td className="px-4 py-2"><p className="text-xs text-foreground">{f.village}</p><p className="text-[11px] text-muted-foreground">{f.district}</p></td>
                    <td className="px-4 py-2 text-xs text-foreground">{f.state}</td>
                    <td className="px-4 py-2 text-xs font-medium text-foreground">{f.landArea}</td>
                    <td className="px-4 py-2 text-xs text-foreground">{f.primaryCrop}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{f.fpoName}</td>
                    <td className="px-4 py-2">
                      <span className={cn("inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium",
                        f.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600")}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", f.status === "active" ? "bg-emerald-500" : "bg-slate-400")} />
                        {f.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="relative flex justify-end">
                        <button onClick={() => setOpenMenu(openMenu === f.id ? null : f.id)}
                          className="p-1.5 hover:bg-muted rounded-md opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all">
                          <MoreVertical className="w-4 h-4 text-muted-foreground" />
                        </button>
                        {openMenu === f.id && (
                          <div className="absolute right-0 top-7 z-50 bg-white border border-border rounded-xl shadow-lg w-40 py-1">
                            <button className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-muted"><Eye className="w-3.5 h-3.5 text-muted-foreground" /> View</button>
                            <button className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-muted"><Edit className="w-3.5 h-3.5 text-muted-foreground" /> Edit</button>
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
            <p className="text-[11px] text-muted-foreground">Showing <span className="font-medium text-foreground">{filtered.length}</span> of <span className="font-medium text-foreground">{farmers.length}</span> farmers</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
