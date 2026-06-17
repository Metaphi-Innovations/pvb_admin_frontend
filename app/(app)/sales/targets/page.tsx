"use client";

import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Target, Plus, Download, TrendingUp, TrendingDown, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface SalesTarget {
  id: number;
  salesperson: string;
  territory: string;
  period: string;
  targetAmount: number;
  achievedAmount: number;
  targetOrders: number;
  achievedOrders: number;
}

const SEED: SalesTarget[] = [
  { id: 1, salesperson: "Rajesh Kumar", territory: "North Zone", period: "Jan 2024", targetAmount: 500000, achievedAmount: 342000, targetOrders: 20, achievedOrders: 14 },
  { id: 2, salesperson: "Priya Singh", territory: "South Zone", period: "Jan 2024", targetAmount: 450000, achievedAmount: 388500, targetOrders: 18, achievedOrders: 17 },
  { id: 3, salesperson: "Amit Sharma", territory: "East Zone", period: "Jan 2024", targetAmount: 400000, achievedAmount: 301500, targetOrders: 16, achievedOrders: 11 },
  { id: 4, salesperson: "Neha Patel", territory: "West Zone", period: "Jan 2024", targetAmount: 600000, achievedAmount: 512000, targetOrders: 22, achievedOrders: 20 },
  { id: 5, salesperson: "Vikram Das", territory: "Central Zone", period: "Jan 2024", targetAmount: 350000, achievedAmount: 92000, targetOrders: 14, achievedOrders: 4 },
];

function ProgressBar({ achieved, target }: { achieved: number; target: number }) {
  const pct = Math.min(100, Math.round((achieved / target) * 100));
  const color = pct >= 100 ? "bg-emerald-500" : pct >= 70 ? "bg-brand-500" : pct >= 40 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn("text-xs font-semibold w-10 text-right",
        pct >= 100 ? "text-emerald-600" : pct >= 70 ? "text-brand-600" : pct >= 40 ? "text-amber-600" : "text-red-600")}>
        {pct}%
      </span>
    </div>
  );
}

export default function TargetsPage() {
  const [targets] = useState<SalesTarget[]>(SEED);
  const [period, setPeriod] = useState("Jan 2024");

  const totalTarget = targets.reduce((s, t) => s + t.targetAmount, 0);
  const totalAchieved = targets.reduce((s, t) => s + t.achievedAmount, 0);
  const overallPct = Math.round((totalAchieved / totalTarget) * 100);

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Sales Targets</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Monitor team performance against targets</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={period} onChange={e => setPeriod(e.target.value)}
              className="h-8 px-2.5 text-xs border border-border rounded-lg bg-white focus:outline-none">
              <option>Jan 2024</option>
              <option>Feb 2024</option>
              <option>Mar 2024</option>
            </select>
            <button className="h-8 px-3 text-xs border border-border rounded-lg inline-flex items-center gap-1.5 font-medium text-muted-foreground hover:bg-muted transition-colors">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <button className="h-8 px-3 text-xs rounded-lg inline-flex items-center gap-1.5 font-medium bg-brand-600 hover:bg-brand-700 text-white transition-colors">
              <Plus className="w-3.5 h-3.5" /> Set Target
            </button>
          </div>
        </div>

        {/* Overall KPI */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Overall Achievement", value: `${overallPct}%`, icon: Target, accent: true },
            { label: "Total Target", value: `₹${(totalTarget / 100000).toFixed(1)}L`, icon: TrendingUp },
            { label: "Achieved", value: `₹${(totalAchieved / 100000).toFixed(1)}L`, icon: TrendingUp },
            { label: "Salespeople", value: targets.length, icon: Users },
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

        {/* Target cards */}
        <div className="space-y-3">
          {targets.map(t => {
            const amtPct = Math.min(100, Math.round((t.achievedAmount / t.targetAmount) * 100));
            const ordPct = Math.min(100, Math.round((t.achievedOrders / t.targetOrders) * 100));
            return (
              <div key={t.id} className="bg-white border border-border rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.salesperson}</p>
                    <p className="text-[11px] text-muted-foreground">{t.territory} · {t.period}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-foreground">₹{t.achievedAmount.toLocaleString()} / ₹{t.targetAmount.toLocaleString()}</p>
                    <p className="text-[11px] text-muted-foreground">{t.achievedOrders} of {t.targetOrders} orders</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-[11px] text-muted-foreground">Revenue Achievement</span>
                      <span className={cn("text-[11px] font-semibold", amtPct >= 100 ? "text-emerald-600" : amtPct >= 70 ? "text-brand-600" : "text-amber-600")}>{amtPct}%</span>
                    </div>
                    <ProgressBar achieved={t.achievedAmount} target={t.targetAmount} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-[11px] text-muted-foreground">Order Volume</span>
                      <span className={cn("text-[11px] font-semibold", ordPct >= 100 ? "text-emerald-600" : ordPct >= 70 ? "text-brand-600" : "text-amber-600")}>{ordPct}%</span>
                    </div>
                    <ProgressBar achieved={t.achievedOrders} target={t.targetOrders} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
