"use client";

import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Palette, Type, Grid3x3, Radius, Zap, Layers,
  Square, Badge, LayoutGrid, LayoutPanelLeft,
  Table2, Settings, Loader, AlertCircle,
  Bell, Menu, UserCircle, MenuSquare, Upload,
  CheckSquare, Calendar, MessageCircle, FileText,
  ChevronDown, ChevronRight, Search, ListFilter, MapPin,
  LogIn, CalendarDays, List, PanelRight, BookOpen, SlidersHorizontal,
} from "lucide-react";
import { TemplateSection } from "./section-registry";

// ── Section registry ──────────────────────────────────────────────────────────
const GROUPS = [
  {
    label: "Foundation",
    items: [
      { id: "colors",     label: "Colors & Theme",    icon: Palette },
      { id: "typography", label: "Typography",         icon: Type },
      { id: "spacing",    label: "Spacing System",     icon: Grid3x3 },
      { id: "radius",     label: "Border Radius",      icon: Radius },
      { id: "shadows",    label: "Shadows",            icon: Zap },
      { id: "icons",      label: "Icons",              icon: Layers },
    ],
  },
  {
    label: "Core Components",
    items: [
      { id: "buttons",       label: "Buttons",              icon: Square },
      { id: "badges",        label: "Status Badges",        icon: Badge },
      { id: "cards",         label: "Cards",                icon: LayoutGrid },
      { id: "autocomplete",  label: "Autocomplete / Select", icon: ListFilter },
      { id: "loaders",       label: "Loaders",              icon: Loader },
    ],
  },
  {
    label: "Form Patterns",
    items: [
      { id: "forms",            label: "Form Foundations",   icon: LayoutPanelLeft },
      { id: "full-page-forms",  label: "Full Page Forms",    icon: BookOpen },
      { id: "drawer-forms",     label: "Drawer Forms",       icon: PanelRight },
    ],
  },
  {
    label: "Data Display",
    items: [
      { id: "tables",          label: "Tables & Listings",   icon: Table2 },
      { id: "listing-patterns",label: "Listing Patterns",    icon: List },
      { id: "filters",         label: "Filter Patterns",     icon: SlidersHorizontal },
      { id: "nested-data",     label: "Nested Data UI",      icon: Grid3x3 },
      { id: "charts",          label: "Charts & Analytics",  icon: Palette },
    ],
  },
  {
    label: "Overlays & Navigation",
    items: [
      { id: "modals",   label: "Modals & Dialogs",     icon: Settings },
      { id: "drawer",   label: "Drawer Components",    icon: MenuSquare },
      { id: "navbar",   label: "Navbar & Header",      icon: Menu },
      { id: "sidebar",  label: "Sidebar Navigation",   icon: MenuSquare },
      { id: "tabs",     label: "Tabs & Accordions",    icon: LayoutGrid },
    ],
  },
  {
    label: "Feedback & States",
    items: [
      { id: "alerts",        label: "Alerts & Notifications", icon: Bell },
      { id: "empty-states",  label: "Empty States",           icon: AlertCircle },
    ],
  },
  {
    label: "ERP Patterns",
    items: [
      { id: "approval",   label: "Approval UI",       icon: CheckSquare },
      { id: "profile",    label: "Profile Components", icon: UserCircle },
      { id: "stepper",    label: "Stepper Forms",      icon: CheckSquare },
      { id: "timeline",   label: "Timeline / Activity",icon: Calendar },
      { id: "comments",   label: "Comments & Notes",   icon: MessageCircle },
      { id: "audit-logs", label: "Audit Logs",         icon: FileText },
    ],
  },
  {
    label: "Specialised",
    items: [
      { id: "file-upload", label: "File Upload",       icon: Upload },
      { id: "mobile",      label: "Mobile Components", icon: MenuSquare },
    ],
  },
  {
    label: "Field Force",
    items: [
      { id: "beat-planning", label: "Beat & Route Planning", icon: MapPin },
    ],
  },
  {
    label: "Auth & Config",
    items: [
      { id: "login",          label: "Login UI",              icon: LogIn       },
      { id: "financial-year", label: "Financial Year",        icon: CalendarDays },
    ],
  },
];

const ALL_ITEMS = GROUPS.flatMap((g) => g.items); // auto-counts all sections

function renderSection(id: string) {
  return <TemplateSection id={id} />;
}

// ── Left sidebar ──────────────────────────────────────────────────────────────
function Sidebar({
  active,
  onSelect,
}: {
  active: string;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const filtered = query.trim()
    ? ALL_ITEMS.filter((i) =>
        i.label.toLowerCase().includes(query.toLowerCase())
      )
    : null;

  return (
    <aside className="w-60 flex-shrink-0 border-r border-border bg-muted/30 flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-4 border-b border-border">
        <p className="text-xs font-bold text-foreground tracking-wide uppercase mb-3">
          Design System
        </p>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search sections…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-7 pr-3 py-1.5 text-xs bg-white border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-400"
          />
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-2">
        {filtered ? (
          <div className="px-2 space-y-0.5">
            {filtered.map((item) => (
              <NavItem key={item.id} item={item} active={active} onSelect={onSelect} />
            ))}
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground px-3 py-4 text-center">
                No sections found
              </p>
            )}
          </div>
        ) : (
          GROUPS.map((group) => {
            const isCollapsed = collapsed[group.label];
            return (
              <div key={group.label} className="mb-1">
                <button
                  onClick={() =>
                    setCollapsed((prev) => ({
                      ...prev,
                      [group.label]: !prev[group.label],
                    }))
                  }
                  className="w-full flex items-center justify-between px-4 py-1.5 hover:bg-muted/60 transition-colors"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {group.label}
                  </span>
                  {isCollapsed ? (
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  )}
                </button>

                {!isCollapsed && (
                  <div className="px-2 space-y-0.5 pb-1">
                    {group.items.map((item) => (
                      <NavItem
                        key={item.id}
                        item={item}
                        active={active}
                        onSelect={onSelect}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </nav>

      {/* Footer badge */}
      <div className="px-4 py-3 border-t border-border">
        <p className="text-[10px] text-muted-foreground">
          {ALL_ITEMS.length} components · Dharitri Sutra Agri ERP
        </p>
      </div>
    </aside>
  );
}

function NavItem({
  item,
  active,
  onSelect,
}: {
  item: { id: string; label: string; icon: React.ElementType };
  active: string;
  onSelect: (id: string) => void;
}) {
  const Icon = item.icon;
  const isActive = active === item.id;
  return (
    <button
      onClick={() => onSelect(item.id)}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors text-xs font-medium ${
        isActive
          ? "bg-brand-600 text-white shadow-sm"
          : "text-foreground hover:bg-muted/80"
      }`}
    >
      <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? "text-white" : "text-muted-foreground"}`} />
      <span className="truncate">{item.label}</span>
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TemplatePage() {
  const [active, setActive] = useState("colors");

  const current = ALL_ITEMS.find((i) => i.id === active);

  return (
    <AppLayout noPadding>
      {/* Full-height two-panel shell */}
      <div
        className="flex"
        style={{ height: "calc(100vh - 104px)" }} /* 56px navbar + 48px header */
      >
        <Sidebar active={active} onSelect={setActive} />

        {/* Right content panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Section header bar */}
          <div className="px-8 py-4 border-b border-border bg-white flex items-center gap-3 flex-shrink-0">
            {current && (
              <>
                {React.createElement(current.icon, {
                  className: "w-5 h-5 text-brand-600",
                })}
                <div>
                  <h1 className="text-base font-semibold text-foreground leading-tight">
                    {current.label}
                  </h1>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Design System Hub · Dharitri Sutra Agri ERP
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-8 py-6 bg-muted/20">
            {renderSection(active)}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
