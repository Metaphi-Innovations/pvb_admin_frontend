"use client";

import React, { useState } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  Legend, ResponsiveContainer, RadialBarChart, RadialBar,
  AreaChart, Area,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp, TrendingDown, IndianRupee, ShoppingBag, Package,
  Users, Wheat, ClipboardList, Download, Info, AlertCircle,
  Loader2, BarChart3, PieChart as PieIcon, LineChart as LineIcon,
  Target, Table2, Filter, BookOpen,
} from "lucide-react";

// ── Brand palette (mirrors tokens.ts) ────────────────────────────────────────
const C = {
  brand:   ["#D96A10", "#F47920", "#1A3A96", "#267A2E", "#FFCB90"],
  sage:    "#7c9a7e",
  olive:   "#6b7c3a",
  amber:   "#f59e0b",
  red:     "#ef4444",
  blue:    "#0ea5e9",
  purple:  "#a855f7",
  earth:   "#bca98a",
  muted:   "#e5e7eb",
};
const PALETTE = [C.brand[0], C.sage, C.olive, C.amber, C.blue, C.purple, C.earth, C.red];

// ── Shared chart card shell ───────────────────────────────────────────────────
function ChartCard({
  title, subtitle, filterOptions, footer, children,
}: {
  title: string;
  subtitle?: string;
  filterOptions?: string[];
  footer?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-border rounded-card shadow-card overflow-hidden">
      <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-border/60">
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {filterOptions && (
            <Select defaultValue={filterOptions[0]}>
              <SelectTrigger className="h-7 text-xs w-28 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {filterOptions.map(o => (
                  <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <button className="p-1.5 rounded-md hover:bg-muted transition-colors">
            <Download className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button className="p-1.5 rounded-md hover:bg-muted transition-colors">
            <Info className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="px-5 py-4">{children}</div>

      {footer && (
        <div className="px-5 pb-3">
          <p className="text-[11px] text-muted-foreground border-t border-border/50 pt-2.5">
            {footer}
          </p>
        </div>
      )}
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KPIAnalyticCard({
  title, value, sub, change, icon: Icon, accent, prefix = "",
}: {
  title: string; value: string; sub: string;
  change: { val: number; label?: string };
  icon: React.ElementType; accent: string; prefix?: string;
}) {
  const up = change.val >= 0;
  return (
    <div className={`bg-white border border-border rounded-card p-4 shadow-card`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center`}
          style={{ backgroundColor: accent + "20", border: `1px solid ${accent}40` }}>
          <Icon className="w-4.5 h-4.5" style={{ color: accent }} />
        </div>
        <span className={`flex items-center gap-0.5 text-xs font-semibold ${up ? "text-emerald-600" : "text-red-500"}`}>
          {up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          {Math.abs(change.val)}%
        </span>
      </div>
      <p className="text-xl font-bold text-foreground">{prefix}{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      <p className="text-[11px] text-muted-foreground mt-1">{change.label ?? "vs last month"}</p>
      <div className="mt-2 h-0.5 w-full bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: "68%", backgroundColor: accent }} />
      </div>
    </div>
  );
}

// ── Mock data ─────────────────────────────────────────────────────────────────
const MONTHS = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];

const salesTrend = MONTHS.map((m, i) => ({
  month: m,
  sales:  [32, 41, 35, 56, 48, 62, 58, 74, 68, 45, 52, 60][i],
  target: [40, 45, 45, 60, 55, 65, 65, 75, 70, 60, 65, 70][i],
  orders: [18, 24, 20, 32, 28, 38, 35, 44, 40, 27, 31, 36][i],
}));

const territoryBar = [
  { name: "Nashik",      sales: 48, target: 55 },
  { name: "Pune",        sales: 62, target: 60 },
  { name: "Aurangabad",  sales: 35, target: 45 },
  { name: "Kolhapur",    sales: 52, target: 50 },
  { name: "Nagpur",      sales: 41, target: 48 },
  { name: "Amravati",    sales: 28, target: 35 },
];

const categoryBar = [
  { name: "Fertilizers", value: 42 },
  { name: "Seeds",       value: 28 },
  { name: "Pesticides",  value: 18 },
  { name: "Equipment",   value: 8  },
  { name: "Others",      value: 4  },
];

const orderStatus = [
  { name: "Delivered", value: 42, color: C.brand[0] },
  { name: "Pending",   value: 23, color: C.amber     },
  { name: "Dispatch",  value: 18, color: C.blue       },
  { name: "Cancelled", value: 10, color: C.red        },
  { name: "Draft",     value: 7,  color: C.muted      },
];

const farmerGrowth = MONTHS.map((m, i) => ({
  month: m,
  farmers: [980, 1050, 1120, 1240, 1310, 1400, 1480, 1560, 1630, 1700, 1760, 1840][i],
}));

const claimsData = [
  { name: "Travel",     amount: 142, count: 34 },
  { name: "Lodging",    amount: 88,  count: 22 },
  { name: "Fuel",       amount: 210, count: 58 },
  { name: "Allowance",  amount: 96,  count: 41 },
  { name: "Demo",       amount: 54,  count: 15 },
];

const topProducts = [
  { name: "Urea 50kg",      sales: "₹12.4L", units: 1240, share: 82, trend: "+4%" },
  { name: "DAP 50kg",       sales: "₹9.8L",  units: 892,  share: 65, trend: "+2%" },
  { name: "NPK 10:26:26",   sales: "₹7.2L",  units: 620,  share: 48, trend: "-1%" },
  { name: "Zinc Sulphate",  sales: "₹4.6L",  units: 410,  share: 31, trend: "+8%" },
  { name: "Hybrid Maize",   sales: "₹3.1L",  units: 310,  share: 21, trend: "+5%" },
];

const TARGETS = [
  { label: "Sales Target",         value: 74, color: C.brand[0] },
  { label: "Collection Target",    value: 81, color: C.sage      },
  { label: "Dispatch Completion",  value: 62, color: C.blue      },
  { label: "Demo Completion",      value: 55, color: C.olive     },
  { label: "Attendance",           value: 91, color: C.amber     },
];

// ─────────────────────────────────────────────────────────────────────────────
// SECTION TABS
// ─────────────────────────────────────────────────────────────────────────────
export default function ChartsSection() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="kpi">
        <div className="border-b border-border mb-6">
          <TabsList className="inline-flex h-auto bg-transparent p-0 gap-0">
            {[
              { id: "kpi",      label: "KPI Cards",    icon: BarChart3 },
              { id: "line",     label: "Line Charts",  icon: LineIcon  },
              { id: "bar",      label: "Bar Charts",   icon: BarChart3 },
              { id: "donut",    label: "Donut / Pie",  icon: PieIcon   },
              { id: "progress", label: "Progress",     icon: Target    },
              { id: "table",    label: "Tables",       icon: Table2    },
              { id: "filters",  label: "Filters",      icon: Filter    },
              { id: "states",   label: "States",       icon: AlertCircle },
              { id: "guide",    label: "Usage Guide",  icon: BookOpen  },
            ].map(({ id, label, icon: Icon }) => (
              <TabsTrigger
                key={id} value={id}
                className="flex items-center gap-1.5 text-xs font-medium rounded-none border-b-2 border-transparent px-4 py-2.5 data-[state=active]:border-brand-500 data-[state=active]:text-brand-700"
              >
                <Icon className="w-3.5 h-3.5" />{label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* ── 1. KPI CARDS ── */}
        <TabsContent value="kpi">
          <div className="space-y-6">
            <p className="text-xs text-muted-foreground">
              Reusable KPI card patterns for Sales, Inventory, Accounts, HR and more.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <KPIAnalyticCard title="Total Sales"       value="₹48.2L"  sub="This month"        change={{ val: 12.4 }} icon={IndianRupee}  accent={C.brand[0]} />
              <KPIAnalyticCard title="Pending Orders"    value="87"       sub="Awaiting dispatch" change={{ val: -3.2 }} icon={ShoppingBag}  accent={C.amber}    />
              <KPIAnalyticCard title="Inventory Value"   value="₹1.2Cr"  sub="Total stock"       change={{ val: 4.1  }} icon={Package}      accent={C.blue}     />
              <KPIAnalyticCard title="Outstanding (AR)"  value="₹22.4L"  sub="Overdue 30+ days"  change={{ val: -8.5 }} icon={IndianRupee}  accent={C.red}      />
              <KPIAnalyticCard title="Active Farmers"    value="24,810"   sub="Registered"        change={{ val: 5.3  }} icon={Wheat}        accent={C.olive}    />
              <KPIAnalyticCard title="Claims Pending"    value="₹3.8L"   sub="Awaiting approval" change={{ val: 2.1  }} icon={ClipboardList} accent={C.purple}  />
            </div>

            <div className="bg-brand-50 border border-brand-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-brand-700 mb-2">KPI Card Structure</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-brand-600">
                <span>• Icon with accent colour badge</span>
                <span>• Trend indicator (↑↓ %)</span>
                <span>• Primary value (large)</span>
                <span>• Subtitle / period</span>
                <span>• Comparison label</span>
                <span>• Progress bar for target</span>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── 2. LINE CHARTS ── */}
        <TabsContent value="line">
          <div className="space-y-6">
            {/* Sales trend single */}
            <ChartCard
              title="Sales Trend"
              subtitle="Monthly actual vs target (₹ Lakhs)"
              filterOptions={["FY 2024-25", "FY 2023-24", "Last 6M"]}
              footer="May peak indicates pre-Kharif season push. Jun dip due to monsoon onset."
            >
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={salesTrend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.brand[0]} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={C.brand[0]} stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.muted} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <ReTooltip contentStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="sales"  stroke={C.brand[0]} strokeWidth={2} fill="url(#gSales)" name="Actual (₹L)" />
                  <Line  type="monotone" dataKey="target" stroke={C.earth}    strokeWidth={2} strokeDasharray="5 3" dot={false} name="Target (₹L)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Multi-line: sales + orders */}
            <ChartCard
              title="Sales + Orders Trend"
              subtitle="Dual-metric comparison — normalised scale"
              filterOptions={["Monthly", "Weekly", "Quarterly"]}
              footer="Orders spike precedes sales by ~3 weeks. Use to forecast revenue."
            >
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={salesTrend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.muted} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <ReTooltip contentStyle={{ fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="sales"  stroke={C.brand[0]} strokeWidth={2} dot={{ r: 3 }} name="Sales (₹L)"  />
                  <Line type="monotone" dataKey="orders" stroke={C.blue}     strokeWidth={2} dot={{ r: 3 }} name="Orders"      />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Farmer growth */}
            <ChartCard
              title="Farmer Registration Growth"
              subtitle="Cumulative farmers registered — FY 2024-25"
              filterOptions={["All States", "Maharashtra", "Karnataka"]}
              footer="Target: 2,000 farmers by June 2025. On track at current acquisition rate."
            >
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={farmerGrowth} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gFarmer" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.olive} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={C.olive} stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.muted} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <ReTooltip contentStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="farmers" stroke={C.olive} strokeWidth={2} fill="url(#gFarmer)" name="Farmers" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </TabsContent>

        {/* ── 3. BAR CHARTS ── */}
        <TabsContent value="bar">
          <div className="space-y-6">
            {/* Grouped: territory target vs actual */}
            <ChartCard
              title="Territory Performance"
              subtitle="Sales vs Target by territory (₹ Lakhs)"
              filterOptions={["This Month", "This Quarter", "YTD"]}
              footer="Pune exceeded target. Aurangabad and Amravati need field support."
            >
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={territoryBar} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.muted} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <ReTooltip contentStyle={{ fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="sales"  name="Actual"  fill={C.brand[0]} radius={[4,4,0,0]} />
                  <Bar dataKey="target" name="Target"  fill={C.brand[3]} radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Horizontal: category */}
            <ChartCard
              title="Sales by Product Category"
              subtitle="Revenue share % — current FY"
              filterOptions={["Revenue %", "Units", "Orders"]}
              footer="Fertilizers dominate. Seeds growing YoY (+12%). Equipment underperforming."
            >
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  layout="vertical"
                  data={categoryBar}
                  margin={{ top: 4, right: 16, left: 60, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={C.muted} />
                  <XAxis type="number" tick={{ fontSize: 11 }} unit="%" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={60} />
                  <ReTooltip contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="value" name="Share %" radius={[0,4,4,0]}>
                    {categoryBar.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Claims by category */}
            <ChartCard
              title="Expense Claims by Category"
              subtitle="Amount (₹K) and count — current month"
              filterOptions={["Amount", "Count", "Both"]}
              footer="Fuel claims highest in volume. Lodging highest per claim value."
            >
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={claimsData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.muted} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <ReTooltip contentStyle={{ fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="amount" name="Amount (₹K)" fill={C.purple}  radius={[4,4,0,0]} />
                  <Bar dataKey="count"  name="No. Claims"  fill={C.brand[2]} radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </TabsContent>

        {/* ── 4. DONUT / PIE ── */}
        <TabsContent value="donut">
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Order status */}
              <ChartCard
                title="Order Status Distribution"
                subtitle="All orders — current month"
                filterOptions={["This Month", "This Quarter"]}
                footer="23% pending dispatch is above threshold. Escalate logistics."
              >
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie
                        data={orderStatus} cx="50%" cy="50%"
                        innerRadius={48} outerRadius={72}
                        paddingAngle={3} dataKey="value"
                      >
                        {orderStatus.map((d, i) => (
                          <Cell key={i} fill={d.color} />
                        ))}
                      </Pie>
                      <ReTooltip contentStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 flex-1">
                    {orderStatus.map((d) => (
                      <div key={d.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                          <span className="text-xs text-foreground">{d.name}</span>
                        </div>
                        <span className="text-xs font-semibold text-foreground">{d.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </ChartCard>

              {/* Product mix */}
              <ChartCard
                title="Product Mix — Revenue Share"
                subtitle="Category-wise contribution"
                filterOptions={["Revenue", "Volume"]}
                footer="Top 2 categories = 70% revenue. Diversification opportunity exists."
              >
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie
                        data={categoryBar} cx="50%" cy="50%"
                        outerRadius={72} paddingAngle={2} dataKey="value"
                      >
                        {categoryBar.map((_, i) => (
                          <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                        ))}
                      </Pie>
                      <ReTooltip contentStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 flex-1">
                    {categoryBar.map((d, i) => (
                      <div key={d.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: PALETTE[i] }} />
                          <span className="text-xs text-foreground">{d.name}</span>
                        </div>
                        <span className="text-xs font-semibold text-foreground">{d.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </ChartCard>
            </div>
          </div>
        </TabsContent>

        {/* ── 5. PROGRESS / TARGET ── */}
        <TabsContent value="progress">
          <div className="space-y-6">
            <ChartCard
              title="Monthly Target Achievement"
              subtitle="Current month — all KPIs"
              filterOptions={["May 2025", "Apr 2025", "Mar 2025"]}
              footer="Sales and Attendance on track. Dispatch needs immediate attention."
            >
              <div className="space-y-4">
                {TARGETS.map((t) => (
                  <div key={t.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-medium text-foreground">{t.label}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">{t.value}%</span>
                        <Badge
                          variant="outline"
                          className="text-[10px] h-5 px-1.5"
                          style={{
                            color:       t.value >= 75 ? "#2d5a2e" : t.value >= 50 ? "#92400e" : "#991b1b",
                            borderColor: t.value >= 75 ? "#a8d5ab" : t.value >= 50 ? "#fcd34d" : "#fca5a5",
                            backgroundColor: t.value >= 75 ? "#f0faf0" : t.value >= 50 ? "#fef9ec" : "#fef2f2",
                          }}
                        >
                          {t.value >= 75 ? "On Track" : t.value >= 50 ? "At Risk" : "Behind"}
                        </Badge>
                      </div>
                    </div>
                    <div className="h-2 bg-muted/60 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${t.value}%`, backgroundColor: t.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>

            {/* Radial gauge */}
            <ChartCard
              title="Overall Target Gauge"
              subtitle="Weighted score across all KPIs"
              footer="Overall score 72.6% — 3 of 5 KPIs on track."
            >
              <div className="flex items-center justify-center gap-10">
                <ResponsiveContainer width={180} height={180}>
                  <RadialBarChart
                    innerRadius="40%" outerRadius="90%"
                    data={TARGETS.map(t => ({ ...t, fill: t.color }))}
                    startAngle={180} endAngle={0}
                  >
                    <RadialBar dataKey="value" cornerRadius={4} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {TARGETS.map((t) => (
                    <div key={t.label} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                      <span className="text-xs text-foreground">{t.label}</span>
                      <span className="text-xs font-semibold ml-auto pl-4">{t.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </ChartCard>
          </div>
        </TabsContent>

        {/* ── 6. ANALYTICS TABLE ── */}
        <TabsContent value="table">
          <div className="space-y-6">
            <ChartCard
              title="Top Products by Revenue"
              subtitle="Current month — units sold & share"
              filterOptions={["Revenue", "Units", "Growth"]}
              footer="Urea drives 32% of total revenue. Monitor DAP supply — high demand."
            >
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left pb-2 font-semibold text-muted-foreground">#</th>
                      <th className="text-left pb-2 font-semibold text-muted-foreground">Product</th>
                      <th className="text-right pb-2 font-semibold text-muted-foreground">Revenue</th>
                      <th className="text-right pb-2 font-semibold text-muted-foreground">Units</th>
                      <th className="text-left pb-2 font-semibold text-muted-foreground px-3">Share</th>
                      <th className="text-right pb-2 font-semibold text-muted-foreground">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((p, i) => (
                      <tr key={p.name} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="py-2.5 text-muted-foreground">{i + 1}</td>
                        <td className="py-2.5 font-medium text-foreground">{p.name}</td>
                        <td className="py-2.5 text-right font-semibold">{p.sales}</td>
                        <td className="py-2.5 text-right text-muted-foreground">{p.units.toLocaleString()}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-brand-400" style={{ width: `${p.share}%` }} />
                            </div>
                            <span className="text-muted-foreground w-7 text-right">{p.share}%</span>
                          </div>
                        </td>
                        <td className={`py-2.5 text-right font-semibold ${p.trend.startsWith("+") ? "text-emerald-600" : "text-red-500"}`}>
                          {p.trend}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>

            <ChartCard
              title="Low Stock Alert"
              subtitle="Items below reorder level"
              filterOptions={["All Warehouses", "Nashik", "Pune"]}
              footer="3 items critically low — raise emergency PO within 48 hours."
            >
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    {["SKU", "Product", "Stock", "Reorder Lvl", "Status"].map(h => (
                      <th key={h} className="text-left pb-2 font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { sku: "F-001", name: "Urea 50kg",    stock: 42,  reorder: 100, status: "critical" },
                    { sku: "F-002", name: "DAP 50kg",     stock: 88,  reorder: 150, status: "low"      },
                    { sku: "S-004", name: "Hybrid Maize", stock: 12,  reorder: 50,  status: "critical" },
                    { sku: "P-007", name: "Endosulfan",   stock: 200, reorder: 250, status: "low"      },
                  ].map(r => (
                    <tr key={r.sku} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="py-2 text-muted-foreground font-mono">{r.sku}</td>
                      <td className="py-2 font-medium text-foreground">{r.name}</td>
                      <td className="py-2 font-bold text-foreground">{r.stock}</td>
                      <td className="py-2 text-muted-foreground">{r.reorder}</td>
                      <td className="py-2">
                        <span className={`inline-flex items-center text-[10px] font-semibold rounded px-2 py-0.5 ${
                          r.status === "critical"
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}>
                          {r.status === "critical" ? "Critical" : "Low"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ChartCard>
          </div>
        </TabsContent>

        {/* ── 7. FILTER CONTROLS ── */}
        <TabsContent value="filters">
          <div className="space-y-6">
            <ChartCard title="Dashboard Filter Controls" subtitle="Reusable filter bar for analytics pages">
              <div className="space-y-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Standard Filter Bar</p>
                <div className="flex flex-wrap gap-3 p-4 bg-muted/20 rounded-lg border border-border">
                  {[
                    { label: "Period",    opts: ["This Month","Last Month","This Quarter","FY 2024-25"] },
                    { label: "State",     opts: ["All States","Maharashtra","Karnataka","Gujarat"]      },
                    { label: "Territory", opts: ["All Territories","Pune North","Nashik","Aurangabad"]  },
                    { label: "Category",  opts: ["All Categories","Fertilizers","Seeds","Pesticides"]   },
                    { label: "Employee",  opts: ["All Employees","Rajesh Kumar","Priya Desai"]          },
                    { label: "Status",    opts: ["All Statuses","Pending","Approved","Rejected"]        },
                  ].map(f => (
                    <div key={f.label} className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase">{f.label}</label>
                      <Select defaultValue={f.opts[0]}>
                        <SelectTrigger className="h-8 text-xs w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {f.opts.map(o => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                  <div className="flex items-end gap-2">
                    <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700">Apply</Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs">Reset</Button>
                  </div>
                </div>

                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-4">Quick Period Toggles</p>
                <div className="flex flex-wrap gap-2">
                  {["Today","Yesterday","This Week","Last Week","This Month","Last Month","This Quarter","This FY"].map(p => (
                    <button
                      key={p}
                      className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-brand-50 hover:border-brand-300 hover:text-brand-700 transition-colors"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </ChartCard>
          </div>
        </TabsContent>

        {/* ── 8. EMPTY / LOADING / ERROR STATES ── */}
        <TabsContent value="states">
          <div className="grid md:grid-cols-3 gap-4">
            {/* Loading skeleton */}
            <div className="bg-white border border-border rounded-card p-5 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <div className="space-y-1.5">
                  <div className="h-3.5 w-28 bg-muted rounded animate-pulse" />
                  <div className="h-2.5 w-20 bg-muted/60 rounded animate-pulse" />
                </div>
                <div className="h-7 w-24 bg-muted rounded animate-pulse" />
              </div>
              <div className="h-[180px] flex items-end gap-2">
                {[60,40,75,50,85,65,90,70].map((h,i) => (
                  <div key={i} className="flex-1 bg-muted rounded-t animate-pulse" style={{ height: `${h}%` }} />
                ))}
              </div>
              <div className="mt-3 h-2.5 w-full bg-muted/60 rounded animate-pulse" />
              <p className="text-xs text-muted-foreground text-center mt-4">Chart Loading State</p>
            </div>

            {/* No data */}
            <div className="bg-white border border-border rounded-card p-5 shadow-card flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Sales Trend</p>
                  <p className="text-xs text-muted-foreground">No data for period</p>
                </div>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-muted rounded-lg">
                <BarChart3 className="w-10 h-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-semibold text-foreground">No data available</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[160px]">
                  No records match the selected filters.
                </p>
                <button className="mt-4 text-xs text-brand-600 font-medium hover:underline">
                  Clear filters
                </button>
              </div>
            </div>

            {/* Error state */}
            <div className="bg-white border border-border rounded-card p-5 shadow-card flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Territory Chart</p>
                  <p className="text-xs text-muted-foreground">Failed to load</p>
                </div>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-red-200 bg-red-50/40 rounded-lg">
                <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
                <p className="text-sm font-semibold text-red-700">Failed to load chart</p>
                <p className="text-xs text-red-500 mt-1">Could not fetch analytics data.</p>
                <button className="mt-4 text-xs font-medium text-red-600 hover:underline flex items-center gap-1">
                  <Loader2 className="w-3.5 h-3.5" /> Retry
                </button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── 9. USAGE GUIDE ── */}
        <TabsContent value="guide">
          <div className="space-y-4">
            {[
              {
                module: "Sales Dashboard",
                color: C.brand[0],
                charts: ["KPI: Total Sales, Pending Orders, Collections", "Area Line: Monthly sales trend vs target", "Grouped Bar: Territory performance", "Donut: Order status distribution", "Table: Top products, top territories"],
              },
              {
                module: "Inventory Dashboard",
                color: C.blue,
                charts: ["KPI: Total stock value, Low stock count, Turnover ratio", "Bar: Stock by warehouse (horizontal)", "Line: Inventory movement / consumption trend", "Table: Low stock items, reorder alerts"],
              },
              {
                module: "Accounts Dashboard",
                color: C.purple,
                charts: ["KPI: AR outstanding, AP outstanding, Cash balance", "Area Line: Cash flow trend", "Donut: Receivable ageing buckets (30/60/90d)", "Table: Overdue payments, top debtors"],
              },
              {
                module: "Procurement Dashboard",
                color: C.earth,
                charts: ["KPI: PR count, PO value, GRN pending", "Donut: PO status (open/partial/closed)", "Bar: Supplier-wise PO value", "Line: GRN trend (monthly)"],
              },
              {
                module: "Farmer Dashboard",
                color: C.olive,
                charts: ["KPI: Total farmers, new registrations, active surveys", "Area Line: Cumulative farmer growth", "Donut: Crop mix distribution", "Bar: Farmer count by territory", "Table: Recent registrations, pending surveys"],
              },
              {
                module: "Attendance Dashboard",
                color: C.amber,
                charts: ["KPI: Attendance %, present count, absent count", "Line: Daily attendance trend", "Bar: Dept-wise attendance", "Table: Absent employees, late marks"],
              },
              {
                module: "Claims Dashboard",
                color: C.red,
                charts: ["KPI: Total claimed, approved, pending, rejected", "Bar: Claims by category", "Donut: Claim status distribution", "Line: Monthly claim trend", "Table: Pending approvals"],
              },
              {
                module: "Events / Demo Dashboard",
                color: C.sage,
                charts: ["KPI: Events planned, completed, attendance", "Progress: Completion rate bars", "Bar: Events by territory", "Table: Upcoming events, attendance list"],
              },
            ].map((item) => (
              <div key={item.module} className="bg-white border border-border rounded-card p-4 shadow-card">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-3 h-8 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <p className="text-sm font-semibold text-foreground">{item.module}</p>
                </div>
                <div className="ml-6 grid grid-cols-1 md:grid-cols-2 gap-1.5">
                  {item.charts.map((c, i) => (
                    <p key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      {c}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
