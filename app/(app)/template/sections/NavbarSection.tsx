"use client";

import React, { useState } from "react";
import {
  LayoutDashboard, Users, BookOpen, ShoppingCart, BarChart3,
  UserCheck, Wallet, Wheat, CalendarDays, Settings, Palette,
  ChevronDown, Bell, Search, HelpCircle,
} from "lucide-react";

// ── Reusable mini dropdown for showcase ──────────────────────────────────────
function DemoDropdown({
  label,
  icon: Icon,
  items,
  cols = 1,
  defaultOpen = false,
}: {
  label: string;
  icon: React.ElementType;
  items: string[];
  cols?: 1 | 2;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen((p) => !p)}
        className={`flex items-center gap-1.5 px-3 h-9 rounded-lg text-[13px] font-medium transition-all border ${
          open
            ? "bg-muted text-foreground border-border"
            : "text-foreground/70 border-transparent hover:bg-muted/60 hover:text-foreground"
        }`}
      >
        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
        {label}
        <ChevronDown className={`w-3 h-3 ml-0.5 opacity-50 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className={`absolute left-0 top-full mt-1.5 bg-white border border-border/60 rounded-xl shadow-lg p-2.5 z-50 ${
            cols === 2 ? "w-[300px]" : "w-[190px]"
          }`}
        >
          <div className={`grid gap-x-1 gap-y-0.5 ${cols === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
            {items.map((item) => (
              <button
                key={item}
                onClick={() => setOpen(false)}
                className="group flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg hover:bg-muted/70 transition-colors text-left w-full"
              >
                <span className="w-[14px] h-[14px] rounded-full border border-muted-foreground/30 flex-shrink-0 group-hover:border-brand-500 transition-colors" />
                <span className="text-[13px] font-medium text-foreground/80 group-hover:text-foreground leading-tight">
                  {item}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Full navbar replica ───────────────────────────────────────────────────────
function NavbarReplica({ showDropdown }: { showDropdown: boolean }) {
  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, active: false, href: true },
    { label: "Masters",   icon: BookOpen,        active: false, href: false },
    { label: "Sales",     icon: BarChart3,       active: true,  href: false },
    { label: "HR",        icon: UserCheck,       active: false, href: false },
    { label: "Accounts",  icon: Wallet,          active: false, href: false },
    { label: "Template",  icon: Palette,         active: false, href: true },
  ];

  const salesItems = ["Sales Orders", "Invoices", "Dispatch", "Collections", "Targets", "Beat Plan"];

  return (
    <div className="relative bg-white border border-border rounded-xl overflow-visible shadow-sm">
      <div className="h-[52px] flex items-center px-1 gap-0.5">
        {/* Logo */}
        <div className="flex items-center gap-2 px-3 border-r border-border h-full flex-shrink-0 mr-1">
          <div className="w-7 h-7 rounded-lg bg-brand-gradient flex items-center justify-center">
            <span className="text-white text-[9px] font-extrabold tracking-tight">DS</span>
          </div>
          <div>
            <p className="text-[12px] font-bold text-brand-700 leading-tight">Dharitri Sutra</p>
            <p className="text-[9px] text-muted-foreground leading-tight">Agri ERP</p>
          </div>
        </div>

        {navItems.map((item) => (
          <div key={item.label} className="relative">
            <button
              className={`flex items-center gap-1.5 px-2.5 h-8 rounded-lg text-[12px] font-medium whitespace-nowrap transition-all ${
                item.active
                  ? "bg-brand-100 text-brand-700 font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className="w-3 h-3 flex-shrink-0" />
              {item.label}
              {!item.href && (
                <ChevronDown className={`w-2.5 h-2.5 ml-0.5 opacity-50 transition-transform ${item.active && showDropdown ? "rotate-180" : ""}`} />
              )}
            </button>

            {/* Show dropdown under "Sales" when showDropdown=true */}
            {item.label === "Sales" && showDropdown && (
              <div className="absolute left-0 top-full mt-1.5 bg-white border border-border/60 rounded-xl shadow-xl p-2.5 z-50 w-[280px]">
                <div className="grid grid-cols-2 gap-x-1 gap-y-0.5">
                  {salesItems.map((s) => (
                    <div key={s} className="group flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg hover:bg-muted/70 transition-colors cursor-pointer">
                      <span className="w-[14px] h-[14px] rounded-full border border-muted-foreground/30 flex-shrink-0 group-hover:border-brand-500 transition-colors" />
                      <span className="text-[12px] font-medium text-foreground/80 group-hover:text-foreground leading-tight">{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Right side */}
        <div className="ml-auto flex items-center gap-1 pr-2">
          <button className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
            <Search className="w-3.5 h-3.5" />
          </button>
          <button className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
            <Bell className="w-3.5 h-3.5" />
          </button>
          <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center ml-1">
            <span className="text-[10px] font-bold text-brand-700">RS</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Anatomy callout ───────────────────────────────────────────────────────────
function Callout({ num, title, desc }: { num: number; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{num}</span>
      <div>
        <p className="text-xs font-semibold text-foreground">{title}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function NavbarSection() {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <div className="space-y-8">

      {/* 1 ── Live preview ─────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Live Preview</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Toggle the dropdown to see the open state</p>
          </div>
          <button
            onClick={() => setShowDropdown((p) => !p)}
            className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
              showDropdown
                ? "bg-brand-600 text-white border-brand-600"
                : "border-border text-foreground hover:bg-muted/60"
            }`}
          >
            {showDropdown ? "Close Dropdown" : "Open Dropdown"}
          </button>
        </div>

        {/* Extra bottom padding so dropdown doesn't clip */}
        <div className={showDropdown ? "pb-36" : "pb-2"}>
          <NavbarReplica showDropdown={showDropdown} />
        </div>
      </div>

      {/* 2 ── Dropdown variants ────────────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-1">Dropdown Variants</h3>
        <p className="text-xs text-muted-foreground mb-4">Small list (≤ 4 items) → 1 column · Large list (&gt; 4 items) → 2 columns. Click each to preview.</p>

        <div className="grid grid-cols-2 gap-6">
          {/* Small / 1-col */}
          <div className="bg-white border border-border rounded-xl p-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">Single Column — 3 Items</p>
            <DemoDropdown
              label="Event"
              icon={CalendarDays}
              items={["Events", "Attendance", "Feedback"]}
              cols={1}
              defaultOpen
            />
          </div>

          {/* Large / 2-col */}
          <div className="bg-white border border-border rounded-xl p-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">Two Columns — 6+ Items</p>
            <DemoDropdown
              label="Masters"
              icon={BookOpen}
              items={["Products", "Categories", "HSN / Tax", "Distributors", "Retailers", "Warehouse", "Units of Measure"]}
              cols={2}
              defaultOpen
            />
          </div>
        </div>
      </div>

      {/* 3 ── Trigger button states ────────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-1">Trigger Button States</h3>
        <p className="text-xs text-muted-foreground mb-4">All states the nav trigger button can be in.</p>

        <div className="bg-white border border-border rounded-xl p-5">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Default */}
            <div className="flex flex-col items-start gap-1.5">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Default</span>
              <button className="flex items-center gap-1.5 px-3 h-9 rounded-lg text-[13px] font-medium text-muted-foreground border border-transparent">
                <Users className="w-3.5 h-3.5" />
                User Mgmt
                <ChevronDown className="w-3 h-3 opacity-50" />
              </button>
            </div>

            {/* Hover */}
            <div className="flex flex-col items-start gap-1.5">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Hover</span>
              <button className="flex items-center gap-1.5 px-3 h-9 rounded-lg text-[13px] font-medium text-foreground bg-muted border border-transparent">
                <BookOpen className="w-3.5 h-3.5" />
                Masters
                <ChevronDown className="w-3 h-3 opacity-50" />
              </button>
            </div>

            {/* Open */}
            <div className="flex flex-col items-start gap-1.5">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Open</span>
              <button className="flex items-center gap-1.5 px-3 h-9 rounded-lg text-[13px] font-medium text-foreground bg-muted border border-border">
                <ShoppingCart className="w-3.5 h-3.5" />
                Procurement
                <ChevronDown className="w-3 h-3 opacity-50 rotate-180" />
              </button>
            </div>

            {/* Active route */}
            <div className="flex flex-col items-start gap-1.5">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Active Route</span>
              <button className="flex items-center gap-1.5 px-3 h-9 rounded-lg text-[13px] font-semibold text-brand-700 bg-brand-100 border border-transparent">
                <BarChart3 className="w-3.5 h-3.5" />
                Sales
                <ChevronDown className="w-3 h-3 opacity-50" />
              </button>
            </div>

            {/* Simple link */}
            <div className="flex flex-col items-start gap-1.5">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Simple Link</span>
              <button className="flex items-center gap-1.5 px-3 h-9 rounded-lg text-[13px] font-medium text-muted-foreground border border-transparent">
                <Palette className="w-3.5 h-3.5" />
                Template
              </button>
            </div>

            {/* Icon-only */}
            <div className="flex flex-col items-start gap-1.5">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Icon Only</span>
              <button className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground bg-transparent hover:bg-muted">
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4 ── Dropdown item states ─────────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-1">Dropdown Item States</h3>
        <p className="text-xs text-muted-foreground mb-4">The circle-bullet list item in default, hover, and active states.</p>

        <div className="bg-white border border-border rounded-xl p-5">
          <div className="flex items-start gap-8 flex-wrap">
            {/* Default */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Default</p>
              <div className="flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg w-40">
                <span className="w-[14px] h-[14px] rounded-full border border-muted-foreground/30 flex-shrink-0" />
                <span className="text-[13px] font-medium text-foreground/80">Sales Orders</span>
              </div>
            </div>

            {/* Hover */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Hover</p>
              <div className="flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg bg-muted/70 w-40">
                <span className="w-[14px] h-[14px] rounded-full border border-brand-500 flex-shrink-0" />
                <span className="text-[13px] font-medium text-foreground">Sales Orders</span>
              </div>
            </div>

            {/* Full dropdown in context */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">In Context (2-col)</p>
              <div className="border border-border/60 rounded-xl p-2.5 bg-white shadow-md w-[240px]">
                <div className="grid grid-cols-2 gap-x-1 gap-y-0.5">
                  {["Sales Orders", "Invoices", "Dispatch", "Collections", "Targets", "Beat Plan"].map((label, i) => (
                    <div
                      key={label}
                      className={`group flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg transition-colors cursor-pointer ${
                        i === 1 ? "bg-muted/70" : "hover:bg-muted/70"
                      }`}
                    >
                      <span className={`w-[14px] h-[14px] rounded-full border flex-shrink-0 ${
                        i === 1 ? "border-brand-500" : "border-muted-foreground/30"
                      }`} />
                      <span className={`text-[12px] font-medium leading-tight ${
                        i === 1 ? "text-foreground" : "text-foreground/80"
                      }`}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5 ── Full nav item list ───────────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-1">Navigation Map</h3>
        <p className="text-xs text-muted-foreground mb-4">All modules and their sub-links at a glance.</p>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "User Management", icon: Users, items: ["All Users", "Roles & Permissions", "User Groups", "States", "Districts", "Territory Map"] },
            { label: "Masters",         icon: BookOpen, items: ["Products", "Categories", "HSN / Tax", "Distributors", "Retailers", "Warehouse", "Units of Measure"] },
            { label: "Procurement",     icon: ShoppingCart, items: ["Purchase Orders", "GRN", "Vendor Bills", "Vendor Returns", "Stock Ledger"] },
            { label: "Sales",           icon: BarChart3, items: ["Sales Orders", "Invoices", "Dispatch", "Collections", "Targets", "Beat Plan"] },
            { label: "HR",              icon: UserCheck, items: ["Employees", "Attendance", "Leave Management", "Payroll", "Expense Claims"] },
            { label: "Accounts",        icon: Wallet, items: ["Ledger", "Vouchers", "Outstanding", "Reports"] },
            { label: "Farmer",          icon: Wheat, items: ["Farmer Registry", "Field Surveys", "Crop Calendar", "Input Distribution", "FPO Management"] },
            { label: "Event",           icon: CalendarDays, items: ["Events", "Attendance", "Feedback"] },
          ].map(({ label, icon: Icon, items }) => (
            <div key={label} className="bg-white border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center">
                  <Icon className="w-3.5 h-3.5 text-brand-600" />
                </div>
                <p className="text-xs font-semibold text-foreground">{label}</p>
                <span className="ml-auto text-[10px] text-muted-foreground font-medium">{items.length}</span>
              </div>
              <div className="space-y-0.5">
                {items.map((item) => (
                  <div key={item} className="flex items-center gap-2 py-0.5">
                    <span className="w-[12px] h-[12px] rounded-full border border-muted-foreground/25 flex-shrink-0" />
                    <span className="text-[11px] text-muted-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6 ── Anatomy ──────────────────────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Anatomy</h3>
        <div className="bg-white border border-border rounded-xl p-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <Callout num={1} title="Logo + Brand" desc="32px rounded icon with brand gradient. Shows app name and product line at 13px/10px." />
              <Callout num={2} title="Trigger Button" desc="Icon + label + chevron. 36px height, rounded-lg. Brand-100 background when route is active." />
              <Callout num={3} title="Dropdown Panel" desc="White panel, rounded-xl, border + shadow-lg. 190px wide (1-col) or 320px (2-col), 10px offset from trigger." />
            </div>
            <div className="space-y-3">
              <Callout num={4} title="Circle Bullet" desc="14×14px circle with 1px border. border-muted-foreground/30 default → border-brand-500 on hover." />
              <Callout num={5} title="Link Label" desc="13px medium weight, text-foreground/80 default → text-foreground on hover. 7px vertical padding." />
              <Callout num={6} title="Icon-only Item" desc="36×36px square button with tooltip. Used for Settings. ml-auto pushes to right edge." />
            </div>
          </div>
        </div>
      </div>

      {/* 7 ── Spec ─────────────────────────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Specs & Tokens</h3>
        <div className="bg-white border border-border rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                {["Property", "Value", "Token / Class"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                ["Navbar height",         "56px",                     "h-[56px]"],
                ["Nav trigger height",    "36px",                     "h-9"],
                ["Trigger font size",     "13px medium",              "text-[13px] font-medium"],
                ["Active bg",            "brand-100",                 "bg-brand-100 text-brand-700"],
                ["Dropdown padding",      "10px",                     "p-2.5"],
                ["Dropdown border-radius","12px",                     "rounded-xl"],
                ["Dropdown shadow",       "lg",                       "shadow-lg"],
                ["Dropdown offset",       "6px from trigger",         "sideOffset={6}"],
                ["1-col width",           "200px",                    "w-[200px]"],
                ["2-col width",           "320px",                    "w-[320px]"],
                ["Item height",           "~30px",                    "py-[7px]"],
                ["Circle size",           "14×14px",                  "w-[14px] h-[14px] rounded-full"],
                ["Chevron rotation",      "180° when open",           "rotate-180"],
              ].map(([prop, val, token]) => (
                <tr key={prop} className="hover:bg-muted/10">
                  <td className="px-4 py-2 font-medium text-foreground">{prop}</td>
                  <td className="px-4 py-2 text-muted-foreground">{val}</td>
                  <td className="px-4 py-2 font-mono text-[11px] text-brand-700">{token}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
