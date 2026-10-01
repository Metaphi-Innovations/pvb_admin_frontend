"use client";

import React, { useState } from "react";
import {
  Home, Clock, CalendarDays, Wallet, FolderOpen, Users, Building2, Network,
  BadgeCheck, UserPlus, FileSignature, UserCheck, LogOut, Calculator,
  TrendingUp, Receipt, Timer, TreePalm, Laptop, CheckSquare, Target,
  ChevronLeft, ChevronRight, Search, Bell, Settings, PanelLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SectionShell, SectionBlock, PreviewFrame, DoDont, BestPractices,
  TokenUsage, AccessibilityNotes, ProductionNotes, ErpUseCase,
} from "../_components/SectionShell";
import { HR_NAV_GROUPS } from "../mock/hrms-data";

const ICON_MAP: Record<string, React.ElementType> = {
  Home, Clock, CalendarDays, Wallet, FolderOpen, Users, Building2, Network,
  BadgeCheck, UserPlus, FileSignature, UserCheck, LogOut, Calculator,
  TrendingUp, Receipt, Timer, TreePalm, Laptop, CheckSquare, Target,
  Palmtree: TreePalm,
};

const APP_RAIL = [
  { id: "hr", label: "HR", active: true },
  { id: "erp", label: "ERP", active: false },
  { id: "ff", label: "Field", active: false },
  { id: "rpt", label: "Reports", active: false },
];

function HrmsNavPreview({ collapsed }: { collapsed: boolean }) {
  const [active, setActive] = useState("directory");

  return (
    <div className="flex h-[420px] rounded-[10px] border border-border overflow-hidden bg-white">
      {/* Compact app rail */}
      <div className="w-14 flex-shrink-0 bg-navy-900 flex flex-col items-center py-3 gap-2">
        <div className="w-8 h-8 rounded-[10px] bg-brand-gradient flex items-center justify-center mb-2">
          <span className="text-white text-[10px] font-extrabold">DS</span>
        </div>
        {APP_RAIL.map((m) => (
          <button
            key={m.id}
            className={cn(
              "w-10 h-10 rounded-[10px] text-[10px] font-bold transition-colors",
              m.active
                ? "bg-brand-600 text-white"
                : "text-navy-200 hover:bg-navy-800 hover:text-white",
            )}
            title={m.label}
          >
            {m.label.slice(0, 2)}
          </button>
        ))}
        <div className="mt-auto flex flex-col gap-2">
          <button className="w-10 h-10 rounded-[10px] text-navy-300 hover:bg-navy-800 inline-flex items-center justify-center">
            <Bell className="w-4 h-4" />
          </button>
          <button className="w-10 h-10 rounded-[10px] text-navy-300 hover:bg-navy-800 inline-flex items-center justify-center">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* HR module sidebar */}
      <aside
        className={cn(
          "flex-shrink-0 border-r border-border bg-muted/30 flex flex-col transition-all duration-200",
          collapsed ? "w-14" : "w-56",
        )}
      >
        <div className={cn("h-11 border-b border-border flex items-center", collapsed ? "justify-center" : "px-3 justify-between")}>
          {!collapsed && (
            <div>
              <p className="text-xs font-bold text-navy-700 leading-none">HR Module</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">People operations</p>
            </div>
          )}
          <PanelLeft className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {HR_NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-2">
              {!collapsed && (
                <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {group.label}
                </p>
              )}
              <div className="px-1.5 space-y-0.5">
                {group.items.map((item) => {
                  const Icon = ICON_MAP[item.icon] ?? Home;
                  const isActive = active === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActive(item.id)}
                      title={item.label}
                      className={cn(
                        "w-full flex items-center gap-2.5 rounded-[10px] text-left text-xs font-medium transition-colors",
                        collapsed ? "justify-center px-0 py-2.5" : "px-2.5 py-2",
                        isActive
                          ? "bg-brand-50 text-brand-700 border-l-2 border-brand-600"
                          : "text-foreground hover:bg-muted/80 border-l-2 border-transparent",
                      )}
                    >
                      <Icon className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-brand-600" : "text-muted-foreground")} />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Contextual content stub */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-11 border-b border-border px-4 flex items-center gap-3 bg-white">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search employees, leave, payroll…"
              className="w-full h-8 pl-8 pr-3 text-xs border border-border rounded-[10px] bg-muted/20 focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
          </div>
          <span className="text-[11px] text-muted-foreground ml-auto">FY 2025-26</span>
        </div>
        <div className="flex-1 p-4 bg-muted/10">
          <p className="text-sm font-semibold text-navy-700">Employee Directory</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Contextual workspace for the selected HR nav item. Active state uses brand tint + left border.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {["248 Employees", "12 On Leave", "5 Open Positions"].map((k) => (
              <div key={k} className="rounded-[14px] border border-border bg-white p-3 shadow-sm">
                <p className="text-sm font-bold text-foreground">{k.split(" ")[0]}</p>
                <p className="text-[11px] text-muted-foreground">{k.split(" ").slice(1).join(" ")}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HrmsNavigationSection() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <SectionShell overview="HRMS Application Navigation combines a compact global application rail with a grouped HR module sidebar. Use this pattern for People Ops workspaces — directory, attendance, leave, payroll, and talent flows — without altering existing ERP top-nav modules.">
      <SectionBlock title="Variants" subtitle="Expanded and collapsed sidebar states">
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setCollapsed(false)}
            className={cn(
              "h-8 px-3 text-xs rounded-[10px] border font-medium",
              !collapsed ? "bg-brand-600 text-white border-brand-600" : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            <span className="inline-flex items-center gap-1.5"><ChevronRight className="w-3.5 h-3.5" /> Expanded</span>
          </button>
          <button
            onClick={() => setCollapsed(true)}
            className={cn(
              "h-8 px-3 text-xs rounded-[10px] border font-medium",
              collapsed ? "bg-brand-600 text-white border-brand-600" : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            <span className="inline-flex items-center gap-1.5"><ChevronLeft className="w-3.5 h-3.5" /> Collapsed</span>
          </button>
        </div>
        <PreviewFrame title="HRMS shell · app rail + module sidebar">
          <HrmsNavPreview collapsed={collapsed} />
        </PreviewFrame>
      </SectionBlock>

      <SectionBlock title="Real HRMS example">
        <PreviewFrame>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px]">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-foreground">Grouped navigation</p>
              <p className="text-muted-foreground">My Workspace · People · Talent · Compensation · Admin — mirrors real HRIA information architecture.</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-foreground">Active state</p>
              <p className="text-muted-foreground">Brand-50 background, brand-700 text, 2px left border brand-600. Icons tint with active color.</p>
            </div>
          </div>
        </PreviewFrame>
      </SectionBlock>

      <ErpUseCase
        title="Accounts / Procurement module switch"
        description="The same global rail can host ERP modules (Sales, Warehouse, Accounts). Keep rail icons compact; put module-specific trees in the secondary sidebar. Do not redesign production TopNavbar unless tasked."
      />

      <BestPractices items={[
        "Keep the app rail at 56px — icon or 2-letter labels only.",
        "Group HR items by job to be done, not by org chart alone.",
        "Collapsed mode must still expose tooltips for every item.",
        "Preserve sticky header search + FY context above content.",
      ]} />

      <DoDont
        dos={[
          "Use brand left-border for active nav items",
          "Support keyboard focus order rail → sidebar → content",
          "Collapse sidebar on dense data grids to reclaim width",
        ]}
        donts={[
          "Do not use 18–20px radius on nav items — use 10px",
          "Do not nest more than two sidebar levels",
          "Do not change production TopNavbar from Template demos",
        ]}
      />

      <TokenUsage tokens={[
        { token: "bg-navy-900", use: "Global application rail" },
        { token: "bg-brand-50 / text-brand-700", use: "Active module nav item" },
        { token: "border-l-2 border-brand-600", use: "Active indicator" },
        { token: "rounded-[10px]", use: "Sidebar items, rail buttons" },
      ]} />

      <AccessibilityNotes items={[
        "Mark active item with aria-current=\"page\".",
        "Collapsed icons need accessible names via title or aria-label.",
        "Ensure contrast of navy rail icons meets WCAG AA.",
      ]} />

      <ProductionNotes items={[
        "This preview is Template-only. Production AppShell / TopNavbar must stay unchanged.",
        "When building the real HR module, implement this shell under an HR route group — do not retrofit Dashboard or Accounts.",
        "Mock data only — no API wiring from Template.",
      ]} />
    </SectionShell>
  );
}
