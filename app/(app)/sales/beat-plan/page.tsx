"use client";

import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { MapPin, Plus, Calendar, User, Check, Clock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface BeatStop {
  seq: number;
  customer: string;
  address: string;
  purpose: string;
  status: "pending" | "visited" | "skipped";
  timeSlot: string;
}

interface BeatPlan {
  id: number;
  planNo: string;
  salesperson: string;
  territory: string;
  date: string;
  status: "planned" | "in-progress" | "completed";
  totalStops: number;
  completedStops: number;
  stops: BeatStop[];
}

const SEED: BeatPlan[] = [
  {
    id: 1, planNo: "BP-2024-001", salesperson: "Rajesh Kumar", territory: "North Zone",
    date: "2024-01-20", status: "completed", totalStops: 5, completedStops: 5,
    stops: [
      { seq: 1, customer: "Green Valley Agro", address: "Plot 12, Sector 4, Delhi", purpose: "Order collection", status: "visited", timeSlot: "09:00 AM" },
      { seq: 2, customer: "Seeds & More", address: "Market Road, Panipat", purpose: "Product demo", status: "visited", timeSlot: "11:00 AM" },
      { seq: 3, customer: "Sunrise Crops", address: "Village Sonepat", purpose: "Payment follow-up", status: "visited", timeSlot: "01:00 PM" },
      { seq: 4, customer: "Kisan Depot", address: "NH-44, Karnal", purpose: "New product launch", status: "visited", timeSlot: "03:00 PM" },
      { seq: 5, customer: "AgriMart", address: "Sector 15, Chandigarh", purpose: "Order collection", status: "visited", timeSlot: "05:00 PM" },
    ]
  },
  {
    id: 2, planNo: "BP-2024-002", salesperson: "Priya Singh", territory: "South Zone",
    date: "2024-01-22", status: "in-progress", totalStops: 4, completedStops: 2,
    stops: [
      { seq: 1, customer: "BioGrow Agro", address: "Electronic City, Bangalore", purpose: "Order collection", status: "visited", timeSlot: "09:30 AM" },
      { seq: 2, customer: "Kisan Fertilizers Ltd", address: "Yelahanka, Bangalore", purpose: "Payment follow-up", status: "visited", timeSlot: "11:30 AM" },
      { seq: 3, customer: "Rural Agro Hub", address: "Mysore Road, Bangalore", purpose: "Product demo", status: "pending", timeSlot: "02:00 PM" },
      { seq: 4, customer: "FarmFirst", address: "Tumkur, Karnataka", purpose: "New product", status: "pending", timeSlot: "04:00 PM" },
    ]
  },
  {
    id: 3, planNo: "BP-2024-003", salesperson: "Amit Sharma", territory: "East Zone",
    date: "2024-01-24", status: "planned", totalStops: 3, completedStops: 0,
    stops: [
      { seq: 1, customer: "Fertile Lands Ltd", address: "Salt Lake, Kolkata", purpose: "Order collection", status: "pending", timeSlot: "10:00 AM" },
      { seq: 2, customer: "Farmtech Solutions", address: "Howrah, West Bengal", purpose: "Technical training", status: "pending", timeSlot: "12:30 PM" },
      { seq: 3, customer: "CropCare India", address: "Durgapur, West Bengal", purpose: "Payment follow-up", status: "pending", timeSlot: "03:00 PM" },
    ]
  },
];

const PLAN_STATUS_CFG = {
  planned:     { bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-500"    },
  "in-progress":{ bg: "bg-amber-50",  text: "text-amber-700",   dot: "bg-amber-400"   },
  completed:   { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
};

function StatusPill({ status }: { status: string }) {
  const cfg = PLAN_STATUS_CFG[status as keyof typeof PLAN_STATUS_CFG] ?? PLAN_STATUS_CFG.planned;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium", cfg.bg, cfg.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
      {status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ")}
    </span>
  );
}

export default function BeatPlanPage() {
  const [plans] = useState<BeatPlan[]>(SEED);
  const [expanded, setExpanded] = useState<number | null>(1);

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Beat Plan</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Plan and track field sales visits</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="h-8 px-3 text-xs rounded-lg inline-flex items-center gap-1.5 font-medium bg-brand-600 hover:bg-brand-700 text-white transition-colors">
              <Plus className="w-3.5 h-3.5" /> Create Beat Plan
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Plans", value: plans.length, icon: MapPin, accent: true },
            { label: "In Progress", value: plans.filter(p => p.status === "in-progress").length, icon: Clock },
            { label: "Completed", value: plans.filter(p => p.status === "completed").length, icon: Check },
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

        <div className="space-y-3">
          {plans.map(plan => (
            <div key={plan.id} className="bg-white border border-border rounded-xl overflow-hidden">
              {/* Plan Header */}
              <button
                onClick={() => setExpanded(expanded === plan.id ? null : plan.id)}
                className="w-full flex items-center gap-3 p-4 hover:bg-muted/20 transition-colors"
              >
                <div className="flex-1 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-brand-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-xs font-semibold text-brand-700">{plan.planNo}</span>
                      <StatusPill status={plan.status} />
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" /> {plan.salesperson}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {plan.territory}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {plan.date}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right mr-3">
                  <p className="text-xs font-semibold text-foreground">{plan.completedStops}/{plan.totalStops} stops</p>
                  <div className="mt-1 w-24 h-1.5 bg-muted rounded-full overflow-hidden ml-auto">
                    <div className="h-full bg-brand-500 rounded-full" style={{ width: `${(plan.completedStops / plan.totalStops) * 100}%` }} />
                  </div>
                </div>
                <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", expanded === plan.id && "rotate-90")} />
              </button>

              {/* Stops */}
              {expanded === plan.id && (
                <div className="border-t border-border">
                  {plan.stops.map((stop, idx) => (
                    <div key={idx} className={cn("flex items-start gap-3 px-4 py-3 border-b border-border/50 last:border-0",
                      stop.status === "visited" ? "bg-emerald-50/30" : stop.status === "skipped" ? "bg-muted/30" : "")}>
                      <div className={cn("w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[11px] font-bold",
                        stop.status === "visited" ? "bg-emerald-100 text-emerald-700" : stop.status === "skipped" ? "bg-muted text-muted-foreground" : "bg-brand-100 text-brand-700")}>
                        {stop.status === "visited" ? <Check className="w-3 h-3" /> : stop.seq}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-foreground">{stop.customer}</p>
                        <p className="text-[11px] text-muted-foreground">{stop.address}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-medium text-foreground">{stop.timeSlot}</p>
                        <p className="text-[10px] text-muted-foreground">{stop.purpose}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
