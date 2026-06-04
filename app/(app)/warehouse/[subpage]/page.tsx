"use client";

import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { 
  ClipboardCheck, 
  Layers, 
  Truck, 
  PackageCheck, 
  AlertTriangle, 
  ArrowLeft,
  Search,
  SlidersHorizontal,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PageConfig {
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  kpis: { label: string; value: string | number; change?: string; trend?: "up" | "down" }[];
  placeholderText: string;
}

const CONFIGS: Record<string, PageConfig> = {
  grnqc: {
    title: "GRN & Quality Control",
    description: "Inspect incoming stock, verify quality standards, and generate Goods Receipt Notes.",
    icon: ClipboardCheck,
    kpis: [
      { label: "Pending Inspections", value: 12, change: "+3 today", trend: "up" },
      { label: "Passed (MTD)", value: 145 },
      { label: "Rejected (MTD)", value: 4, change: "-2% vs last month", trend: "down" },
    ],
    placeholderText: "No active inspection batches. Create or select a GRN to start quality verification.",
  },
  stockoverview: {
    title: "Stock Overview",
    description: "Real-time visibility into inventory levels, batch locations, and stock movements.",
    icon: Layers,
    kpis: [
      { label: "Total Active Items", value: 342 },
      { label: "Total Quantity", value: "84,250 kg" },
      { label: "Storage Occupancy", value: "72%", change: "+4% this week", trend: "up" },
    ],
    placeholderText: "Enter an item code or batch number to view detailed stock distribution.",
  },
  dispatch: {
    title: "Dispatch Management",
    description: "Manage sales orders ready for shipping, assign vehicles, and track gate passes.",
    icon: Truck,
    kpis: [
      { label: "Awaiting Dispatch", value: 8, change: "4 high priority", trend: "up" },
      { label: "Dispatched Today", value: 24 },
      { label: "Avg Loading Time", value: "22 mins" },
    ],
    placeholderText: "All orders dispatched. Awaiting next batch authorization from Sales.",
  },
  packing: {
    title: "Packing & Packaging",
    description: "Track repackaging requests, bagging operations, and batch/lot labeling status.",
    icon: PackageCheck,
    kpis: [
      { label: "Packing Orders Active", value: 5 },
      { label: "Units Bagged Today", value: "1,200 Bags" },
      { label: "Material Waste Rate", value: "0.2%", trend: "down" },
    ],
    placeholderText: "No active packaging runs. Select a bulk batch to initiate bagging.",
  },
  reorderlevel: {
    title: "Reorder Levels & Alerts",
    description: "Configure safety stock, review low inventory warnings, and auto-generate purchase drafts.",
    icon: AlertTriangle,
    kpis: [
      { label: "Below Safety Stock", value: 9, change: "Action required", trend: "up" },
      { label: "Approaching Reorder", value: 14 },
      { label: "Auto-Drafted POs", value: 3 },
    ],
    placeholderText: "All current stocks are above safety thresholds. No reorder alerts triggered.",
  },
};

export default function WarehouseSubPage({ params }: { params: { subpage: string } }) {
  const route = params.subpage?.toLowerCase() || "";
  const config = CONFIGS[route] || {
    title: "Warehouse Module",
    description: "Manage warehouse tasks and inventory processing.",
    icon: ClipboardCheck,
    kpis: [
      { label: "Active Jobs", value: 0 },
      { label: "Alerts", value: 0 },
    ],
    placeholderText: "This section is under construction. Business logic will be wired up soon.",
  };

  const IconComponent = config.icon;

  return (
    <AppLayout>
      <div className="w-full space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-lg hover:bg-muted"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600">
                <IconComponent className="w-4 h-4" />
              </div>
              <h1 className="text-xl font-bold text-foreground">{config.title}</h1>
            </div>
            <p className="text-xs text-muted-foreground ml-10">
              {config.description}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-10 sm:ml-0">
            <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1.5 font-medium rounded-lg">
              <Plus className="w-3.5 h-3.5" /> New Transaction
            </Button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {config.kpis.map((kpi, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-border p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <IconComponent className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <p className="text-base font-bold text-foreground leading-none">{kpi.value}</p>
                  {kpi.change && (
                    <span className={`text-[10px] font-semibold ${kpi.trend === "down" ? "text-emerald-600" : "text-brand-600"}`}>
                      {kpi.change}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">{kpi.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Action Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-[9px] text-muted-foreground pointer-events-none" />
            <Input placeholder={`Search ${config.title.toLowerCase()}...`} className="pl-8 h-8 text-xs" />
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 border-border text-muted-foreground hover:bg-muted font-medium rounded-lg">
            <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
          </Button>
        </div>

        {/* Empty State / Coming Soon Panel */}
        <div className="border border-border rounded-xl bg-white shadow-sm p-12 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center mb-4">
            <IconComponent className="w-6 h-6 text-brand-600" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">
            No Records Found
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mt-1.5 leading-relaxed">
            {config.placeholderText}
          </p>
          <div className="mt-5 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-medium h-8 rounded-lg"
              onClick={() => window.history.back()}
            >
              Go Back
            </Button>
            <Button
              size="sm"
              className="text-xs font-medium bg-brand-600 hover:bg-brand-700 text-white h-8 rounded-lg"
            >
              Add Sample Data
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
