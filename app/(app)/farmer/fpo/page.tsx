"use client";

import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Users, Plus, Download, Search, MoreVertical, Eye, Edit, MapPin, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface FPO {
  id: number;
  fpoCode: string;
  name: string;
  chairperson: string;
  district: string;
  state: string;
  members: number;
  turnover: number;
  primaryCrop: string;
  status: "active" | "inactive";
  registeredDate: string;
  ceoName: string;
}

const SEED: FPO[] = [
  { id: 1, fpoCode: "FPO-001", name: "Anand FPO", chairperson: "Dhirubhai Patel", district: "Anand", state: "Gujarat", members: 250, turnover: 5200000, primaryCrop: "Cotton, Wheat", status: "active", registeredDate: "2020-06-15", ceoName: "Suresh Patel" },
  { id: 2, fpoCode: "FPO-002", name: "Mehsana Kisan FPO", chairperson: "Balubhai Shah", district: "Mehsana", state: "Gujarat", members: 180, turnover: 3800000, primaryCrop: "Wheat, Vegetables", status: "active", registeredDate: "2021-01-10", ceoName: "Ramesh Shah" },
  { id: 3, fpoCode: "FPO-003", name: "CG Kisan FPO", chairperson: "Govind Rao", district: "Raipur", state: "Chhattisgarh", members: 320, turnover: 7500000, primaryCrop: "Paddy, Maize", status: "active", registeredDate: "2019-11-20", ceoName: "Pradip Kumar" },
  { id: 4, fpoCode: "FPO-004", name: "Telangana Agri FPO", chairperson: "Venkanna Reddy", district: "Vikarabad", state: "Telangana", members: 150, turnover: 2900000, primaryCrop: "Maize, Soybean", status: "active", registeredDate: "2022-03-05", ceoName: "Srinivas Rao" },
  { id: 5, fpoCode: "FPO-005", name: "Solapur FPO", chairperson: "Shankar Patil", district: "Solapur", state: "Maharashtra", members: 420, turnover: 9800000, primaryCrop: "Soybean, Jowar", status: "active", registeredDate: "2018-09-25", ceoName: "Vijay Deshmukh" },
  { id: 6, fpoCode: "FPO-006", name: "UP Kisan FPO", chairperson: "Ram Lal Verma", district: "Fatehpur", state: "Uttar Pradesh", members: 100, turnover: 1500000, primaryCrop: "Sugarcane, Wheat", status: "inactive", registeredDate: "2023-01-15", ceoName: "Rajan Verma" },
];

export default function FPOPage() {
  const [fpos] = useState<FPO[]>(SEED);
  const [search, setSearch] = useState("");
  const [openMenu, setOpenMenu] = useState<number | null>(null);

  const filtered = fpos.filter(f => {
    const q = search.toLowerCase();
    return !q || f.name.toLowerCase().includes(q) || f.fpoCode.toLowerCase().includes(q) || f.district.toLowerCase().includes(q);
  });

  const totalMembers = fpos.reduce((s, f) => s + f.members, 0);
  const totalTurnover = fpos.reduce((s, f) => s + f.turnover, 0);

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">FPO Management</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Farmer Producer Organizations registry</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="h-8 px-3 text-xs border border-border rounded-lg inline-flex items-center gap-1.5 font-medium text-muted-foreground hover:bg-muted transition-colors">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <button className="h-8 px-3 text-xs rounded-lg inline-flex items-center gap-1.5 font-medium bg-brand-600 hover:bg-brand-700 text-white transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add FPO
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total FPOs", value: fpos.length, icon: Users, accent: true },
            { label: "Active", value: fpos.filter(f => f.status === "active").length, icon: Users },
            { label: "Total Members", value: totalMembers.toLocaleString(), icon: User },
            { label: "Total Turnover", value: `₹${(totalTurnover / 10000000).toFixed(1)}Cr`, icon: Users },
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
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search FPOs…"
              className="w-full h-8 pl-8 pr-3 text-xs border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-300" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {filtered.map(fpo => (
            <div key={fpo.id} className="bg-white border border-border rounded-xl p-4 hover:shadow-sm transition-shadow group">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-brand-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-brand-700">{fpo.fpoCode}</span>
                      <span className={cn("inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium",
                        fpo.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600")}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", fpo.status === "active" ? "bg-emerald-500" : "bg-slate-400")} />
                        {fpo.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-foreground mt-0.5">{fpo.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <MapPin className="w-3 h-3" /> {fpo.district}, {fpo.state}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <User className="w-3 h-3" /> Chair: {fpo.chairperson}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setOpenMenu(openMenu === fpo.id ? null : fpo.id)}
                    className="p-1.5 hover:bg-muted rounded-md opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all relative">
                    <MoreVertical className="w-4 h-4 text-muted-foreground" />
                    {openMenu === fpo.id && (
                      <div className="absolute right-0 top-7 z-50 bg-white border border-border rounded-xl shadow-lg w-40 py-1">
                        <button className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-muted"><Eye className="w-3.5 h-3.5 text-muted-foreground" /> View</button>
                        <button className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-muted"><Edit className="w-3.5 h-3.5 text-muted-foreground" /> Edit</button>
                      </div>
                    )}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3 mt-3 pt-3 border-t border-border/50">
                <div><p className="text-[11px] text-muted-foreground">Members</p><p className="text-xs font-semibold text-foreground">{fpo.members}</p></div>
                <div><p className="text-[11px] text-muted-foreground">Annual Turnover</p><p className="text-xs font-semibold text-foreground">₹{(fpo.turnover / 100000).toFixed(1)}L</p></div>
                <div><p className="text-[11px] text-muted-foreground">Primary Crops</p><p className="text-xs font-semibold text-foreground">{fpo.primaryCrop}</p></div>
                <div><p className="text-[11px] text-muted-foreground">CEO</p><p className="text-xs font-semibold text-foreground">{fpo.ceoName}</p></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
