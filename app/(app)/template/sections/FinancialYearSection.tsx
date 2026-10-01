"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Calendar, Check, AlertTriangle, ChevronDown, Lock, Clock,
  Archive, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FINANCIAL_YEARS, FY_STATUS_CONFIG, type FinancialYear, type FYStatus } from "@/lib/fy-store";

// ── Reusable sub-components ───────────────────────────────────────────────────
function FYStatusBadge({
  status,
  size = "md",
}: {
  status: FYStatus;
  size?: "sm" | "md" | "lg";
}) {
  const c = FY_STATUS_CONFIG[status];
  const sizes = {
    sm: "px-1.5 py-0.5 text-[10px] gap-1",
    md: "px-2.5 py-1 text-[11px] gap-1.5",
    lg: "px-3.5 py-1.5 text-xs gap-2",
  };
  return (
    <span className={cn(
      "inline-flex items-center rounded-full font-semibold border",
      c.bg, c.color, c.border, sizes[size],
    )}>
      <span className={cn(
        "rounded-full flex-shrink-0",
        c.dot,
        status === "live" && "animate-pulse",
        size === "sm" ? "w-1 h-1" : size === "lg" ? "w-2 h-2" : "w-1.5 h-1.5",
      )} />
      {c.label}
    </span>
  );
}

function FYDropdown({
  selected,
  onSelect,
}: {
  selected: FinancialYear;
  onSelect: (fy: FinancialYear) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block w-full max-w-xs">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border-2 border-border bg-white hover:border-brand-400 transition-all text-left"
      >
        <Calendar className="w-4 h-4 text-brand-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{selected.label}</p>
          <p className="text-[11px] text-muted-foreground">{selected.start} – {selected.end}</p>
        </div>
        <FYStatusBadge status={selected.status} size="sm" />
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform flex-shrink-0", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-xl shadow-lg z-50 overflow-hidden">
          {FINANCIAL_YEARS.map((fy) => {
            const c = FY_STATUS_CONFIG[fy.status];
            const isSelected = fy.id === selected.id;
            return (
              <button
                key={fy.id}
                onClick={() => { onSelect(fy); setOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors border-b border-border/50 last:border-0",
                  isSelected ? "bg-brand-50" : "hover:bg-muted/50",
                )}
              >
                <div className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
                  isSelected ? "bg-brand-500" : "bg-muted",
                )}>
                  {isSelected
                    ? <Check className="w-3.5 h-3.5 text-white" />
                    : <Calendar className="w-3.5 h-3.5 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-xs font-semibold", isSelected ? "text-brand-700" : "text-foreground")}>
                    {fy.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{fy.start} – {fy.end}</p>
                </div>
                <span className={cn(
                  "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border flex-shrink-0",
                  c.bg, c.color, c.border,
                )}>
                  <span className={cn("w-1 h-1 rounded-full", c.dot, fy.status === "live" && "animate-pulse")} />
                  {c.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FYSwitchDialog({
  open,
  onClose,
  pendingFY,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  pendingFY: FinancialYear | null;
  onConfirm: () => void;
}) {
  if (!pendingFY) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            Switch Financial Year?
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Switching to{" "}
            <span className="font-semibold text-foreground">{pendingFY.label}</span>{" "}
            will reload dashboard data for that period.
          </p>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border">
            <div className="w-9 h-9 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4 text-brand-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{pendingFY.label}</p>
              <p className="text-xs text-muted-foreground">{pendingFY.start} – {pendingFY.end}</p>
            </div>
            <FYStatusBadge status={pendingFY.status} />
          </div>
          {pendingFY.status === "closed" && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
              ⚠ This year is closed. All data will be read-only.
            </p>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1.5" onClick={onConfirm}>
            <Check className="w-3.5 h-3.5" /> Switch FY
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Header Placement Example ──────────────────────────────────────────────────
function HeaderFYPlacement({ fy }: { fy: FinancialYear }) {
  const c = FY_STATUS_CONFIG[fy.status];
  return (
    <div className="h-10 bg-white border border-border rounded-lg flex items-center px-4 gap-3 text-xs overflow-x-auto">
      <span className="text-muted-foreground font-medium whitespace-nowrap">← Search</span>
      <span className="w-px h-4 bg-border flex-shrink-0" />
      {/* FY pill */}
      <div className="flex items-center gap-1.5 text-[12px] font-semibold text-foreground whitespace-nowrap flex-shrink-0">
        <Calendar className="w-3.5 h-3.5 text-brand-500" />
        {fy.label}
        <span className={cn(
          "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border",
          c.bg, c.color, c.border,
        )}>
          <span className={cn("w-1.5 h-1.5 rounded-full", c.dot)} />
          {c.label}
        </span>
        <ChevronDown className="w-3 h-3 text-muted-foreground" />
      </div>
      <span className="w-px h-4 bg-border flex-shrink-0" />
      <span className="text-muted-foreground font-medium whitespace-nowrap">State →</span>
      <div className="flex-1" />
      <span className="text-muted-foreground font-medium whitespace-nowrap">Notifications → Profile</span>
    </div>
  );
}

// ── Locked / Closed State ─────────────────────────────────────────────────────
function FYLockedState({ fy }: { fy: FinancialYear }) {
  return (
    <div className="border-2 border-dashed border-rose-200 rounded-xl p-4 bg-rose-50/30 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
          <Lock className="w-5 h-5 text-rose-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{fy.label} — Closed</p>
          <p className="text-xs text-muted-foreground">{fy.start} – {fy.end}</p>
        </div>
        <FYStatusBadge status={fy.status} />
      </div>
      <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
        🔒 This financial year is closed. No new entries can be made. Data is read-only.
      </p>
      <Button variant="outline" size="sm" className="h-7 text-xs border-rose-200 text-rose-600 hover:bg-rose-50" disabled>
        <Lock className="w-3 h-3 mr-1.5" /> Locked — Read Only
      </Button>
    </div>
  );
}

// ── Main Section ──────────────────────────────────────────────────────────────
export default function FinancialYearSection() {
  const liveFY = FINANCIAL_YEARS.find((f) => f.status === "live") ?? FINANCIAL_YEARS[0];
  const closedFY = FINANCIAL_YEARS.find((f) => f.status === "closed") ?? FINANCIAL_YEARS[0];
  const archivedFY = FINANCIAL_YEARS.find((f) => f.status === "archived") ?? FINANCIAL_YEARS[0];

  const [demoSelected, setDemoSelected] = useState<FinancialYear>(liveFY);
  const [pendingFY,    setPendingFY]    = useState<FinancialYear | null>(null);
  const [dialogOpen,   setDialogOpen]   = useState(false);
  const [confirmedFY,  setConfirmedFY]  = useState<FinancialYear>(liveFY);

  const handleDropdownSelect = (fy: FinancialYear) => {
    if (fy.id !== demoSelected.id) {
      setPendingFY(fy);
      setDialogOpen(true);
    }
  };

  const handleConfirm = () => {
    if (pendingFY) { setDemoSelected(pendingFY); setConfirmedFY(pendingFY); }
    setDialogOpen(false);
    setPendingFY(null);
  };

  const statusIcons: Record<FYStatus, React.ElementType> = {
    live: Zap, upcoming: Clock, closed: Check, archived: Archive,
  };

  return (
    <div className="space-y-10">

      {/* ── 1. Status Badges ─────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-bold text-foreground">FY Status Badges</h2>
          <p className="text-xs text-muted-foreground mt-0.5">All four financial year status variants across three sizes</p>
        </div>

        <div className="space-y-4">
          {(["live", "upcoming", "closed", "archived"] as FYStatus[]).map((status) => {
            const Icon = statusIcons[status];
            const c = FY_STATUS_CONFIG[status];
            return (
              <div key={status} className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2 w-24">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium capitalize text-foreground">{status}</span>
                </div>
                <FYStatusBadge status={status} size="sm" />
                <FYStatusBadge status={status} size="md" />
                <FYStatusBadge status={status} size="lg" />
                <code className="text-[10px] bg-muted px-2 py-1 rounded font-mono text-muted-foreground">
                  {c.bg} {c.color}
                </code>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 2. FY Selector Dropdown ───────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-bold text-foreground">FY Selector Dropdown</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Interactive dropdown with checkmark for selected year, status badges per row.
            Currently showing: <span className="font-semibold text-foreground">{demoSelected.label}</span>
          </p>
        </div>
        <div className="max-w-xs">
          <FYDropdown selected={demoSelected} onSelect={handleDropdownSelect} />
        </div>
        {confirmedFY.id !== liveFY.id && (
          <p className="text-xs text-brand-600 font-medium">
            ✓ Switched to {confirmedFY.label} (via confirmation dialog)
          </p>
        )}
      </section>

      {/* ── 3. Switch Confirmation Dialog ────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-bold text-foreground">FY Switch Confirmation Dialog</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Shown before switching FY — warns about data reload, highlights read-only for closed years
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {FINANCIAL_YEARS.filter((f) => f.id !== demoSelected.id).slice(0, 3).map((fy) => (
            <Button
              key={fy.id}
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-2"
              onClick={() => { setPendingFY(fy); setDialogOpen(true); }}
            >
              <Calendar className="w-3.5 h-3.5" />
              Switch to {fy.label}
            </Button>
          ))}
        </div>

        {/* Static preview */}
        <div className="border border-border rounded-xl p-4 bg-muted/20 space-y-3 max-w-sm">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Dialog Preview</p>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-sm font-semibold text-foreground">Switch Financial Year?</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Switching to <span className="font-semibold text-foreground">FY 2023-24</span> will reload dashboard data for that period.
          </p>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border">
            <div className="w-9 h-9 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4 text-brand-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold">FY 2023-24</p>
              <p className="text-[10px] text-muted-foreground">Apr 1, 2023 – Mar 31, 2024</p>
            </div>
            <FYStatusBadge status="closed" size="sm" />
          </div>
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
            ⚠ This year is closed. All data will be read-only.
          </p>
          <div className="flex gap-2 justify-end">
            <div className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground bg-white">Cancel</div>
            <div className="px-3 py-1.5 rounded-lg bg-brand-600 text-xs font-semibold text-white flex items-center gap-1">
              <Check className="w-3 h-3" /> Switch FY
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. Header Placement ───────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-bold text-foreground">Header Placement</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            FY selector sits in the AppHeader between Search and State selector
          </p>
        </div>
        <div className="space-y-2">
          {FINANCIAL_YEARS.filter((f) => f.status !== "archived").map((fy) => (
            <div key={fy.id} className="space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{fy.label}</p>
              <HeaderFYPlacement fy={fy} />
            </div>
          ))}
        </div>
      </section>

      {/* ── 5. Locked / Closed State ──────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-bold text-foreground">Locked / Closed State</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            UI treatment when a user navigates to a closed or archived financial year
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 max-w-lg">
          <FYLockedState fy={closedFY} />
          <FYLockedState fy={archivedFY} />
        </div>
      </section>

      {/* ── 6. Post-Login FY Selection ───────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-bold text-foreground">Post-Login FY Selection Screen</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Shown after successful login — user picks which FY to enter
          </p>
        </div>
        <div className="max-w-sm border border-border rounded-2xl shadow-lg p-6 bg-white space-y-5">
          <div>
            <div className="w-11 h-11 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center mb-4">
              <Calendar className="w-5 h-5 text-brand-500" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Select Financial Year</h3>
            <p className="text-xs text-muted-foreground mt-1">Choose the financial year to work in</p>
          </div>
          <div className="space-y-2">
            {FINANCIAL_YEARS.filter((f) => f.status !== "archived").map((fy) => {
              const isSelected = fy.id === liveFY.id;
              return (
                <div
                  key={fy.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border-2 transition-all",
                    isSelected ? "border-brand-500 bg-brand-50" : "border-border",
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                    isSelected ? "bg-brand-500" : "bg-muted",
                  )}>
                    {isSelected
                      ? <Check className="w-4 h-4 text-white" />
                      : <Calendar className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-foreground">{fy.label}</p>
                    <p className="text-[10px] text-muted-foreground">{fy.start} – {fy.end}</p>
                  </div>
                  <FYStatusBadge status={fy.status} size="sm" />
                </div>
              );
            })}
          </div>
          <Button className="w-full h-9 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold gap-2">
            Enter Dashboard →
          </Button>
        </div>
      </section>

      {/* ── 7. Specs Table ────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-bold text-foreground">Specs & Tokens</h2>
        </div>
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                {["Property", "Value", "Notes"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                ["Storage key",    "dharitrisutra_selected_fy", "localStorage key"],
                ["Live FY dot",    "animate-pulse green dot", "Pulsing green indicator"],
                ["Closed FY",      "Read-only mode",          "All write actions disabled"],
                ["Switch dialog",  "Always shown",            "Prevents accidental switch"],
                ["FY date range",  "Apr 1 – Mar 31",          "Indian financial year"],
                ["Default FY",     "Status = live",           "Auto-selected on load"],
                ["Header height",  "h-12 (48px)",             "Sits below TopNavbar 56px"],
                ["FY pill width",  "Auto (shrinks on mobile)", "Hidden label on small screens"],
              ].map(([prop, val, note]) => (
                <tr key={prop} className="hover:bg-muted/20">
                  <td className="px-4 py-2 font-medium text-foreground">{prop}</td>
                  <td className="px-4 py-2 font-mono text-brand-700 text-[11px]">{val}</td>
                  <td className="px-4 py-2 text-muted-foreground">{note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Dialog instance */}
      <FYSwitchDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setPendingFY(null); }}
        pendingFY={pendingFY}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
