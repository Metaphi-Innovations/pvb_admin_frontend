"use client";

import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MapPin, Users, Calendar, CheckCircle2, XCircle, Clock,
  AlertTriangle, TrendingUp, Filter, Plus,
  ChevronDown, ChevronRight, MoreHorizontal, Eye,
  Edit2, UserCheck, ThumbsUp, ThumbsDown, Ban,
  Download, Printer, Search, RefreshCw, BarChart2,
  ClipboardList, Target, Activity, Flag, Building2,
  Navigation, ChevronLeft, Check,
} from "lucide-react";

// ── Status System ─────────────────────────────────────────────────────────────
type BeatStatus =
  | "draft" | "planned" | "assigned" | "in-progress"
  | "completed" | "partial" | "missed" | "cancelled"
  | "demo-done" | "demo-pending" | "follow-up";

const STATUS_CONFIG: Record<BeatStatus, { label: string; color: string; bg: string; border: string; dot: string }> = {
  draft:          { label: "Draft",               color: "text-slate-600",   bg: "bg-slate-100",   border: "border-slate-200",  dot: "bg-slate-400" },
  planned:        { label: "Planned",             color: "text-blue-700",    bg: "bg-blue-50",     border: "border-blue-200",   dot: "bg-blue-500" },
  assigned:       { label: "Assigned",            color: "text-violet-700",  bg: "bg-violet-50",   border: "border-violet-200", dot: "bg-violet-500" },
  "in-progress":  { label: "In Progress",         color: "text-amber-700",   bg: "bg-amber-50",    border: "border-amber-200",  dot: "bg-amber-500" },
  completed:      { label: "Completed",           color: "text-green-700",   bg: "bg-green-50",    border: "border-green-200",  dot: "bg-green-500" },
  partial:        { label: "Partially Completed", color: "text-teal-700",    bg: "bg-teal-50",     border: "border-teal-200",   dot: "bg-teal-500" },
  missed:         { label: "Missed",              color: "text-red-700",     bg: "bg-red-50",      border: "border-red-200",    dot: "bg-red-500" },
  cancelled:      { label: "Cancelled",           color: "text-rose-700",    bg: "bg-rose-50",     border: "border-rose-200",   dot: "bg-rose-400" },
  "demo-done":    { label: "Demo Done",           color: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-200",dot: "bg-emerald-500" },
  "demo-pending": { label: "Demo Pending",        color: "text-orange-700",  bg: "bg-orange-50",   border: "border-orange-200", dot: "bg-orange-500" },
  "follow-up":    { label: "Follow-up Required",  color: "text-purple-700",  bg: "bg-purple-50",   border: "border-purple-200", dot: "bg-purple-500" },
};

function StatusBadge({ status, size = "sm" }: { status: BeatStatus; size?: "xs" | "sm" | "md" }) {
  const cfg = STATUS_CONFIG[status];
  const sizeClass = size === "xs" ? "text-[10px] px-1.5 py-0.5" : size === "md" ? "text-xs px-3 py-1" : "text-xs px-2 py-0.5";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium border ${cfg.bg} ${cfg.color} ${cfg.border} ${sizeClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} flex-shrink-0`} />
      {cfg.label}
    </span>
  );
}

// ── Mock Data ─────────────────────────────────────────────────────────────────
const BEAT_PLANS = [
  { id: "BP-2401", territory: "Pune North",          state: "Maharashtra", district: "Pune",       city: "Pune",       employee: "Rahul Sharma",   role: "MR", date: "2024-01-15", beats: 8,  planned: 12, completed: 10, missed: 2, demos: 3, status: "completed"    as BeatStatus, activity: "Joint Work", approver: "Vikram Singh" },
  { id: "BP-2402", territory: "Nashik East",         state: "Maharashtra", district: "Nashik",     city: "Nashik",     employee: "Priya Patil",    role: "SR", date: "2024-01-15", beats: 6,  planned: 9,  completed: 0,  missed: 0, demos: 0, status: "in-progress"  as BeatStatus, activity: "Solo",       approver: "Anita Desai" },
  { id: "BP-2403", territory: "Aurangabad Central",  state: "Maharashtra", district: "Aurangabad", city: "Aurangabad", employee: "Amit Kulkarni",  role: "MR", date: "2024-01-16", beats: 5,  planned: 8,  completed: 5,  missed: 3, demos: 1, status: "partial"      as BeatStatus, activity: "Demo",       approver: "Vikram Singh" },
  { id: "BP-2404", territory: "Nagpur West",         state: "Maharashtra", district: "Nagpur",     city: "Nagpur",     employee: "Sneha Joshi",    role: "TL", date: "2024-01-16", beats: 10, planned: 15, completed: 0,  missed: 0, demos: 0, status: "assigned"     as BeatStatus, activity: "Joint Work", approver: "Ravi Mehta" },
  { id: "BP-2405", territory: "Kolhapur South",      state: "Maharashtra", district: "Kolhapur",   city: "Kolhapur",   employee: "Mahesh Pawar",   role: "MR", date: "2024-01-17", beats: 4,  planned: 7,  completed: 7,  missed: 0, demos: 4, status: "demo-done"    as BeatStatus, activity: "Demo",       approver: "Anita Desai" },
  { id: "BP-2406", territory: "Solapur Rural",       state: "Maharashtra", district: "Solapur",    city: "Solapur",    employee: "Kavita Nair",    role: "SR", date: "2024-01-17", beats: 3,  planned: 6,  completed: 0,  missed: 6, demos: 0, status: "missed"       as BeatStatus, activity: "Solo",       approver: "Vikram Singh" },
  { id: "BP-2407", territory: "Satara East",         state: "Maharashtra", district: "Satara",     city: "Satara",     employee: "Suresh Bonde",   role: "MR", date: "2024-01-18", beats: 7,  planned: 11, completed: 0,  missed: 0, demos: 0, status: "planned"      as BeatStatus, activity: "Solo",       approver: "Ravi Mehta" },
  { id: "BP-2408", territory: "Jalgaon North",       state: "Maharashtra", district: "Jalgaon",    city: "Jalgaon",    employee: "Deepa More",     role: "MR", date: "2024-01-18", beats: 5,  planned: 8,  completed: 2,  missed: 0, demos: 2, status: "follow-up"    as BeatStatus, activity: "Demo",       approver: "Anita Desai" },
  { id: "BP-2409", territory: "Latur Central",       state: "Maharashtra", district: "Latur",      city: "Latur",      employee: "Nitin Gaikwad",  role: "SR", date: "2024-01-18", beats: 0,  planned: 0,  completed: 0,  missed: 0, demos: 0, status: "draft"        as BeatStatus, activity: "Solo",       approver: "—" },
  { id: "BP-2410", territory: "Sangli West",         state: "Maharashtra", district: "Sangli",     city: "Sangli",     employee: "Pooja Shinde",   role: "MR", date: "2024-01-19", beats: 6,  planned: 10, completed: 10, missed: 0, demos: 5, status: "demo-pending" as BeatStatus, activity: "Demo",       approver: "Vikram Singh" },
];

const TERRITORY_TREE = [
  {
    state: "Maharashtra", districts: [
      { name: "Pune",       territories: ["Pune North", "Pune South", "Pune East", "Pune West", "Pimpri-Chinchwad"], plans: 14, completed: 11 },
      { name: "Nashik",     territories: ["Nashik East", "Nashik West", "Nashik Rural", "Igatpuri"],                  plans: 9,  completed: 6 },
      { name: "Nagpur",     territories: ["Nagpur West", "Nagpur East", "Nagpur Central", "Wardha"],                  plans: 12, completed: 8 },
      { name: "Aurangabad", territories: ["Aurangabad Central", "Aurangabad Rural", "Jalna"],                         plans: 7,  completed: 4 },
    ],
  },
  {
    state: "Karnataka", districts: [
      { name: "Belgaum", territories: ["Belgaum North", "Belgaum South", "Hubli"], plans: 8, completed: 5 },
      { name: "Bijapur", territories: ["Bijapur Central", "Bijapur Rural"],         plans: 5, completed: 3 },
    ],
  },
];

const EMPLOYEES = [
  { name: "Rahul Sharma",  role: "MR", territory: "Pune North",          planned: 12, completed: 10, demos: 3, status: "completed"   as BeatStatus, efficiency: 83 },
  { name: "Priya Patil",   role: "SR", territory: "Nashik East",          planned: 9,  completed: 5,  demos: 1, status: "in-progress" as BeatStatus, efficiency: 56 },
  { name: "Amit Kulkarni", role: "MR", territory: "Aurangabad Central",   planned: 8,  completed: 5,  demos: 1, status: "partial"     as BeatStatus, efficiency: 63 },
  { name: "Sneha Joshi",   role: "TL", territory: "Nagpur West",          planned: 15, completed: 14, demos: 6, status: "completed"   as BeatStatus, efficiency: 93 },
  { name: "Mahesh Pawar",  role: "MR", territory: "Kolhapur South",       planned: 7,  completed: 7,  demos: 4, status: "demo-done"   as BeatStatus, efficiency: 100 },
  { name: "Kavita Nair",   role: "SR", territory: "Solapur Rural",        planned: 6,  completed: 0,  demos: 0, status: "missed"      as BeatStatus, efficiency: 0 },
];

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-border p-4 flex items-start gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
        <p className="text-xs font-medium text-foreground mt-1 leading-tight">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab() {
  const kpis = [
    { label: "Total Beat Plans",      value: 48,  sub: "This month",              icon: ClipboardList, color: "bg-blue-100 text-blue-600" },
    { label: "Planned Visits",        value: 312, sub: "Across all plans",        icon: Target,        color: "bg-violet-100 text-violet-600" },
    { label: "Completed Visits",      value: 241, sub: "77.2% completion rate",   icon: CheckCircle2,  color: "bg-green-100 text-green-600" },
    { label: "Pending Visits",        value: 71,  sub: "Yet to be done",          icon: Clock,         color: "bg-amber-100 text-amber-600" },
    { label: "Demo Done",             value: 34,  sub: "Product demos completed", icon: Activity,      color: "bg-emerald-100 text-emerald-600" },
    { label: "Demo Pending",          value: 12,  sub: "Scheduled demos",         icon: Flag,          color: "bg-orange-100 text-orange-600" },
    { label: "Follow-up Required",    value: 18,  sub: "Needs action",            icon: AlertTriangle, color: "bg-purple-100 text-purple-600" },
    { label: "Missed Visits",         value: 9,   sub: "2.9% miss rate",          icon: XCircle,       color: "bg-red-100 text-red-600" },
  ];

  const statusSummary: { status: BeatStatus; count: number }[] = [
    { status: "completed",    count: 14 },
    { status: "in-progress",  count: 8 },
    { status: "planned",      count: 7 },
    { status: "assigned",     count: 5 },
    { status: "partial",      count: 4 },
    { status: "demo-done",    count: 4 },
    { status: "demo-pending", count: 3 },
    { status: "follow-up",    count: 2 },
    { status: "missed",       count: 1 },
    { status: "cancelled",    count: 0 },
    { status: "draft",        count: 0 },
  ];

  const total = statusSummary.reduce((s, x) => s + x.count, 0);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Summary — January 2024</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map((k) => <KpiCard key={k.label} {...k} />)}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border p-5">
        <h4 className="text-sm font-semibold text-foreground mb-4">Beat Plan Status Distribution</h4>
        <div className="grid grid-cols-2 gap-3">
          {statusSummary.filter((s) => s.count > 0).map(({ status, count }) => {
            const pct = Math.round((count / total) * 100);
            const cfg = STATUS_CONFIG[status];
            return (
              <div key={status} className="flex items-center gap-3">
                <StatusBadge status={status} size="xs" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">{count} plans</span>
                    <span className="text-xs font-medium text-foreground">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${cfg.dot}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border p-5">
        <h4 className="text-sm font-semibold text-foreground mb-4">Team Performance — Top Performers</h4>
        <div className="space-y-3">
          {[...EMPLOYEES].sort((a, b) => b.efficiency - a.efficiency).slice(0, 4).map((emp) => (
            <div key={emp.name} className="flex items-center gap-3">
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarFallback className="text-xs bg-brand-100 text-brand-700 font-semibold">
                  {emp.name.split(" ").map((n) => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-foreground truncate">{emp.name}</p>
                  <span className="text-xs font-bold text-foreground ml-2">{emp.efficiency}%</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${emp.efficiency >= 80 ? "bg-green-500" : emp.efficiency >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${emp.efficiency}%` }}
                    />
                  </div>
                  <StatusBadge status={emp.status} size="xs" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Filter Bar ────────────────────────────────────────────────────────────────
function FilterBar() {
  return (
    <div className="bg-white border border-border rounded-xl p-3 mb-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 border border-border rounded-lg text-xs text-muted-foreground bg-muted/30 min-w-[130px]">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
          <span>Jan 1 – Jan 31, 2024</span>
        </div>
        {["State", "District", "City", "Territory", "Location"].map((f) => (
          <select key={f} className="px-2.5 py-1.5 border border-border rounded-lg text-xs text-muted-foreground bg-white focus:outline-none focus:ring-1 focus:ring-brand-400 min-w-[100px]">
            <option value="">{f}</option>
          </select>
        ))}
        {["Employee", "Role", "Status", "Activity Type"].map((f) => (
          <select key={f} className="px-2.5 py-1.5 border border-border rounded-lg text-xs text-muted-foreground bg-white focus:outline-none focus:ring-1 focus:ring-brand-400 min-w-[110px]">
            <option value="">{f}</option>
          </select>
        ))}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input placeholder="Search plans…" className="pl-7 pr-3 py-1.5 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-400 w-36" />
        </div>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
          <RefreshCw className="w-3 h-3" /> Reset
        </Button>
        <Button size="sm" className="h-7 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white ml-auto">
          <Filter className="w-3 h-3" /> Apply Filters
        </Button>
      </div>
    </div>
  );
}

// ── Detail Dialog ─────────────────────────────────────────────────────────────
function BeatDetailDialog({ plan, open, onClose }: {
  plan: typeof BEAT_PLANS[0] | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!plan) return null;

  const visits = [
    { time: "09:15 AM", place: "Rajesh Agro Store",   type: "Retailer",    activity: "Order Collection", outcome: "Order placed ₹4,200",       status: "completed"  as BeatStatus },
    { time: "10:30 AM", place: "Green Field Nursery",  type: "Distributor", activity: "Demo",             outcome: "Demo done — 2 products",     status: "demo-done"  as BeatStatus },
    { time: "11:45 AM", place: "Krishi Seva Kendra",   type: "Retailer",    activity: "Follow-up",        outcome: "Called back later",           status: "follow-up"  as BeatStatus },
    { time: "01:00 PM", place: "Singh Brothers Agri",  type: "Wholesaler",  activity: "Solo",             outcome: "Not available",               status: "missed"     as BeatStatus },
    { time: "02:30 PM", place: "Bharati Seeds Shop",   type: "Retailer",    activity: "Order Collection", outcome: "Order placed ₹1,800",         status: "completed"  as BeatStatus },
  ];

  const timeline = [
    { time: "Jan 15, 08:55 AM", event: "Beat plan started by Rahul Sharma",       type: "start" },
    { time: "Jan 15, 09:15 AM", event: "Visit 1 — Rajesh Agro Store completed",   type: "done" },
    { time: "Jan 15, 10:30 AM", event: "Demo conducted at Green Field Nursery",   type: "demo" },
    { time: "Jan 15, 04:30 PM", event: "Beat plan marked completed",              type: "end" },
    { time: "Jan 15, 05:00 PM", event: "Approved by Vikram Singh",                type: "approve" },
  ];

  const tlColors: Record<string, string> = {
    start: "bg-blue-500", done: "bg-green-500", demo: "bg-emerald-500",
    end: "bg-brand-600", approve: "bg-violet-500",
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-base font-semibold">{plan.id} — {plan.territory}</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{plan.date} · {plan.employee} · {plan.role}</p>
            </div>
            <StatusBadge status={plan.status} size="md" />
          </div>
        </DialogHeader>

        <div className="px-6 py-4 space-y-5">
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Planned Visits", value: plan.planned,   icon: Target },
              { label: "Completed",      value: plan.completed, icon: CheckCircle2 },
              { label: "Missed",         value: plan.missed,    icon: XCircle },
              { label: "Demos Done",     value: plan.demos,     icon: Activity },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-muted/30 rounded-lg p-3 text-center">
                <Icon className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                <p className="text-xl font-bold text-foreground">{value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Visit Log</h4>
            <div className="space-y-2">
              {visits.map((v, i) => (
                <div key={i} className="flex items-start gap-3 bg-white border border-border rounded-lg p-3">
                  <span className="text-[10px] text-muted-foreground w-16 flex-shrink-0 pt-0.5">{v.time}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-semibold text-foreground">{v.place}</p>
                      <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-medium">{v.type}</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded font-medium">{v.activity}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{v.outcome}</p>
                  </div>
                  <StatusBadge status={v.status} size="xs" />
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Activity Timeline</h4>
            <div className="relative pl-5 space-y-3">
              <div className="absolute left-[9px] top-0 bottom-0 w-px bg-border" />
              {timeline.map((t, i) => (
                <div key={i} className="flex items-start gap-3 relative">
                  <span className={`w-[10px] h-[10px] rounded-full flex-shrink-0 mt-0.5 -ml-[1px] ${tlColors[t.type] ?? "bg-slate-400"} z-10`} />
                  <div>
                    <p className="text-xs text-foreground font-medium">{t.event}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{t.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5"><Edit2 className="w-3 h-3" /> Edit Plan</Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 text-green-700 border-green-200 hover:bg-green-50"><ThumbsUp className="w-3 h-3" /> Approve</Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 text-red-700 border-red-200 hover:bg-red-50"><ThumbsDown className="w-3 h-3" /> Reject</Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5"><Download className="w-3 h-3" /> Export</Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5"><Printer className="w-3 h-3" /> Print</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Beat Plans Table Tab ──────────────────────────────────────────────────────
function BeatPlansTab() {
  const [selected, setSelected] = useState<typeof BEAT_PLANS[0] | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground">{BEAT_PLANS.length} beat plans found</p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5"><Download className="w-3 h-3" /> Export</Button>
          <Button size="sm" className="h-7 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"><Plus className="w-3 h-3" /> Create Beat Plan</Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                {["Beat ID", "Territory", "State / District", "City", "Employee", "Role", "Date", "Beats", "Planned", "Completed", "Missed", "Demos", "Activity", "Status", "Approver", "Actions"].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap first:pl-4 last:text-center">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {BEAT_PLANS.map((plan) => (
                <tr key={plan.id} className="hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => setSelected(plan)}>
                  <td className="px-3 py-2.5 pl-4 font-mono font-semibold text-brand-700 whitespace-nowrap">{plan.id}</td>
                  <td className="px-3 py-2.5 font-medium text-foreground whitespace-nowrap">{plan.territory}</td>
                  <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{plan.state} / {plan.district}</td>
                  <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{plan.city}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Avatar className="w-5 h-5 flex-shrink-0">
                        <AvatarFallback className="text-[9px] bg-brand-100 text-brand-700 font-bold">
                          {plan.employee.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-foreground">{plan.employee}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-semibold">{plan.role}</span>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{plan.date}</td>
                  <td className="px-3 py-2.5 text-center font-semibold text-foreground">{plan.beats}</td>
                  <td className="px-3 py-2.5 text-center font-semibold text-blue-600">{plan.planned}</td>
                  <td className="px-3 py-2.5 text-center font-semibold text-green-600">{plan.completed}</td>
                  <td className="px-3 py-2.5 text-center font-semibold text-red-600">{plan.missed}</td>
                  <td className="px-3 py-2.5 text-center font-semibold text-emerald-600">{plan.demos}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-medium">{plan.activity}</span>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap"><StatusBadge status={plan.status} size="xs" /></td>
                  <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{plan.approver}</td>
                  <td className="px-3 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 rounded hover:bg-muted/60 transition-colors">
                          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        {[
                          { icon: Eye,          label: "View Details" },
                          { icon: Edit2,        label: "Edit" },
                          { icon: UserCheck,    label: "Reassign" },
                          { icon: ThumbsUp,     label: "Approve" },
                          { icon: ThumbsDown,   label: "Reject" },
                          { icon: CheckCircle2, label: "Mark Completed" },
                          { icon: Ban,          label: "Cancel" },
                          { icon: Download,     label: "Export" },
                          { icon: Printer,      label: "Print" },
                        ].map(({ icon: Icon, label }) => (
                          <button key={label} className="flex items-center gap-2.5 w-full px-3 py-1.5 text-xs text-foreground hover:bg-muted/60 transition-colors">
                            <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                            {label}
                          </button>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-2.5 border-t border-border flex items-center justify-between bg-muted/20">
          <p className="text-[11px] text-muted-foreground">Showing 1–10 of 48 records</p>
          <div className="flex items-center gap-1">
            <button className="p-1 rounded border border-border hover:bg-muted/60 text-muted-foreground"><ChevronLeft className="w-3.5 h-3.5" /></button>
            {[1, 2, 3, "…", 5].map((p, i) => (
              <button key={i} className={`w-6 h-6 rounded text-[11px] font-medium ${p === 1 ? "bg-brand-600 text-white" : "border border-border hover:bg-muted/60 text-muted-foreground"}`}>{p}</button>
            ))}
            <button className="p-1 rounded border border-border hover:bg-muted/60 text-muted-foreground"><ChevronRight className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      </div>

      <BeatDetailDialog plan={selected} open={!!selected} onClose={() => setSelected(null)} />
    </div>
  );
}

// ── Calendar Tab ──────────────────────────────────────────────────────────────
function CalendarTab() {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const firstDayOffset = 1; // Jan 2024 starts on Monday
  const totalDays = 31;

  const calendarData: Record<number, { id: string; employee: string; status: BeatStatus }[]> = {
    15: [{ id: "BP-2401", employee: "Rahul S.",  status: "completed" }],
    16: [{ id: "BP-2403", employee: "Amit K.",   status: "partial" }, { id: "BP-2404", employee: "Sneha J.",  status: "assigned" }],
    17: [{ id: "BP-2405", employee: "Mahesh P.", status: "demo-done" }, { id: "BP-2406", employee: "Kavita N.", status: "missed" }],
    18: [{ id: "BP-2407", employee: "Suresh B.", status: "planned" }, { id: "BP-2408", employee: "Deepa M.", status: "follow-up" }, { id: "BP-2409", employee: "Nitin G.", status: "draft" }],
    19: [{ id: "BP-2410", employee: "Pooja S.",  status: "demo-pending" }],
    22: [{ id: "BP-2411", employee: "Rahul S.",  status: "planned" }],
    23: [{ id: "BP-2412", employee: "Priya P.",  status: "planned" }],
  };

  const cells: (number | null)[] = [
    ...Array(firstDayOffset).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const today = 18;

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button className="p-1 rounded hover:bg-muted/60"><ChevronLeft className="w-4 h-4 text-muted-foreground" /></button>
          <h3 className="text-sm font-semibold text-foreground">January 2024</h3>
          <button className="p-1 rounded hover:bg-muted/60"><ChevronRight className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <Button size="sm" className="h-7 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white">
          <Plus className="w-3 h-3" /> Add Beat Plan
        </Button>
      </div>

      <div className="grid grid-cols-7 border-b border-border">
        {days.map((d) => (
          <div key={d} className="py-2 text-center text-[11px] font-semibold uppercase text-muted-foreground tracking-wide">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 divide-x divide-y divide-border/40">
        {cells.map((day, idx) => {
          const entries = day ? (calendarData[day] ?? []) : [];
          const isToday = day === today;
          return (
            <div key={idx} className={`min-h-[90px] p-2 ${!day ? "bg-muted/10" : "hover:bg-muted/10 cursor-pointer"} ${isToday ? "bg-brand-50/40" : ""}`}>
              {day && (
                <>
                  <span className={`inline-flex w-6 h-6 items-center justify-center text-xs font-semibold rounded-full mb-1 ${isToday ? "bg-brand-600 text-white" : "text-foreground"}`}>
                    {day}
                  </span>
                  <div className="space-y-0.5">
                    {entries.slice(0, 2).map((e) => {
                      const cfg = STATUS_CONFIG[e.status];
                      return (
                        <div key={e.id} className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium truncate ${cfg.bg} ${cfg.color}`}>
                          {e.id}
                        </div>
                      );
                    })}
                    {entries.length > 2 && (
                      <div className="text-[10px] text-muted-foreground px-1">+{entries.length - 2} more</div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Territory & Team Tab ──────────────────────────────────────────────────────
function TerritoryTeamTab() {
  const [openStates, setOpenStates]       = useState<Record<string, boolean>>({ Maharashtra: true });
  const [openDistricts, setOpenDistricts] = useState<Record<string, boolean>>({ Pune: true });

  return (
    <div className="grid grid-cols-5 gap-4">
      {/* Territory Accordion */}
      <div className="col-span-3 bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h4 className="text-sm font-semibold text-foreground">Territory Hierarchy</h4>
          <p className="text-[11px] text-muted-foreground mt-0.5">State → District → Territory</p>
        </div>
        <div className="p-3 space-y-2">
          {TERRITORY_TREE.map((stateNode) => {
            const stateOpen = openStates[stateNode.state] ?? false;
            const totalPlans     = stateNode.districts.reduce((s, d) => s + d.plans, 0);
            const totalCompleted = stateNode.districts.reduce((s, d) => s + d.completed, 0);
            return (
              <div key={stateNode.state} className="border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => setOpenStates((p) => ({ ...p, [stateNode.state]: !p[stateNode.state] }))}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    {stateOpen ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                    <Building2 className="w-4 h-4 text-brand-600" />
                    <span className="text-sm font-semibold text-foreground">{stateNode.state}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{stateNode.districts.length} districts</span>
                    <span className="text-green-600 font-medium">{totalCompleted}/{totalPlans} plans</span>
                  </div>
                </button>

                {stateOpen && (
                  <div className="divide-y divide-border/50">
                    {stateNode.districts.map((dist) => {
                      const distOpen = openDistricts[dist.name] ?? false;
                      const pct = Math.round((dist.completed / dist.plans) * 100);
                      return (
                        <div key={dist.name}>
                          <button
                            onClick={() => setOpenDistricts((p) => ({ ...p, [dist.name]: !p[dist.name] }))}
                            className="w-full flex items-center justify-between px-6 py-2 hover:bg-muted/20 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              {distOpen ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                              <MapPin className="w-3.5 h-3.5 text-amber-500" />
                              <span className="text-xs font-semibold text-foreground">{dist.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1.5">
                                <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${pct >= 80 ? "bg-green-500" : "bg-amber-500"}`} style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-[10px] text-muted-foreground">{pct}%</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground">{dist.territories.length} territories</span>
                            </div>
                          </button>

                          {distOpen && (
                            <div className="px-8 pb-2 space-y-1 bg-muted/10">
                              {dist.territories.map((t) => (
                                <div key={t} className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-white transition-colors">
                                  <div className="flex items-center gap-2">
                                    <Navigation className="w-3 h-3 text-muted-foreground" />
                                    <span className="text-xs text-foreground">{t}</span>
                                  </div>
                                  <span className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-700 rounded font-medium">Active</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Employee Cards */}
      <div className="col-span-2 space-y-3">
        <div className="bg-white rounded-xl border border-border p-3 border-b">
          <h4 className="text-sm font-semibold text-foreground">Employee-wise View</h4>
          <p className="text-[11px] text-muted-foreground mt-0.5">{EMPLOYEES.length} field executives</p>
        </div>
        {EMPLOYEES.map((emp) => (
          <div key={emp.name} className="bg-white rounded-xl border border-border p-3.5">
            <div className="flex items-start gap-3">
              <Avatar className="w-9 h-9 flex-shrink-0">
                <AvatarFallback className="text-xs font-bold bg-brand-100 text-brand-700">
                  {emp.name.split(" ").map((n) => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-foreground">{emp.name}</p>
                    <p className="text-[10px] text-muted-foreground">{emp.role} · {emp.territory}</p>
                  </div>
                  <StatusBadge status={emp.status} size="xs" />
                </div>
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {[
                    { label: "Planned", value: emp.planned,   color: "text-blue-600" },
                    { label: "Done",    value: emp.completed, color: "text-green-600" },
                    { label: "Demos",   value: emp.demos,     color: "text-emerald-600" },
                  ].map((m) => (
                    <div key={m.label} className="bg-muted/30 rounded p-1.5 text-center">
                      <p className={`text-sm font-bold ${m.color}`}>{m.value}</p>
                      <p className="text-[10px] text-muted-foreground">{m.label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${emp.efficiency >= 80 ? "bg-green-500" : emp.efficiency >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${emp.efficiency}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-foreground">{emp.efficiency}%</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Create Plan Stepper ───────────────────────────────────────────────────────
const STEPS = [
  { label: "Territory", desc: "Select area & date" },
  { label: "Assignment", desc: "Assign employee" },
  { label: "Activities", desc: "Plan visits & demos" },
  { label: "Review", desc: "Confirm & submit" },
];

function CreatePlanTab() {
  const [step, setStep] = useState(0);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Stepper */}
      <div className="flex items-center mb-8">
        {STEPS.map((s, i) => (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={() => setStep(i)}
                className={`w-9 h-9 rounded-full flex items-center justify-center border-2 font-semibold text-sm transition-all ${
                  i < step  ? "bg-brand-600 border-brand-600 text-white" :
                  i === step ? "border-brand-600 text-brand-600 bg-white" :
                               "border-border text-muted-foreground bg-white"
                }`}
              >
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </button>
              <div className="text-center">
                <p className={`text-[11px] font-semibold ${i === step ? "text-brand-700" : "text-muted-foreground"}`}>{s.label}</p>
                <p className="text-[10px] text-muted-foreground">{s.desc}</p>
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mb-4 transition-all ${i < step ? "bg-brand-600" : "bg-border"}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-border p-6">
        {step === 0 && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground">Step 1: Territory Selection</h4>
            <div className="grid grid-cols-2 gap-4">
              {["State", "District", "City", "Territory / Zone"].map((f) => (
                <div key={f}>
                  <label className="block text-xs font-medium text-foreground mb-1.5">{f}</label>
                  <select className="w-full px-3 py-2 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-400">
                    <option value="">Select {f}</option>
                    {f === "State" && <option>Maharashtra</option>}
                    {f === "District" && <option>Pune</option>}
                    {f === "City" && <option>Pune</option>}
                    {f === "Territory / Zone" && <option>Pune North</option>}
                  </select>
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Beat Plan Date</label>
                <input type="date" className="w-full px-3 py-2 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-400" defaultValue="2024-01-20" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Activity Type</label>
                <select className="w-full px-3 py-2 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-400">
                  <option>Solo Visit</option>
                  <option>Joint Work</option>
                  <option>Demo</option>
                  <option>Follow-up</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Beat Plan Notes</label>
              <Textarea placeholder="Add notes or objectives for this beat plan…" className="text-xs resize-none" rows={3} />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground">Step 2: Employee Assignment</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Primary Employee</label>
                <select className="w-full px-3 py-2 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-400">
                  {EMPLOYEES.map((e) => <option key={e.name}>{e.name} ({e.role})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Accompany (optional)</label>
                <select className="w-full px-3 py-2 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-400">
                  <option value="">None</option>
                  {EMPLOYEES.map((e) => <option key={e.name}>{e.name} ({e.role})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Reporting Manager</label>
                <input readOnly defaultValue="Vikram Singh" className="w-full px-3 py-2 border border-border rounded-lg text-xs bg-muted/30 text-muted-foreground focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Approval Required By</label>
                <select className="w-full px-3 py-2 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-400">
                  <option>Vikram Singh (RSM)</option>
                  <option>Anita Desai (ASM)</option>
                  <option>Ravi Mehta (ZSM)</option>
                </select>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs font-medium text-blue-700 mb-1">Selected Employee — Rahul Sharma</p>
              <div className="grid grid-cols-3 gap-2 text-[11px] text-blue-600">
                <span>Territory: Pune North</span>
                <span>This month: 12 plans</span>
                <span>Completion: 83%</span>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">Step 3: Visit & Activity Planning</h4>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5"><Plus className="w-3 h-3" /> Add Stop</Button>
            </div>
            <div className="space-y-2">
              {["Rajesh Agro Store", "Green Field Nursery", "Krishi Seva Kendra"].map((place, i) => (
                <div key={i} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                  <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <input defaultValue={place} className="px-2 py-1.5 border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-400" />
                    <select className="px-2 py-1.5 border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-400">
                      <option>Retailer</option>
                      <option>Distributor</option>
                      <option>Wholesaler</option>
                      <option>Farmer</option>
                    </select>
                    <select className="px-2 py-1.5 border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-400">
                      <option>Order Collection</option>
                      <option>Demo</option>
                      <option>Follow-up</option>
                      <option>Introduction</option>
                    </select>
                  </div>
                  <button className="text-muted-foreground hover:text-red-500 transition-colors">
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Target Outcomes</label>
              <Textarea placeholder="e.g. Collect orders from 8 outlets, conduct 2 product demos…" className="text-xs resize-none" rows={2} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground">Step 4: Review & Submit</h4>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Territory",     value: "Pune North, Pune, Maharashtra" },
                { label: "Date",          value: "January 20, 2024" },
                { label: "Activity Type", value: "Joint Work" },
                { label: "Assigned To",   value: "Rahul Sharma (MR)" },
                { label: "Accompany",     value: "None" },
                { label: "Approver",      value: "Vikram Singh (RSM)" },
                { label: "Planned Stops", value: "3 locations" },
                { label: "Status",        value: "Draft → Planned" },
              ].map(({ label, value }) => (
                <div key={label} className="bg-muted/30 rounded-lg p-3">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
                  <p className="text-xs font-semibold text-foreground mt-0.5">{value}</p>
                </div>
              ))}
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-700 font-medium">⚠ Once submitted, the beat plan will be sent for approval to Vikram Singh. You can still edit it until it is approved.</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-5">
        <Button variant="outline" size="sm" disabled={step === 0} onClick={() => setStep((s) => s - 1)} className="gap-1.5">
          <ChevronLeft className="w-3.5 h-3.5" /> Previous
        </Button>
        {step < STEPS.length - 1 ? (
          <Button size="sm" onClick={() => setStep((s) => s + 1)} className="bg-brand-600 hover:bg-brand-700 text-white gap-1.5">
            Next <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        ) : (
          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1.5">
            <Check className="w-3.5 h-3.5" /> Submit Beat Plan
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Status System Tab ─────────────────────────────────────────────────────────
function StatusSystemTab() {
  const usageGuide: { status: BeatStatus; trigger: string; next: string }[] = [
    { status: "draft",         trigger: "Plan created but not submitted",          next: "planned" },
    { status: "planned",       trigger: "Submitted & pending assignment",          next: "assigned / in-progress" },
    { status: "assigned",      trigger: "Employee assigned, not yet started",      next: "in-progress" },
    { status: "in-progress",   trigger: "Employee has started field visits",       next: "completed / partial / missed" },
    { status: "completed",     trigger: "All visits done, plan closed",            next: "—" },
    { status: "partial",       trigger: "Some visits done, some missed",           next: "—" },
    { status: "missed",        trigger: "No visits done on planned date",          next: "— / rescheduled" },
    { status: "cancelled",     trigger: "Plan cancelled before execution",         next: "—" },
    { status: "demo-done",     trigger: "Product demo successfully conducted",     next: "follow-up" },
    { status: "demo-pending",  trigger: "Demo scheduled but not yet done",         next: "demo-done" },
    { status: "follow-up",     trigger: "Visit needs a follow-up action",          next: "completed" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">All Status Badges</h3>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(STATUS_CONFIG) as BeatStatus[]).map((s) => (
            <StatusBadge key={s} status={s} size="md" />
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Status Lifecycle & Usage Guide</h3>
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">When Applied</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Transitions To</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {usageGuide.map(({ status, trigger, next }) => (
                <tr key={status} className="hover:bg-muted/10">
                  <td className="px-4 py-2"><StatusBadge status={status} size="xs" /></td>
                  <td className="px-4 py-2 text-muted-foreground">{trigger}</td>
                  <td className="px-4 py-2 font-medium text-foreground">{next}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Size Variants</h3>
        <div className="flex items-end gap-6 flex-wrap">
          {(["xs", "sm", "md"] as const).map((size) => (
            <div key={size} className="flex flex-col items-start gap-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Size: {size}</p>
              <StatusBadge status="in-progress" size={size} />
              <StatusBadge status="completed"   size={size} />
              <StatusBadge status="follow-up"   size={size} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Root Component ────────────────────────────────────────────────────────────
export default function BeatPlanningSection() {
  return (
    <div className="space-y-2">
      <Tabs defaultValue="overview">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="bg-muted/40 border border-border h-8">
            {[
              { value: "overview",  label: "Overview",          icon: BarChart2 },
              { value: "plans",     label: "Beat Plans",        icon: ClipboardList },
              { value: "calendar",  label: "Calendar",          icon: Calendar },
              { value: "territory", label: "Territory & Team",  icon: Users },
              { value: "create",    label: "Create Plan",       icon: Plus },
              { value: "statuses",  label: "Status System",     icon: Flag },
            ].map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="flex items-center gap-1.5 text-xs px-3 h-7 data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                <Icon className="w-3 h-3" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="overview">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="plans">
          <FilterBar />
          <BeatPlansTab />
        </TabsContent>
        <TabsContent value="calendar">
          <CalendarTab />
        </TabsContent>
        <TabsContent value="territory">
          <TerritoryTeamTab />
        </TabsContent>
        <TabsContent value="create">
          <CreatePlanTab />
        </TabsContent>
        <TabsContent value="statuses">
          <StatusSystemTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
