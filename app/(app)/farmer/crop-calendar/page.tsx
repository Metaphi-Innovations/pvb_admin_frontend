"use client";

import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { CalendarDays, Plus, Wheat } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

interface CropSchedule {
  crop: string;
  season: "kharif" | "rabi" | "zaid";
  sowing: [number, number]; // [startMonth, endMonth] index in MONTHS
  harvesting: [number, number];
  regions: string;
  notes: string;
}

const CROPS: CropSchedule[] = [
  { crop: "Paddy", season: "kharif", sowing: [2, 3], harvesting: [6, 7], regions: "All India", notes: "Short-duration varieties available" },
  { crop: "Cotton", season: "kharif", sowing: [1, 2], harvesting: [7, 9], regions: "Gujarat, Maharashtra, Telangana", notes: "Requires 180-200 days" },
  { crop: "Maize", season: "kharif", sowing: [2, 3], harvesting: [5, 6], regions: "Karnataka, MP, Bihar", notes: "Hybrid varieties preferred" },
  { crop: "Soybean", season: "kharif", sowing: [2, 3], harvesting: [5, 6], regions: "MP, Maharashtra, Rajasthan", notes: "60-90 day crop" },
  { crop: "Wheat", season: "rabi", sowing: [7, 8], harvesting: [10, 11], regions: "Punjab, Haryana, UP, MP", notes: "Best with proper irrigation" },
  { crop: "Mustard", season: "rabi", sowing: [6, 7], harvesting: [9, 10], regions: "Rajasthan, Haryana, UP", notes: "Cold tolerant crop" },
  { crop: "Chickpea (Gram)", season: "rabi", sowing: [7, 8], harvesting: [10, 11], regions: "MP, Rajasthan, Maharashtra", notes: "Drought tolerant" },
  { crop: "Sugarcane", season: "zaid", sowing: [0, 1], harvesting: [8, 10], regions: "UP, Maharashtra, TN", notes: "12-18 month crop" },
  { crop: "Watermelon", season: "zaid", sowing: [11, 0], harvesting: [2, 3], regions: "All warm regions", notes: "Short 70-80 day crop" },
];

const SEASON_COLORS = {
  kharif: "bg-blue-500",
  rabi:   "bg-amber-500",
  zaid:   "bg-emerald-500",
};

const SEASON_BG = {
  kharif: "bg-blue-50 border-blue-200 text-blue-700",
  rabi:   "bg-amber-50 border-amber-200 text-amber-700",
  zaid:   "bg-emerald-50 border-emerald-200 text-emerald-700",
};

export default function CropCalendarPage() {
  const [filter, setFilter] = useState<"all" | "kharif" | "rabi" | "zaid">("all");

  const filtered = CROPS.filter(c => filter === "all" || c.season === filter);

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Crop Calendar</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Sowing and harvesting schedule by season</p>
          </div>
          <button className="h-8 px-3 text-xs rounded-lg inline-flex items-center gap-1.5 font-medium bg-brand-600 hover:bg-brand-700 text-white transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add Crop
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4">
          <p className="text-xs font-medium text-muted-foreground">Season:</p>
          {(["all", "kharif", "rabi", "zaid"] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={cn("h-7 px-3 text-xs rounded-lg border transition-colors font-medium capitalize",
                filter === s ? "bg-brand-600 text-white border-brand-600" : "border-border text-muted-foreground hover:bg-muted")}>
              {s === "all" ? "All Seasons" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
          {/* Month header */}
          <div className="grid overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground w-36 whitespace-nowrap">Crop</th>
                  <th className="px-2 py-3 text-center text-xs font-semibold text-muted-foreground w-16">Season</th>
                  {MONTHS.map(m => (
                    <th key={m} className="px-1 py-3 text-center text-[11px] font-semibold text-muted-foreground w-14">{m}</th>
                  ))}
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground">Regions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((crop, idx) => (
                  <tr key={idx} className="border-b border-border/60 hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1.5">
                        <Wheat className="w-3.5 h-3.5 text-brand-500" />
                        <span className="text-xs font-semibold text-foreground">{crop.crop}</span>
                      </div>
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-semibold capitalize", SEASON_BG[crop.season])}>
                        {crop.season}
                      </span>
                    </td>
                    {MONTHS.map((_, monthIdx) => {
                      const isSowing = monthIdx >= crop.sowing[0] && monthIdx <= crop.sowing[1];
                      const isHarvesting = monthIdx >= crop.harvesting[0] && monthIdx <= crop.harvesting[1];
                      return (
                        <td key={monthIdx} className="px-1 py-2.5">
                          <div className="flex justify-center">
                            {isSowing && (
                              <div className="w-8 h-3 rounded-sm bg-blue-400 opacity-80" title="Sowing" />
                            )}
                            {isHarvesting && !isSowing && (
                              <div className="w-8 h-3 rounded-sm bg-amber-400 opacity-80" title="Harvesting" />
                            )}
                            {!isSowing && !isHarvesting && (
                              <div className="w-8 h-3 rounded-sm bg-muted/50" />
                            )}
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-4 py-2 text-[11px] text-muted-foreground">{crop.regions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Legend */}
          <div className="px-4 py-3 border-t border-border bg-muted/20 flex items-center gap-4">
            <p className="text-[11px] text-muted-foreground font-medium">Legend:</p>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-3 rounded-sm bg-blue-400" />
              <span className="text-[11px] text-muted-foreground">Sowing</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-3 rounded-sm bg-amber-400" />
              <span className="text-[11px] text-muted-foreground">Harvesting</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-3 rounded-sm bg-muted/50" />
              <span className="text-[11px] text-muted-foreground">Idle</span>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
