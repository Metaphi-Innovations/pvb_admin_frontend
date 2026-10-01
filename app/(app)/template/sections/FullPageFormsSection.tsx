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
  ChevronDown, ChevronRight, Save, X, ArrowLeft,
  Check, AlertCircle, Settings, FileText, User,
  ChevronLeft,
} from "lucide-react";

// ── Shared ────────────────────────────────────────────────────────────────────
function SectionDivider({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="pb-3 border-b border-border">
      <p className="text-xs font-bold text-foreground">{title}</p>
      {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  );
}

// ── Layout A: Full page form with sticky header + 2-col grid ─────────────────
function FullPageFormDemo() {
  const [active, setActive] = useState(true);
  const [reports, setReports] = useState(true);

  return (
    <div className="border border-border rounded-xl bg-background overflow-hidden shadow-sm" style={{ minHeight: 520 }}>

      {/* Sticky header bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-border px-5 py-3 flex items-center gap-3">
        <button className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-foreground leading-tight">Add Department</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">User Management → Departments → New</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <X className="w-3.5 h-3.5" /> Discard
          </Button>
          <Button size="sm" className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white">
            <Save className="w-3.5 h-3.5" /> Save &amp; Publish
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex gap-0">

        {/* Left — main form */}
        <div className="flex-1 min-w-0 p-6 space-y-6 overflow-y-auto">

          {/* Section 1 */}
          <div className="space-y-4">
            <SectionDivider title="Basic Information" subtitle="Core identity fields" />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Department Name <span className="text-red-500">*</span></Label>
                <Input placeholder="e.g. Sales, HR" className="h-9 text-sm rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Department Code <span className="text-red-500">*</span></Label>
                <Input placeholder="DEPT-001" className="h-9 text-sm rounded-lg font-mono" />
                <p className="text-[11px] text-muted-foreground">Must be unique. Auto-suggested on blur.</p>
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
                <Textarea placeholder="Optional notes…" rows={3} className="text-sm rounded-lg resize-none" />
              </div>
            </div>
          </div>

          {/* Section 2 */}
          <div className="space-y-4">
            <SectionDivider title="Configuration" subtitle="Visibility and reporting settings" />
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20">
                <div>
                  <p className="text-xs font-medium text-foreground">Active Status</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {active ? "Visible and selectable" : "Hidden from selection"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs font-medium", active ? "text-emerald-600" : "text-muted-foreground")}>
                    {active ? "Active" : "Inactive"}
                  </span>
                  <Switch checked={active} onCheckedChange={setActive} />
                </div>
              </div>
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20">
                <div>
                  <p className="text-xs font-medium text-foreground">Include in Reports</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Show in analytics and exports</p>
                </div>
                <Switch checked={reports} onCheckedChange={setReports} />
              </div>
            </div>
          </div>
        </div>

        {/* Right — sidebar summary */}
        <div className="w-64 flex-shrink-0 border-l border-border bg-muted/20 p-5 space-y-5">
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Save Options</p>
            <div className="space-y-2">
              <Button size="sm" className="w-full h-9 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white justify-center">
                <Save className="w-3.5 h-3.5" /> Save &amp; Publish
              </Button>
            </div>
          </div>

          <div className="space-y-2 border-t border-border pt-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</p>
            <div className="flex items-center gap-2">
              <span className={cn(
                "inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium",
                active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600",
              )}>
                <span className={cn("w-1.5 h-1.5 rounded-full", active ? "bg-emerald-500" : "bg-slate-400")} />
                {active ? "Active" : "Inactive"}
              </span>
            </div>
          </div>

          <div className="space-y-2 border-t border-border pt-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Record Info</p>
            <div className="space-y-1.5 text-[11px]">
              <div><span className="text-muted-foreground">Created by</span><p className="font-medium text-foreground">Admin</p></div>
              <div><span className="text-muted-foreground">Created on</span><p className="font-medium text-foreground">—</p></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Layout B: Accordion sections form ────────────────────────────────────────
function AccordionFormDemo() {
  const [open, setOpen] = useState<string[]>(["basic"]);

  const toggle = (key: string) =>
    setOpen(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key]);

  const sections = [
    {
      key: "basic",
      icon: FileText,
      title: "Basic Information",
      subtitle: "Department name, code, and classification",
      content: (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Name <span className="text-red-500">*</span></Label>
            <Input placeholder="e.g. Sales" className="h-9 text-sm rounded-lg" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Code <span className="text-red-500">*</span></Label>
            <Input placeholder="DEPT-001" className="h-9 text-sm rounded-lg font-mono" />
          </div>
        </div>
      ),
    },
    {
      key: "settings",
      icon: Settings,
      title: "Settings",
      subtitle: "Status and visibility configuration",
      content: (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
            <p className="text-xs font-medium">Active Status</p>
            <Switch checked={true} onCheckedChange={() => {}} />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
            <p className="text-xs font-medium">Include in Reports</p>
            <Switch checked={false} onCheckedChange={() => {}} />
          </div>
        </div>
      ),
    },
    {
      key: "contact",
      icon: User,
      title: "Remarks & Notes",
      subtitle: "Optional additional information",
      content: (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Remarks</Label>
          <Textarea placeholder="Optional notes…" rows={3} className="text-sm rounded-lg resize-none" />
        </div>
      ),
    },
  ];

  return (
    <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
      {/* Sticky header */}
      <div className="bg-white border-b border-border px-5 py-3 flex items-center gap-3">
        <button className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-foreground">Edit Department</h2>
          <p className="text-[11px] text-muted-foreground">Accordion layout — expand sections as needed</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs">Cancel</Button>
          <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1.5">
            <Check className="w-3.5 h-3.5" /> Save Changes
          </Button>
        </div>
      </div>

      {/* Accordion sections */}
      <div className="divide-y divide-border">
        {sections.map(sec => {
          const Icon = sec.icon;
          const isOpen = open.includes(sec.key);
          return (
            <div key={sec.key}>
              <button
                onClick={() => toggle(sec.key)}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/30 transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-muted/60 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">{sec.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{sec.subtitle}</p>
                </div>
                <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform flex-shrink-0", isOpen && "rotate-90")} />
              </button>
              {isOpen && (
                <div className="px-5 pb-5 pt-1 bg-muted/10">
                  {sec.content}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 bg-white border-t border-border px-5 py-3 flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" className="h-8 text-xs">Cancel</Button>
        <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1.5">
          <Check className="w-3.5 h-3.5" /> Save Changes
        </Button>
      </div>
    </div>
  );
}

// ── Layout C: Stepped / wizard form ──────────────────────────────────────────
function SteppedFormDemo() {
  const [step, setStep] = useState(1);
  const TOTAL = 3;

  const steps = [
    { num: 1, label: "Basic Info",    desc: "Name & Code" },
    { num: 2, label: "Settings",      desc: "Status & Config" },
    { num: 3, label: "Review",        desc: "Confirm & Save" },
  ];

  return (
    <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
      {/* Step header */}
      <div className="bg-white border-b border-border px-5 py-4">
        <div className="flex items-center gap-0">
          {steps.map((s, i) => (
            <React.Fragment key={s.num}>
              <button
                onClick={() => setStep(s.num)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-left",
                  step === s.num ? "bg-brand-50" : "hover:bg-muted/40",
                )}
              >
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0",
                  step > s.num
                    ? "bg-emerald-500 text-white"
                    : step === s.num
                    ? "bg-brand-600 text-white"
                    : "bg-muted text-muted-foreground",
                )}>
                  {step > s.num ? <Check className="w-3 h-3" /> : s.num}
                </div>
                <div>
                  <p className={cn("text-xs font-semibold", step === s.num ? "text-brand-700" : "text-muted-foreground")}>
                    {s.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{s.desc}</p>
                </div>
              </button>
              {i < steps.length - 1 && (
                <div className={cn("flex-1 h-px mx-2", step > s.num ? "bg-emerald-400" : "bg-border")} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step body */}
      <div className="p-6 min-h-[200px]">
        {step === 1 && (
          <div className="space-y-4 max-w-md">
            <p className="text-xs font-semibold text-foreground mb-3">Step 1 — Basic Information</p>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Department Name <span className="text-red-500">*</span></Label>
              <Input placeholder="e.g. Sales" className="h-9 text-sm rounded-lg" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Department Code <span className="text-red-500">*</span></Label>
              <Input placeholder="DEPT-001" className="h-9 text-sm rounded-lg font-mono" />
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-4 max-w-md">
            <p className="text-xs font-semibold text-foreground mb-3">Step 2 — Configuration</p>
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20">
              <p className="text-xs font-medium">Active Status</p>
              <Switch checked={true} onCheckedChange={() => {}} />
            </div>
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20">
              <p className="text-xs font-medium">Include in Reports</p>
              <Switch checked={true} onCheckedChange={() => {}} />
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-4 max-w-md">
            <p className="text-xs font-semibold text-foreground mb-3">Step 3 — Review &amp; Confirm</p>
            <div className="bg-muted/30 rounded-xl p-4 space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium">Sales</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Code</span><span className="font-mono font-medium">DEPT-001</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="font-medium text-emerald-600">Active</span></div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <p className="text-xs text-emerald-700">Ready to save. Click Confirm below.</p>
            </div>
          </div>
        )}
      </div>

      {/* Step navigation footer */}
      <div className="border-t border-border px-5 py-3 flex items-center justify-between">
        <Button
          variant="outline" size="sm" className="h-8 text-xs gap-1.5"
          disabled={step === 1}
          onClick={() => setStep(s => Math.max(1, s - 1))}
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Back
        </Button>
        <p className="text-xs text-muted-foreground">Step {step} of {TOTAL}</p>
        {step < TOTAL ? (
          <Button size="sm" className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
            onClick={() => setStep(s => Math.min(TOTAL, s + 1))}>
            Next <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        ) : (
          <Button size="sm" className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
            <Check className="w-3.5 h-3.5" /> Confirm &amp; Save
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function FullPageFormsSection() {
  return (
    <div className="space-y-10">

      <div>
        <h2 className="text-sm font-semibold text-foreground">Full Page Forms</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Enterprise full-page form layouts for complex, multi-section data entry.
          Use these for entities with many fields, advanced settings, or multi-step workflows.
        </p>
      </div>

      <Tabs defaultValue="two-col" className="w-full">
        <TabsList className="h-auto flex-wrap gap-1 bg-muted/30 p-1 rounded-lg border border-border">
          <TabsTrigger value="two-col"   className="text-xs rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Two Column + Sidebar</TabsTrigger>
          <TabsTrigger value="accordion" className="text-xs rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Accordion Sections</TabsTrigger>
          <TabsTrigger value="stepped"   className="text-xs rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Stepped / Wizard</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="two-col">
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Two-column form with right sidebar — sticky action bar, 2-col grid, sidebar summary.
                Best for master data with metadata (Customer, Product, Employee records).
              </p>
              <FullPageFormDemo />
            </div>
          </TabsContent>

          <TabsContent value="accordion">
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Collapsible sections — reduces visual noise for long forms. User expands only what's needed.
                Best for settings-heavy records or optional sections.
              </p>
              <AccordionFormDemo />
            </div>
          </TabsContent>

          <TabsContent value="stepped">
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Step-by-step wizard — forces sequential completion. Progress indicator shows current step.
                Best for onboarding flows, complex approvals, and data entry with validation gates.
              </p>
              <SteppedFormDemo />
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* Architecture guide */}
      <div className="bg-brand-50 border border-brand-200 rounded-xl p-5 space-y-4">
        <p className="text-xs font-semibold text-brand-700">Full Page Form Architecture</p>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-xs text-brand-800/80">
          <p>• Sticky top bar — breadcrumb + Discard, Draft, Publish buttons</p>
          <p>• Two-column grid — gap-4, responsive (stack on mobile)</p>
          <p>• Right sidebar — 256px, save shortcuts + record metadata</p>
          <p>• Section dividers — font-bold label + muted subtitle + border-b</p>
          <p>• Input height — h-9 (36px), text-sm, rounded-lg</p>
          <p>• Toggle rows — p-3.5 card with label/desc + Switch</p>
          <p>• Sticky footer (accordion/modal) — border-t, bg-white, h-8 buttons</p>
          <p>• Accordion chevron — ChevronRight rotating 90° when open</p>
          <p>• Stepper indicator — emerald filled = done, brand = current, muted = upcoming</p>
          <p>• Never use native select — use Autocomplete/Popover select</p>
        </div>
      </div>
    </div>
  );
}
