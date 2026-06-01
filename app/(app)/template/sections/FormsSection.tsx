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
  Eye, EyeOff, AlertCircle, CheckCircle2, Search, Calendar,
  ChevronDown, X,
} from "lucide-react";

// ── Shared atoms ──────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
      {children}
    </p>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-border/50 last:border-0 gap-4">
      <span className="text-xs text-muted-foreground w-40 flex-shrink-0">{label}</span>
      <span className="text-xs font-medium text-foreground text-right">{value}</span>
    </div>
  );
}

// ── Field variants demo ───────────────────────────────────────────────────────
function FieldStates() {
  const [showPw, setShowPw] = useState(false);
  const [search, setSearch] = useState("");

  return (
    <div className="space-y-5">

      {/* Standard input */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">
          Department Name <span className="text-red-500">*</span>
        </Label>
        <Input placeholder="e.g. Sales, HR, Accounts" className="h-9 text-sm rounded-lg" />
        <p className="text-[11px] text-muted-foreground">Helper text explaining what to enter.</p>
      </div>

      {/* Search input with icon */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Search Input</Label>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search departments…"
            className="pl-8 h-9 text-sm rounded-lg"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Password with toggle */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Password</Label>
        <div className="relative">
          <Input
            type={showPw ? "text" : "password"}
            placeholder="••••••••"
            className="h-9 text-sm rounded-lg pr-9"
          />
          <button
            type="button"
            onClick={() => setShowPw(v => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Date picker (native for now) */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Date</Label>
        <div className="relative">
          <Calendar className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            type="date"
            className="pl-8 h-9 text-sm rounded-lg"
          />
        </div>
      </div>

      {/* Textarea */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Remarks</Label>
        <Textarea
          placeholder="Any additional notes or remarks…"
          rows={3}
          className="text-sm rounded-lg resize-none"
        />
        <p className="text-[11px] text-muted-foreground">Optional field.</p>
      </div>

      {/* Custom select (no native select) */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Category</Label>
        <button className="w-full h-9 px-3 text-sm text-left border border-border rounded-lg bg-background flex items-center justify-between hover:bg-muted/30 transition-colors">
          <span className="text-muted-foreground">Select a category…</span>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </button>
        <p className="text-[11px] text-muted-foreground">Uses Autocomplete/Select component — never native select.</p>
      </div>
    </div>
  );
}

// ── Field states (error / success / disabled) ─────────────────────────────────
function FieldStateVariants() {
  return (
    <div className="space-y-5">

      {/* Error state */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">
          Department Code <span className="text-red-500">*</span>
        </Label>
        <Input
          value="DEPT 01"
          readOnly
          className="h-9 text-sm rounded-lg border-red-400 focus-visible:ring-red-300"
        />
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          Code must be uppercase and contain no spaces (e.g. DEPT-001)
        </p>
      </div>

      {/* Success state */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Email</Label>
        <div className="relative">
          <Input
            value="admin@dharitrisutra.com"
            readOnly
            className="h-9 text-sm rounded-lg border-emerald-400 pr-9"
          />
          <CheckCircle2 className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500" />
        </div>
        <p className="text-[11px] text-emerald-600">Valid email address.</p>
      </div>

      {/* Disabled state */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">
          Auto-generated ID
        </Label>
        <Input
          value="DEPT-009"
          disabled
          className="h-9 text-sm rounded-lg font-mono"
        />
        <p className="text-[11px] text-muted-foreground">System-generated, not editable.</p>
      </div>

      {/* Read-only */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Created By</Label>
        <Input
          value="Admin"
          readOnly
          className="h-9 text-sm rounded-lg bg-muted/40 cursor-default"
        />
        <p className="text-[11px] text-muted-foreground">Read-only audit field.</p>
      </div>

      {/* Required indicator pattern */}
      <div className="bg-muted/30 rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold text-foreground">Validation Patterns</p>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>• <span className="text-red-500 font-medium">*</span> = required field (label level)</p>
          <p>• Red border + error icon + message = validation error</p>
          <p>• Green border + check icon = valid</p>
          <p>• Dimmed label + cursor-not-allowed = disabled</p>
          <p>• bg-muted/40 background = read-only / system field</p>
          <p>• Helper text (muted, 11px) below input for hints</p>
        </div>
      </div>
    </div>
  );
}

// ── Controls: Switch, Checkbox, Radio ─────────────────────────────────────────
function ControlElements() {
  const [active, setActive] = useState(true);
  const [notify, setNotify] = useState(false);
  const [checked, setChecked] = useState<string[]>(["option-1"]);
  const [radio, setRadio] = useState("email");

  const toggleCheck = (v: string) =>
    setChecked(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);

  return (
    <div className="space-y-6">

      {/* Status toggle in card (canonical pattern) */}
      <div className="space-y-2">
        <SectionLabel>Status Toggle — Card Pattern</SectionLabel>
        <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20">
          <div>
            <p className="text-xs font-medium text-foreground">Status</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {active ? "Department is active and visible" : "Department is inactive"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn("text-xs font-medium", active ? "text-emerald-600" : "text-muted-foreground")}>
              {active ? "Active" : "Inactive"}
            </span>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
        </div>
      </div>

      {/* Notification toggle */}
      <div className="space-y-2">
        <SectionLabel>Simple Toggle Row</SectionLabel>
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-xs font-medium text-foreground">Email Notifications</p>
            <p className="text-[11px] text-muted-foreground">Receive alerts for approvals and status changes</p>
          </div>
          <Switch checked={notify} onCheckedChange={setNotify} />
        </div>
      </div>

      {/* Checkboxes */}
      <div className="space-y-2">
        <SectionLabel>Checkboxes (Multi-select)</SectionLabel>
        <div className="space-y-2">
          {["option-1", "option-2", "option-3"].map(v => (
            <label key={v} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                className="w-4 h-4 rounded accent-brand-600 cursor-pointer"
                checked={checked.includes(v)}
                onChange={() => toggleCheck(v)}
              />
              <span className="text-xs text-foreground capitalize group-hover:text-brand-700 transition-colors">
                {v.replace("-", " ")}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Radio */}
      <div className="space-y-2">
        <SectionLabel>Radio (Single-select)</SectionLabel>
        <div className="space-y-2">
          {[
            { value: "email", label: "Email", desc: "admin@dharitrisutra.com" },
            { value: "sms",   label: "SMS",   desc: "+91 98765 43210" },
            { value: "none",  label: "None",  desc: "No notifications" },
          ].map(opt => (
            <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="radio"
                name="notif-type"
                className="w-4 h-4 accent-brand-600 cursor-pointer"
                checked={radio === opt.value}
                onChange={() => setRadio(opt.value)}
              />
              <div>
                <p className="text-xs font-medium text-foreground">{opt.label}</p>
                <p className="text-[11px] text-muted-foreground">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Layout: single column vs two column ───────────────────────────────────────
function LayoutPatterns() {
  return (
    <div className="space-y-8">

      {/* Single column — drawer/modal forms */}
      <div className="space-y-3">
        <SectionLabel>Single Column — Drawer / Modal Forms</SectionLabel>
        <div className="bg-white border border-border rounded-xl p-4 space-y-4 max-w-sm">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Department Name <span className="text-red-500">*</span></Label>
            <Input placeholder="e.g. Sales" className="h-9 text-sm rounded-lg" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Department Code <span className="text-red-500">*</span></Label>
            <Input placeholder="DEPT-001" className="h-9 text-sm rounded-lg font-mono" />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
            <p className="text-xs font-medium">Status</p>
            <Switch checked={true} onCheckedChange={() => {}} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Remarks</Label>
            <Textarea placeholder="Optional notes…" rows={2} className="text-sm rounded-lg resize-none" />
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" className="h-8 text-xs">Cancel</Button>
            <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white">Save</Button>
          </div>
        </div>
      </div>

      {/* Two column — full-page forms */}
      <div className="space-y-3">
        <SectionLabel>Two Column — Full Page / Section Forms</SectionLabel>
        <div className="bg-white border border-border rounded-xl p-5 space-y-5">
          {/* Section header */}
          <div className="pb-3 border-b border-border">
            <p className="text-xs font-bold text-foreground">Basic Information</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Core department identity fields</p>
          </div>
          {/* 2-col grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Department Name <span className="text-red-500">*</span></Label>
              <Input placeholder="e.g. Sales" className="h-9 text-sm rounded-lg" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Department Code <span className="text-red-500">*</span></Label>
              <Input placeholder="DEPT-001" className="h-9 text-sm rounded-lg font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Category</Label>
              <button className="w-full h-9 px-3 text-sm text-left border border-border rounded-lg bg-background flex items-center justify-between hover:bg-muted/30 transition-colors">
                <span className="text-muted-foreground text-sm">Select category…</span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Effective Date</Label>
              <Input type="date" className="h-9 text-sm rounded-lg" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-medium">Remarks</Label>
              <Textarea placeholder="Optional notes…" rows={2} className="text-sm rounded-lg resize-none" />
            </div>
          </div>
          {/* Section 2 */}
          <div className="pb-3 border-b border-border mt-2">
            <p className="text-xs font-bold text-foreground">Settings</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20 col-span-1">
              <p className="text-xs font-medium">Active</p>
              <Switch checked={true} onCheckedChange={() => {}} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20 col-span-1">
              <p className="text-xs font-medium">Visible in Reports</p>
              <Switch checked={false} onCheckedChange={() => {}} />
            </div>
          </div>
        </div>
      </div>

      {/* Specs */}
      <div className="space-y-2">
        <SectionLabel>Field Sizing Specs</SectionLabel>
        <div className="bg-muted/20 border border-border/50 rounded-xl px-4">
          <SpecRow label="Input height"         value="h-9 (36px)" />
          <SpecRow label="Label size"           value="text-xs font-medium" />
          <SpecRow label="Helper / error text"  value="text-[11px] or text-xs" />
          <SpecRow label="Border radius"        value="rounded-lg (8px)" />
          <SpecRow label="Gap between fields"   value="space-y-4 or space-y-1.5 within" />
          <SpecRow label="2-col gap"            value="gap-4 (16px)" />
          <SpecRow label="Section divider"      value="border-b border-border + pb-3" />
        </div>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function FormsSection() {
  return (
    <div className="space-y-8">

      <div>
        <h2 className="text-sm font-semibold text-foreground">Form Foundations</h2>
        <p className="text-xs text-muted-foreground mt-1">
          All reusable form field components, states, controls and layout patterns.
          See <strong>Full Page Forms</strong> and <strong>Drawer Forms</strong> for complete form shells.
        </p>
      </div>

      <Tabs defaultValue="fields" className="w-full">
        <TabsList className="h-auto flex-wrap gap-1 bg-muted/30 p-1 rounded-lg border border-border">
          <TabsTrigger value="fields"   className="text-xs rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Input Fields</TabsTrigger>
          <TabsTrigger value="states"   className="text-xs rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Field States</TabsTrigger>
          <TabsTrigger value="controls" className="text-xs rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Controls</TabsTrigger>
          <TabsTrigger value="layouts"  className="text-xs rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Layout Patterns</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="fields">
            <div className="max-w-md"><FieldStates /></div>
          </TabsContent>

          <TabsContent value="states">
            <div className="max-w-md"><FieldStateVariants /></div>
          </TabsContent>

          <TabsContent value="controls">
            <div className="max-w-md"><ControlElements /></div>
          </TabsContent>

          <TabsContent value="layouts">
            <LayoutPatterns />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
