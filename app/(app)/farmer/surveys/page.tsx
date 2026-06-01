"use client";

import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ClipboardList, Plus, Download, Search, MoreVertical, Eye, MapPin, Calendar, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface Survey {
  id: number;
  surveyNo: string;
  farmerCode: string;
  farmerName: string;
  village: string;
  district: string;
  surveyDate: string;
  conductedBy: string;
  cropAssessed: string;
  soilHealth: "excellent" | "good" | "fair" | "poor";
  irrigationType: string;
  status: "draft" | "submitted" | "verified";
}

const SEED: Survey[] = [
  { id: 1, surveyNo: "SRV-001", farmerCode: "FMR-001", farmerName: "Ramesh Patel", village: "Navapura", district: "Anand", surveyDate: "2024-01-15", conductedBy: "Field Agent A", cropAssessed: "Cotton", soilHealth: "good", irrigationType: "Drip", status: "verified" },
  { id: 2, surveyNo: "SRV-002", farmerCode: "FMR-003", farmerName: "Mahesh Singh", village: "Bhanpur", district: "Raipur", surveyDate: "2024-01-18", conductedBy: "Field Agent B", cropAssessed: "Paddy", soilHealth: "excellent", irrigationType: "Canal", status: "submitted" },
  { id: 3, surveyNo: "SRV-003", farmerCode: "FMR-006", farmerName: "Haridas Patil", village: "Mohol", district: "Solapur", surveyDate: "2024-01-20", conductedBy: "Field Agent C", cropAssessed: "Soybean", soilHealth: "good", irrigationType: "Borewell", status: "draft" },
  { id: 4, surveyNo: "SRV-004", farmerCode: "FMR-004", farmerName: "Prakash Rao", village: "Tandur", district: "Vikarabad", surveyDate: "2024-01-22", conductedBy: "Field Agent A", cropAssessed: "Maize", soilHealth: "fair", irrigationType: "Rainfed", status: "submitted" },
  { id: 5, surveyNo: "SRV-005", farmerCode: "FMR-002", farmerName: "Suresh Kumar", village: "Kheralu", district: "Mehsana", surveyDate: "2024-01-24", conductedBy: "Field Agent B", cropAssessed: "Wheat", soilHealth: "good", irrigationType: "Sprinkler", status: "verified" },
];

const STATUS_CFG = {
  draft:     { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
  submitted: { bg: "bg-amber-50",  text: "text-amber-700", dot: "bg-amber-400" },
  verified:  { bg: "bg-emerald-50",text: "text-emerald-700",dot:"bg-emerald-500"},
};

const SOIL_CFG = {
  excellent: "bg-emerald-100 text-emerald-700",
  good:      "bg-blue-100 text-blue-700",
  fair:      "bg-amber-100 text-amber-700",
  poor:      "bg-red-100 text-red-700",
};

export default function SurveysPage() {
  const [surveys] = useState<Survey[]>(SEED);
  const [search, setSearch] = useState("");
  const [openMenu, setOpenMenu] = useState<number | null>(null);

  const filtered = surveys.filter(s => {
    const q = search.toLowerCase();
    return !q || s.farmerName.toLowerCase().includes(q) || s.surveyNo.toLowerCase().includes(q) || s.village.toLowerCase().includes(q);
  });

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Field Surveys</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Crop and soil assessment surveys</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="h-8 px-3 text-xs border border-border rounded-lg inline-flex items-center gap-1.5 font-medium text-muted-foreground hover:bg-muted transition-colors">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <button className="h-8 px-3 text-xs rounded-lg inline-flex items-center gap-1.5 font-medium bg-brand-600 hover:bg-brand-700 text-white transition-colors">
              <Plus className="w-3.5 h-3.5" /> New Survey
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Surveys", value: surveys.length, icon: ClipboardList, accent: true },
            { label: "Verified", value: surveys.filter(s => s.status === "verified").length, icon: ClipboardList },
            { label: "Pending Review", value: surveys.filter(s => s.status === "submitted").length, icon: ClipboardList },
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
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search surveys…"
              className="w-full h-8 pl-8 pr-3 text-xs border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-300" />
          </div>
        </div>

        <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                {["Survey No", "Farmer", "Location", "Survey Date", "Crop", "Soil Health", "Irrigation", "Status", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} className="border-b border-border/60 hover:bg-muted/20 transition-colors group">
                  <td className="px-4 py-2"><span className="font-mono text-xs font-semibold text-brand-700">{s.surveyNo}</span></td>
                  <td className="px-4 py-2">
                    <p className="text-xs font-semibold text-foreground">{s.farmerName}</p>
                    <p className="text-[11px] text-muted-foreground">{s.farmerCode}</p>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1 text-xs text-foreground">
                      <MapPin className="w-3 h-3 text-muted-foreground" /> {s.village}
                    </div>
                    <p className="text-[11px] text-muted-foreground">{s.district}</p>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" /> {s.surveyDate}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                      <User className="w-3 h-3" /> {s.conductedBy}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-xs text-foreground">{s.cropAssessed}</td>
                  <td className="px-4 py-2">
                    <span className={cn("text-[11px] px-2 py-0.5 rounded-full font-semibold capitalize", SOIL_CFG[s.soilHealth])}>
                      {s.soilHealth}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{s.irrigationType}</td>
                  <td className="px-4 py-2">
                    <span className={cn("inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium",
                      STATUS_CFG[s.status].bg, STATUS_CFG[s.status].text)}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_CFG[s.status].dot)} />
                      {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="relative flex justify-end">
                      <button onClick={() => setOpenMenu(openMenu === s.id ? null : s.id)}
                        className="p-1.5 hover:bg-muted rounded-md opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all">
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                      </button>
                      {openMenu === s.id && (
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
            <p className="text-[11px] text-muted-foreground">{filtered.length} surveys</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
