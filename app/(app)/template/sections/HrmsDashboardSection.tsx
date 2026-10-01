"use client";

import React from "react";
import {
  Clock, UserX, CalendarDays, Cake, CheckSquare, FileWarning,
  Hourglass, Wallet, UserPlus, AlertTriangle, Users, TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SectionShell, SectionBlock, PreviewFrame, DoDont, BestPractices,
  TokenUsage, AccessibilityNotes, ProductionNotes, ErpUseCase,
} from "../_components/SectionShell";
import { MOCK_EMPLOYEES, MOCK_LEAVE_REQUESTS, initials } from "../mock/hrms-data";

const KPIS = [
  { label: "Present today", value: "231", sub: "of 248", icon: Clock, accent: "border-l-leaf-600", iconBg: "bg-leaf-50", iconColor: "text-leaf-600" },
  { label: "Late", value: "9", sub: "after grace", icon: AlertTriangle, accent: "border-l-amber-500", iconBg: "bg-amber-50", iconColor: "text-amber-600" },
  { label: "Absent", value: "8", sub: "unplanned", icon: UserX, accent: "border-l-red-500", iconBg: "bg-red-50", iconColor: "text-red-600" },
  { label: "On leave", value: "12", sub: "approved", icon: CalendarDays, accent: "border-l-sky-500", iconBg: "bg-sky-50", iconColor: "text-sky-600" },
];

const WIDGETS = [
  {
    title: "Pending approvals",
    icon: CheckSquare,
    items: MOCK_LEAVE_REQUESTS.filter((l) => l.status === "pending").map((l) => ({
      primary: l.employee,
      secondary: `${l.type} · ${l.days}d · ${l.id}`,
    })),
  },
  {
    title: "Birthdays this week",
    icon: Cake,
    items: [
      { primary: "Sneha Kulkarni", secondary: "05 Aug · Finance" },
      { primary: "Deepak Singh", secondary: "07 Aug · Field Force" },
      { primary: "Meera Joshi", secondary: "09 Aug · Finance" },
    ],
  },
  {
    title: "Document expiry",
    icon: FileWarning,
    items: [
      { primary: "Medical Certificate", secondary: "Amit Verma · expired" },
      { primary: "Work Permit", secondary: "2 contractors · 14 days" },
      { primary: "Driving License", secondary: "Field fleet · 30 days" },
    ],
  },
  {
    title: "Probation ending",
    icon: Hourglass,
    items: [
      { primary: "Sneha Kulkarni", secondary: "Ends 15 Feb 2026" },
      { primary: "Rohit Desai", secondary: "Ends 01 Mar 2026" },
    ],
  },
];

export default function HrmsDashboardSection() {
  return (
    <SectionShell overview="HR Dashboard is the people-ops home: today's attendance, late/absent, leaves, birthdays, approvals, document expiry, probation, payroll status, and recruitment pipeline. Dense, actionable widgets — not a marketing dashboard.">
      <SectionBlock title="Variants" subtitle="KPI strip + actionable widgets">
        <PreviewFrame title="HR home · live mock">
          <div className="space-y-4">
            <div className="flex items-end justify-between gap-3 flex-wrap">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">HR Dashboard</p>
                <h2 className="text-xl font-bold text-navy-700">Good afternoon, Ananya</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">Monday, 3 Aug 2026 · FY 2025-26 · Pune HO</p>
              </div>
              <div className="flex gap-2">
                <span className="h-8 px-3 text-xs rounded-[10px] border border-border inline-flex items-center gap-1.5 bg-white">
                  <Wallet className="w-3.5 h-3.5 text-brand-600" /> Payroll: In progress
                </span>
                <span className="h-8 px-3 text-xs rounded-[10px] border border-border inline-flex items-center gap-1.5 bg-white">
                  <UserPlus className="w-3.5 h-3.5 text-navy-600" /> Open roles: 5
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {KPIS.map((k) => {
                const Icon = k.icon;
                return (
                  <div
                    key={k.label}
                    className={cn(
                      "bg-white rounded-[14px] border border-border p-3 flex items-center gap-3 shadow-sm border-l-4",
                      k.accent,
                    )}
                  >
                    <div className={cn("w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0", k.iconBg)}>
                      <Icon className={cn("w-4 h-4", k.iconColor)} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xl font-bold text-foreground leading-none">{k.value}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{k.label}</p>
                      <p className="text-[10px] text-muted-foreground/80">{k.sub}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {WIDGETS.map((w) => {
                const Icon = w.icon;
                return (
                  <div key={w.title} className="rounded-[14px] border border-border bg-white shadow-sm overflow-hidden">
                    <div className="px-3 py-2.5 border-b border-border flex items-center gap-2 bg-muted/20">
                      <Icon className="w-3.5 h-3.5 text-brand-600" />
                      <p className="text-xs font-semibold text-foreground">{w.title}</p>
                      <span className="ml-auto text-[10px] font-bold text-muted-foreground">{w.items.length}</span>
                    </div>
                    <ul className="divide-y divide-border/60">
                      {w.items.map((item) => (
                        <li key={item.primary + item.secondary} className="px-3 py-2 hover:bg-muted/20">
                          <p className="text-xs font-medium text-foreground">{item.primary}</p>
                          <p className="text-[11px] text-muted-foreground">{item.secondary}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="rounded-[14px] border border-border bg-white shadow-sm overflow-hidden">
                <div className="px-3 py-2.5 border-b border-border bg-muted/20 flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-brand-600" />
                  <p className="text-xs font-semibold">Late employees today</p>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="px-3 py-2 font-semibold">Employee</th>
                      <th className="px-3 py-2 font-semibold">In</th>
                      <th className="px-3 py-2 font-semibold">Dept</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_EMPLOYEES.slice(0, 4).map((e) => (
                      <tr key={e.id} className="border-b border-border/60">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-[8px] bg-brand-600 text-white text-[10px] font-bold inline-flex items-center justify-center">
                              {initials(e.name)}
                            </span>
                            {e.name}
                          </div>
                        </td>
                        <td className="px-3 py-2 font-mono text-amber-700">09:45</td>
                        <td className="px-3 py-2 text-muted-foreground">{e.department}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="rounded-[14px] border border-border bg-white shadow-sm p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-brand-600" />
                  <p className="text-xs font-semibold">Payroll & recruitment status</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-[12px] border border-border p-3 bg-muted/20">
                    <p className="text-[11px] text-muted-foreground">Aug 2026 payroll</p>
                    <p className="text-sm font-bold text-foreground mt-1">In progress</p>
                    <p className="text-[10px] text-muted-foreground mt-1">251 employees · cut-off 25 Aug</p>
                  </div>
                  <div className="rounded-[12px] border border-border p-3 bg-muted/20">
                    <p className="text-[11px] text-muted-foreground">Recruitment</p>
                    <p className="text-sm font-bold text-foreground mt-1">4 in offer</p>
                    <p className="text-[10px] text-muted-foreground mt-1">12 active candidates</p>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full w-[68%] bg-brand-600 rounded-full" />
                </div>
                <p className="text-[11px] text-muted-foreground">Payroll checklist 68% complete</p>
              </div>
            </div>
          </div>
        </PreviewFrame>
      </SectionBlock>

      <ErpUseCase
        title="Sales / warehouse ops dashboard"
        description="Same KPI strip + widget grid pattern for orders pending, dispatches, stock alerts. Use Template HR Dashboard as composition reference only."
      />

      <BestPractices items={[
        "Lead with today's attendance health.",
        "Every widget should deep-link to a working list (approvals, directory, docs).",
        "Keep 4 primary KPIs — avoid KPI sprawl on first viewport.",
        "Show FY and branch context in the header.",
      ]} />

      <DoDont
        dos={["Left-border accent KPIs for quick scanning", "Actionable lists with counts", "Mix tables + cards for density"]}
        donts={["Don't use large consumer hero banners", "Don't show decorative charts without decisions", "Don't auto-apply this layout to production Dashboard"]}
      />

      <TokenUsage tokens={[
        { token: "rounded-[14px] shadow-sm border-l-4", use: "KPI cards" },
        { token: "text-navy-700 text-xl font-bold", use: "Dashboard greeting title" },
        { token: "text-[11px] uppercase tracking-wide", use: "Widget titles" },
      ]} />

      <AccessibilityNotes items={[
        "KPI values should have visible labels — not color alone.",
        "Widget lists should be keyboard-navigable links in production.",
      ]} />

      <ProductionNotes items={[
        "Mock only — no production Dashboard or HR API wiring.",
        "Existing /dashboard remains unchanged.",
      ]} />
    </SectionShell>
  );
}
