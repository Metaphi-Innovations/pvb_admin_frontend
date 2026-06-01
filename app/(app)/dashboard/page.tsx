"use client";

import React from "react";
import { AppLayout, PageShell, GridLayout, TwoColumnLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { KPICard } from "@/components/ui/KPICard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  ShoppingBag, IndianRupee, Users, Wheat, TrendingUp,
  ClipboardList, Package, CheckCircle2,
} from "lucide-react";

// ── Mini bar chart (CSS-only, no chart library needed for foundation) ──────────
function MiniBarChart({ data }: { data: number[] }) {
  const max = Math.max(...data);
  return (
    <div className="flex items-end gap-0.5 h-8">
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm bg-brand-200 hover:bg-brand-400 transition-colors"
          style={{ height: `${(v / max) * 100}%`, minHeight: "3px" }}
        />
      ))}
    </div>
  );
}

// ── Approval row ───────────────────────────────────────────────────────────────
function ApprovalCard({
  label, value, from,
}: { label: string; value: string; from: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors cursor-pointer">
      <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0">
        <ClipboardList className="w-4 h-4 text-amber-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-foreground truncate">{label}</p>
        <p className="text-helper text-muted-foreground truncate">{from}</p>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className="text-xs font-semibold text-foreground">{value}</span>
        <StatusBadge status="pending" size="sm" showDot={false} />
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  return (
    <AppLayout>
      <PageShell>
        <PageHeader
          title="Dashboard"
          description="Welcome back, Rajesh — here's your territory overview"
          breadcrumbs={[{ label: "Home", href: "/" }, { label: "Dashboard" }]}
          actions={
            <div className="flex items-center gap-2">
              <span className="text-helper text-muted-foreground">FY 2024–25</span>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-2.5 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                Live
              </span>
            </div>
          }
        />

        {/* ── KPI row ── */}
        <GridLayout cols={4}>
          <KPICard
            title="Total Sales"
            value="₹48.2L"
            subtitle="This month"
            change={{ value: 12.4 }}
            icon={IndianRupee}
            accent="orange"
            footer={<MiniBarChart data={[30, 45, 38, 52, 48, 60, 55, 72, 65, 80, 74, 82]} />}
          />
          <KPICard
            title="Orders"
            value="1,234"
            subtitle="Active orders"
            change={{ value: 8.1 }}
            icon={ShoppingBag}
            accent="leaf"
          />
          <KPICard
            title="Farmers"
            value="24,810"
            subtitle="Registered"
            change={{ value: 5.3 }}
            icon={Wheat}
            accent="amber"
          />
          <KPICard
            title="Distributors"
            value="342"
            subtitle="Active network"
            change={{ value: -2.1 }}
            icon={Users}
            accent="blue"
          />
        </GridLayout>

        {/* ── Second KPI row ── */}
        <GridLayout cols={4}>
          <KPICard
            title="Collection"
            value="₹36.5L"
            subtitle="Received this month"
            change={{ value: 9.8 }}
            icon={TrendingUp}
            accent="orange"
          />
          <KPICard
            title="Pending Dispatch"
            value="87"
            subtitle="Orders awaiting"
            change={{ value: 0 }}
            icon={Package}
            accent="earth"
          />
          <KPICard
            title="Approvals"
            value="25"
            subtitle="Awaiting action"
            change={{ value: -4.2, label: "vs yesterday" }}
            icon={ClipboardList}
            accent="amber"
          />
          <KPICard
            title="Target Achieved"
            value="74%"
            subtitle="Monthly target"
            change={{ value: 3.6 }}
            icon={CheckCircle2}
            accent="leaf"
          />
        </GridLayout>

        {/* ── Main content row ── */}
        <TwoColumnLayout
          sideWidth="340px"
          main={
            <div className="space-y-4">
              {/* Sales trend (placeholder chart) */}
              <div className="bg-white rounded-card border border-border shadow-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-card-title text-foreground">Sales Trend</p>
                    <p className="text-helper text-muted-foreground">Monthly performance vs target</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {[
                      { label: "Actual", color: "bg-brand-500" },
                      { label: "Target", color: "bg-earth-300" },
                    ].map(l => (
                      <span key={l.label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className={`w-2.5 h-2.5 rounded-sm ${l.color}`} />
                        {l.label}
                      </span>
                    ))}
                  </div>
                </div>
                {/* Chart placeholder */}
                <div className="h-48 flex items-end gap-3 px-2">
                  {[
                    { m: "Jul", actual: 68, target: 80 },
                    { m: "Aug", actual: 72, target: 80 },
                    { m: "Sep", actual: 65, target: 75 },
                    { m: "Oct", actual: 88, target: 85 },
                    { m: "Nov", actual: 94, target: 90 },
                    { m: "Dec", actual: 78, target: 85 },
                    { m: "Jan", actual: 82, target: 85 },
                    { m: "Feb", actual: 91, target: 90 },
                    { m: "Mar", actual: 96, target: 95 },
                    { m: "Apr", actual: 74, target: 90 },
                    { m: "May", actual: 80, target: 90 },
                    { m: "Jun", actual: 48, target: 90 },
                  ].map(d => (
                    <div key={d.m} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex items-end gap-0.5" style={{ height: "160px" }}>
                        <div
                          className="flex-1 rounded-t-sm bg-brand-400 hover:bg-brand-500 transition-colors"
                          style={{ height: `${d.actual}%` }}
                          title={`Actual: ${d.actual}%`}
                        />
                        <div
                          className="flex-1 rounded-t-sm bg-earth-200 hover:bg-earth-300 transition-colors"
                          style={{ height: `${d.target}%` }}
                          title={`Target: ${d.target}%`}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{d.m}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top products */}
              <div className="bg-white rounded-card border border-border shadow-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-card-title text-foreground">Top Products</p>
                  <button className="text-[11px] text-brand-600 hover:underline font-medium">View all</button>
                </div>
                <div className="space-y-3">
                  {[
                    { name: "Urea 50kg",      sales: "₹12.4L", share: 82, change: "+4%" },
                    { name: "DAP 50kg",       sales: "₹9.8L",  share: 65, change: "+2%" },
                    { name: "NPK 10:26:26",   sales: "₹7.2L",  share: 48, change: "-1%" },
                    { name: "Zinc Sulphate",  sales: "₹4.6L",  share: 31, change: "+8%" },
                  ].map(p => (
                    <div key={p.name} className="flex items-center gap-3">
                      <p className="text-[13px] font-medium text-foreground w-36 flex-shrink-0 truncate">{p.name}</p>
                      <div className="flex-1 bg-muted/50 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-brand-400 transition-all"
                          style={{ width: `${p.share}%` }}
                        />
                      </div>
                      <span className="text-[12px] font-semibold text-foreground w-14 text-right flex-shrink-0">{p.sales}</span>
                      <span className={`text-[11px] font-medium w-8 text-right flex-shrink-0 ${p.change.startsWith("+") ? "text-emerald-600" : "text-red-500"}`}>
                        {p.change}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          }
          side={
            <div className="space-y-4">
              <QuickActions />

              {/* Pending approvals widget */}
              <div className="bg-white rounded-card border border-border shadow-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-card-title text-foreground">Pending Approvals</p>
                  <span className="text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-2 py-0.5">
                    25
                  </span>
                </div>
                <div className="space-y-2">
                  <ApprovalCard label="PO #2341 — Urea 50kg"      value="₹4.2L"  from="Nashik Warehouse" />
                  <ApprovalCard label="Expense: Ramkumar M."       value="₹2,800" from="Travel — Akola" />
                  <ApprovalCard label="Leave: Priya Desai"         value="3 days" from="HR Department" />
                </div>
                <button className="mt-3 w-full text-center text-xs text-brand-600 font-medium hover:underline">
                  View all 25 approvals →
                </button>
              </div>

              <ActivityFeed />
            </div>
          }
        />
      </PageShell>
    </AppLayout>
  );
}
