"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  X, Check, Edit2, Plus, Eye, ChevronDown,
  Building2, ArrowUpDown, Activity, FileText,
  Calendar, Clock, User,
} from "lucide-react";

// ── Quick Add Drawer mockup ───────────────────────────────────────────────────
function QuickAddDrawer() {
  const [active, setActive] = useState(true);
  const [form, setForm] = useState({ name: "", code: "DEPT-009", remarks: "" });

  return (
    <div className="flex rounded-xl overflow-hidden border border-border shadow-sm bg-background" style={{ minHeight: 480 }}>
      {/* Main content (dimmed overlay reference) */}
      <div className="flex-1 bg-muted/30 flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-white border border-border flex items-center justify-center mx-auto">
            <Building2 className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">Content area with overlay</p>
          <p className="text-[11px] text-muted-foreground/60">bg-black/40 backdrop-blur-sm</p>
        </div>
      </div>

      {/* Drawer panel */}
      <div className="w-[400px] flex-shrink-0 bg-white border-l border-border flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 px-5 pt-5 pb-4 border-b border-border">
          <div className="flex items-start gap-3 pr-6">
            <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-4 h-4 text-brand-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground leading-tight">Add Department</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Create a new department</p>
            </div>
          </div>
          {/* Close button (absolute top-right) */}
          <button className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Department Name <span className="text-red-500">*</span>
            </Label>
            <Input
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Sales, HR, Accounts"
              className="h-9 text-sm rounded-lg"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Department Code <span className="text-red-500">*</span>
            </Label>
            <Input
              value={form.code}
              onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
              placeholder="DEPT-001"
              className="h-9 text-sm rounded-lg font-mono"
            />
            <p className="text-[11px] text-muted-foreground">Must be unique across all departments.</p>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20">
            <div>
              <p className="text-xs font-medium text-foreground">Status</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {active ? "Active and visible" : "Inactive and hidden"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn("text-xs font-medium", active ? "text-emerald-600" : "text-muted-foreground")}>
                {active ? "Active" : "Inactive"}
              </span>
              <Switch checked={active} onCheckedChange={setActive} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Remarks</Label>
            <Textarea
              value={form.remarks}
              onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))}
              placeholder="Optional notes…"
              className="text-sm rounded-lg resize-none"
              rows={3}
            />
          </div>
        </div>

        {/* Sticky footer */}
        <div className="flex-shrink-0 flex items-center justify-end gap-2 px-5 py-4 border-t border-border bg-muted/30">
          <Button variant="outline" size="sm" className="h-8 text-xs">Cancel</Button>
          <Button size="sm" className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white">
            <Check className="w-3.5 h-3.5" /> Create Department
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── View / Detail Drawer mockup ───────────────────────────────────────────────
function ViewDrawer() {
  function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
    return (
      <div className="flex items-start justify-between py-2.5 border-b border-border/50 last:border-0 gap-4">
        <span className="text-xs text-muted-foreground flex-shrink-0 w-28">{label}</span>
        <span className={cn("text-xs font-medium text-foreground text-right", mono && "font-mono")}>{value || "—"}</span>
      </div>
    );
  }

  return (
    <div className="flex rounded-xl overflow-hidden border border-border shadow-sm bg-background" style={{ minHeight: 480 }}>
      {/* Main content */}
      <div className="flex-1 bg-muted/30 flex items-center justify-center p-6">
        <p className="text-xs text-muted-foreground">Content area</p>
      </div>

      {/* View drawer */}
      <div className="w-[400px] flex-shrink-0 bg-white border-l border-border flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 px-5 pt-5 pb-4 border-b border-border">
          <div className="flex items-start gap-3 pr-6">
            <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-4 h-4 text-brand-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-foreground leading-tight truncate">Sales</h3>
              <p className="text-xs text-muted-foreground mt-0.5">DEPT-001</p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Active
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {/* Details */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
              <FileText className="w-3 h-3" /> Department Details
            </p>
            <div className="bg-muted/20 rounded-xl border border-border/50 px-3">
              <InfoRow label="Code"    value="DEPT-001" mono />
              <InfoRow label="Name"    value="Sales" />
              <InfoRow label="Status"  value="Active" />
              <InfoRow label="Remarks" value="—" />
            </div>
          </div>

          {/* History */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
              <Activity className="w-3 h-3" /> History &amp; Audit
            </p>
            <div className="space-y-2.5">
              {[
                { icon: Calendar, color: "blue", label: "Created", detail: "By Admin on 2024-01-10" },
                { icon: Clock,    color: "amber", label: "Last Updated", detail: "By Admin on 2024-01-10" },
                { icon: ArrowUpDown, color: "emerald", label: "Last Status Change", detail: "Changed to Active on 2024-01-10" },
                { icon: User,     color: "purple", label: "Last Action", detail: "Record created by Admin" },
              ].map(({ icon: Icon, color, label, detail }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-lg bg-${color}-50 border border-${color}-100 flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <Icon className={`w-3.5 h-3.5 text-${color}-500`} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">{label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex items-center justify-end gap-2 px-5 py-4 border-t border-border bg-muted/30">
          <Button variant="outline" size="sm" className="h-8 text-xs">Close</Button>
          <Button size="sm" className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white">
            <Edit2 className="w-3.5 h-3.5" /> Edit
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Anatomy spec ──────────────────────────────────────────────────────────────
function DrawerAnatomySpec() {
  return (
    <div className="space-y-4">
      {/* Structure diagram */}
      <div className="border border-border rounded-xl overflow-hidden">
        {[
          { zone: "Header",     bg: "bg-blue-50",    text: "text-blue-700",   spec: "flex-shrink-0 · px-5 pt-5 pb-4 · border-b · max-width 440px",    h: "h-16" },
          { zone: "Body",       bg: "bg-muted/30",   text: "text-foreground", spec: "flex-1 overflow-y-auto · px-5 py-5 · space-y-4 between fields",   h: "h-28" },
          { zone: "Footer",     bg: "bg-amber-50",   text: "text-amber-700",  spec: "flex-shrink-0 · px-5 py-4 · border-t · bg-muted/30 · Cancel + CTA",h: "h-12" },
        ].map(z => (
          <div key={z.zone} className={cn("px-4 py-3 flex items-center justify-between border-b last:border-0", z.bg, z.h)}>
            <div className="flex items-center gap-3">
              <span className={cn("text-xs font-bold w-16 flex-shrink-0", z.text)}>{z.zone}</span>
              <span className="text-[11px] font-mono text-muted-foreground">{z.spec}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Spec table */}
      <div className="bg-muted/20 border border-border/50 rounded-xl px-4 divide-y divide-border/50">
        {[
          { k: "Panel width",       v: "max-w-[440px] (fixed right slide-in)" },
          { k: "Header structure",  v: "Icon badge (10×10 rounded-xl) + title + desc + close ×" },
          { k: "Body padding",      v: "px-5 py-5, space-y-4 between fields" },
          { k: "Footer bg",         v: "bg-muted/30 for visual separation" },
          { k: "CTA button",        v: "h-8 text-xs bg-brand-600 text-white gap-1.5" },
          { k: "Cancel button",     v: "h-8 text-xs variant=outline" },
          { k: "Close button",      v: "absolute top-4 right-4 · X icon · p-1.5 rounded-lg" },
          { k: "Animation",         v: "slide-in-from-right on open · slide-out-to-right on close" },
          { k: "Overlay",           v: "bg-black/40 backdrop-blur-sm" },
          { k: "Field height",      v: "h-9 (36px)" },
        ].map(({ k, v }) => (
          <div key={k} className="flex items-start justify-between py-2.5 gap-4">
            <span className="text-xs text-muted-foreground flex-shrink-0 w-36">{k}</span>
            <span className="text-xs font-medium text-foreground text-right">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function DrawerFormsSection() {
  return (
    <div className="space-y-10">

      <div>
        <h2 className="text-sm font-semibold text-foreground">Drawer / Sheet Forms</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Right-panel slide-in drawer for quick add, edit, and view operations.
          Use for forms with fewer than 8 fields. For complex multi-section forms, use Full Page Forms instead.
        </p>
      </div>

      <Tabs defaultValue="add" className="w-full">
        <TabsList className="h-auto flex-wrap gap-1 bg-muted/30 p-1 rounded-lg border border-border">
          <TabsTrigger value="add"     className="text-xs rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Quick Add</TabsTrigger>
          <TabsTrigger value="view"    className="text-xs rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">View / Detail</TabsTrigger>
          <TabsTrigger value="anatomy" className="text-xs rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Anatomy &amp; Specs</TabsTrigger>
        </TabsList>

        <div className="mt-6 relative">
          <TabsContent value="add">
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Quick Add drawer — fields limited to essential creation data (Name, Code, Status, Remarks).
                Audit metadata shown in edit mode only.
              </p>
              <QuickAddDrawer />
            </div>
          </TabsContent>

          <TabsContent value="view">
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                View drawer — read-only display with header badge, detail rows, and history timeline.
                Footer shows Close + Edit buttons.
              </p>
              <ViewDrawer />
            </div>
          </TabsContent>

          <TabsContent value="anatomy">
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Drawer structure spec — three zones (Header / Body / Footer) with exact Tailwind classes.
              </p>
              <DrawerAnatomySpec />
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* When to use guide */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-emerald-700 mb-2">Use Drawer Forms When</p>
          <ul className="space-y-1 text-xs text-emerald-800/80">
            <li>• 4–7 fields maximum</li>
            <li>• Quick add / quick edit flow</li>
            <li>• User stays in context of the listing page</li>
            <li>• Master data (Department, Category, UOM)</li>
            <li>• View-only details with edit shortcut</li>
          </ul>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-amber-700 mb-2">Use Full Page Forms When</p>
          <ul className="space-y-1 text-xs text-amber-800/80">
            <li>• 8+ fields or multiple sections</li>
            <li>• Complex entity (Customer, Product, Employee)</li>
            <li>• Nested data (line items, contacts, addresses)</li>
            <li>• File uploads or rich text</li>
            <li>• Multi-step / wizard flow</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
