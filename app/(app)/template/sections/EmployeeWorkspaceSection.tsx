"use client";

import React, { useState } from "react";
import {
  User, MapPin, Briefcase, Building2, Mail, Phone, Pencil, Save, X,
  FileText, Clock, CalendarDays, Wallet, Laptop, Target, History,
  CheckCircle2, AlertCircle, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  SectionShell, SectionBlock, PreviewFrame, DoDont, BestPractices,
  TokenUsage, AccessibilityNotes, ProductionNotes, ErpUseCase,
} from "../_components/SectionShell";
import { TplTabs, TplTabsList, TplTabsTrigger, TplTabsContent } from "../_components/TemplateTabs";
import { MOCK_EMPLOYEES, initials } from "../mock/hrms-data";

const EMP = MOCK_EMPLOYEES[0];

const SIDE_NAV = [
  { id: "overview", label: "Overview", icon: User },
  { id: "attendance", label: "Attendance", icon: Clock },
  { id: "leave", label: "Leave", icon: CalendarDays },
  { id: "payroll", label: "Payroll", icon: Wallet },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "assets", label: "Assets", icon: Laptop },
  { id: "performance", label: "Performance", icon: Target },
  { id: "history", label: "History", icon: History },
];

const STATUS_CFG: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700",
  probation: "bg-amber-50 text-amber-700",
  notice: "bg-orange-100 text-orange-700",
  "on-leave": "bg-sky-50 text-sky-700",
  exited: "bg-slate-100 text-slate-600",
};

function ProfileHeader({ editMode }: { editMode: boolean }) {
  return (
    <div className="rounded-[14px] border border-border bg-white p-4 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-[12px] bg-brand-600 text-white flex items-center justify-center text-lg font-bold shrink-0">
          {initials(EMP.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-navy-700">{EMP.name}</h2>
            <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", STATUS_CFG[EMP.status])}>
              {EMP.status.charAt(0).toUpperCase() + EMP.status.slice(1)}
            </span>
            {editMode && (
              <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-[6px]">
                Edit mode
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 font-mono text-brand-700">{EMP.code}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Briefcase className="w-3 h-3" />{EMP.designation}</span>
            <span className="inline-flex items-center gap-1"><Building2 className="w-3 h-3" />{EMP.department}</span>
            <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{EMP.branch}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Profile</p>
          <p className="text-lg font-bold text-foreground leading-none mt-1">{EMP.profilePct}%</p>
          <div className="w-24 h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
            <div className="h-full bg-leaf-600 rounded-full" style={{ width: `${EMP.profilePct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EmployeeWorkspaceSection() {
  const [editMode, setEditMode] = useState(false);
  const [side, setSide] = useState("overview");
  const [dirty, setDirty] = useState(false);

  return (
    <SectionShell overview="Employee Workspace is the primary HRMS profile pattern: sticky header with identity + status, contextual left navigation, scrollable content, view/edit modes, sticky actions, section validation, documents, attendance, leave, payroll, assets, performance, and audit history.">
      <SectionBlock title="Variants" subtitle="View mode vs edit mode with sticky action bar">
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => { setEditMode(false); setDirty(false); }}
            className={cn("h-8 px-3 text-xs rounded-[10px] border font-medium", !editMode ? "bg-brand-600 text-white border-brand-600" : "border-border text-muted-foreground")}
          >
            View mode
          </button>
          <button
            onClick={() => setEditMode(true)}
            className={cn("h-8 px-3 text-xs rounded-[10px] border font-medium", editMode ? "bg-brand-600 text-white border-brand-600" : "border-border text-muted-foreground")}
          >
            Edit mode
          </button>
        </div>

        <PreviewFrame title="Employee profile workspace">
          <div className="space-y-3">
            <ProfileHeader editMode={editMode} />

            <div className="flex gap-3 min-h-[360px]">
              {/* Contextual left nav */}
              <aside className="w-44 shrink-0 rounded-[10px] border border-border bg-muted/20 p-1.5 space-y-0.5">
                {SIDE_NAV.map((item) => {
                  const Icon = item.icon;
                  const active = side === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSide(item.id)}
                      className={cn(
                        "w-full flex items-center gap-2 px-2.5 py-2 rounded-[10px] text-xs font-medium text-left transition-colors",
                        active ? "bg-brand-50 text-brand-700" : "text-foreground hover:bg-muted/60",
                      )}
                    >
                      <Icon className={cn("w-3.5 h-3.5", active ? "text-brand-600" : "text-muted-foreground")} />
                      {item.label}
                    </button>
                  );
                })}
              </aside>

              {/* Scrollable content */}
              <div className="flex-1 rounded-[14px] border border-border bg-white overflow-hidden flex flex-col">
                <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-[320px]">
                  {side === "overview" && (
                    <>
                      <div className="pb-2 border-b border-border">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Personal</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: "Full name", value: EMP.name, key: "name" },
                          { label: "Employee ID", value: EMP.code, key: "code" },
                          { label: "Email", value: EMP.email, key: "email" },
                          { label: "Phone", value: EMP.phone, key: "phone" },
                          { label: "Department", value: EMP.department, key: "dept" },
                          { label: "Designation", value: EMP.designation, key: "desig" },
                          { label: "Reporting manager", value: EMP.manager, key: "mgr" },
                          { label: "Date of joining", value: EMP.doj, key: "doj" },
                        ].map((f) => (
                          <div key={f.key} className="space-y-1">
                            <label className="text-xs font-medium text-foreground">{f.label}</label>
                            {editMode ? (
                              <input
                                defaultValue={f.value}
                                onChange={() => setDirty(true)}
                                className="w-full h-9 px-3 text-sm border border-border rounded-[10px] focus:outline-none focus:ring-2 focus:ring-brand-300"
                              />
                            ) : (
                              <p className="text-[13px] text-foreground py-1.5 flex items-center gap-1.5">
                                {f.key === "email" && <Mail className="w-3 h-3 text-muted-foreground" />}
                                {f.key === "phone" && <Phone className="w-3 h-3 text-muted-foreground" />}
                                {f.value}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>

                      {editMode && (
                        <div className="rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2 flex items-start gap-2">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600 mt-0.5" />
                          <p className="text-[11px] text-amber-800">
                            Section validation: Email and Phone are required. Manager lookup must resolve to an active employee.
                          </p>
                        </div>
                      )}

                      <div className="pb-2 border-b border-border pt-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Activity timeline</p>
                      </div>
                      <div className="space-y-2">
                        {[
                          { t: "Profile updated", d: "Bank account verified by Payroll · 28 Jul 2026", ok: true },
                          { t: "Leave approved", d: "Casual leave 10–11 Aug · by Ananya Deshmukh", ok: true },
                          { t: "Document pending", d: "Form 16 FY25 awaiting employee download", ok: false },
                        ].map((a) => (
                          <div key={a.t} className="flex gap-2.5 items-start">
                            <div className={cn("w-6 h-6 rounded-[8px] flex items-center justify-center shrink-0", a.ok ? "bg-emerald-50" : "bg-amber-50")}>
                              {a.ok ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-600" />}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-foreground">{a.t}</p>
                              <p className="text-[11px] text-muted-foreground">{a.d}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {side === "leave" && (
                    <div className="space-y-3">
                      <TplTabs defaultValue="balance">
                        <TplTabsList>
                          <TplTabsTrigger value="balance" variant="underline">Balance</TplTabsTrigger>
                          <TplTabsTrigger value="requests" variant="underline" count={2}>Requests</TplTabsTrigger>
                          <TplTabsTrigger value="calendar" variant="underline">Calendar</TplTabsTrigger>
                        </TplTabsList>
                        <TplTabsContent value="balance">
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { l: "Casual", v: "6 / 12" },
                              { l: "Sick", v: "8 / 10" },
                              { l: "Earned", v: "14 / 18" },
                            ].map((b) => (
                              <div key={b.l} className="rounded-[14px] border border-border p-3">
                                <p className="text-[11px] text-muted-foreground">{b.l}</p>
                                <p className="text-lg font-bold text-foreground mt-1">{b.v}</p>
                              </div>
                            ))}
                          </div>
                        </TplTabsContent>
                        <TplTabsContent value="requests">
                          <p className="text-xs text-muted-foreground">2 pending leave requests for this employee.</p>
                        </TplTabsContent>
                        <TplTabsContent value="calendar">
                          <p className="text-xs text-muted-foreground">Leave calendar overlay for the month.</p>
                        </TplTabsContent>
                      </TplTabs>
                    </div>
                  )}

                  {side !== "overview" && side !== "leave" && (
                    <div className="py-10 text-center">
                      <p className="text-sm font-medium text-foreground capitalize">{side}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Section content for {side} — attendance register, payslips, assets, reviews, or audit history.
                      </p>
                      <button className="mt-3 text-xs text-brand-600 inline-flex items-center gap-1 font-medium">
                        Open full {side} view <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Sticky action bar */}
                {editMode && (
                  <div className="sticky bottom-0 border-t border-border bg-white px-4 py-2.5 flex items-center gap-2">
                    {dirty && (
                      <p className="text-[11px] text-amber-700 mr-auto">Unsaved changes</p>
                    )}
                    {!dirty && <div className="mr-auto" />}
                    <Button variant="outline" size="sm" className="h-8 text-xs rounded-[10px]" onClick={() => { setEditMode(false); setDirty(false); }}>
                      <X className="w-3.5 h-3.5 mr-1" /> Discard
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs rounded-[10px]">
                      Save draft
                    </Button>
                    <Button size="sm" className="h-8 text-xs rounded-[10px] bg-brand-600 hover:bg-brand-700 text-white" onClick={() => setDirty(false)}>
                      <Save className="w-3.5 h-3.5 mr-1" /> Save
                    </Button>
                  </div>
                )}
                {!editMode && (
                  <div className="border-t border-border bg-muted/20 px-4 py-2.5 flex justify-end">
                    <Button size="sm" className="h-8 text-xs rounded-[10px] bg-brand-600 hover:bg-brand-700 text-white" onClick={() => setEditMode(true)}>
                      <Pencil className="w-3.5 h-3.5 mr-1" /> Edit profile
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Audit metadata */}
            <div className="rounded-[12px] border border-border bg-muted/20 px-3 py-2.5 grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
              <div><span className="text-muted-foreground">Created by</span><p className="font-medium">HR Admin</p></div>
              <div><span className="text-muted-foreground">Created</span><p className="font-medium">12 Apr 2022</p></div>
              <div><span className="text-muted-foreground">Updated by</span><p className="font-medium">Ananya Deshmukh</p></div>
              <div><span className="text-muted-foreground">Updated</span><p className="font-medium">28 Jul 2026</p></div>
            </div>
          </div>
        </PreviewFrame>
      </SectionBlock>

      <ErpUseCase
        title="Customer / Vendor master workspace"
        description="Same pattern applies to ERP party masters: identity header, contextual tabs (Outstanding, Ageing, Documents), view/edit, sticky save. Apply only when redesigning that module explicitly."
      />

      <BestPractices items={[
        "Keep profile header sticky within the workspace viewport.",
        "Use section-level validation messages near the offending fields.",
        "Warn on unsaved changes before leaving edit mode or switching nav.",
        "Always show audit metadata at the bottom of profile views.",
      ]} />

      <DoDont
        dos={["Separate view and edit modes clearly", "Use sticky action bar only in edit mode", "Show profile completion as a progress cue"]}
        donts={["Don't put every HR module in one endless scroll", "Don't use oversized 20px radius on profile cards", "Don't hide required-field errors until final submit only"]}
      />

      <TokenUsage tokens={[
        { token: "rounded-[14px]", use: "Profile header / content cards" },
        { token: "rounded-[10px]", use: "Side nav items, inputs, buttons" },
        { token: "bg-brand-50 text-brand-700", use: "Active contextual nav" },
        { token: "bg-leaf-600", use: "Profile completion fill" },
      ]} />

      <AccessibilityNotes items={[
        "Announce edit/view mode changes to screen readers.",
        "Trap focus in sticky action bar when validation fails on save.",
        "Side nav should be a nav landmark with aria-current.",
      ]} />

      <ProductionNotes items={[
        "Template mock only — do not wire to HR APIs from /template.",
        "Existing production profile pages must remain unchanged until a dedicated redesign task.",
      ]} />
    </SectionShell>
  );
}
