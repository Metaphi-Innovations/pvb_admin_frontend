"use client";

import { useState } from "react";
import {
  User, Clock, CalendarDays, Wallet, FileText, Settings, CheckSquare,
  ChevronDown, Users, Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SectionShell, SectionBlock, PreviewFrame, DoDont, BestPractices,
  TokenUsage, AccessibilityNotes, ProductionNotes, ErpUseCase,
} from "../_components/SectionShell";
import { TplTabs, TplTabsList, TplTabsTrigger, TplTabsContent } from "../_components/TemplateTabs";

export default function TabsAccordionSection() {
  const [expandedAccordion, setExpandedAccordion] = useState(0);

  return (
    <SectionShell overview="Template tabs are denser and clearer: 40–44px height, 16–20px horizontal padding, 14px medium weight. Selected tabs use brand text, visible background tint, and a strong bottom indicator. Use Template-only TplTabs for previews — production Tabs stay unchanged.">
      <SectionBlock title="Variants" subtitle="Underline, pill, segment · with counts and icons">
        <PreviewFrame title="Employee profile tabs">
          <TplTabs defaultValue="overview">
            <TplTabsList variant="underline" className="w-full">
              <TplTabsTrigger value="overview" variant="underline" className="group">
                <User className="w-4 h-4" /> Overview
              </TplTabsTrigger>
              <TplTabsTrigger value="attendance" variant="underline" className="group">
                <Clock className="w-4 h-4" /> Attendance
              </TplTabsTrigger>
              <TplTabsTrigger value="leave" variant="underline" count={3} className="group">
                <CalendarDays className="w-4 h-4" /> Leave
              </TplTabsTrigger>
              <TplTabsTrigger value="payroll" variant="underline" className="group">
                <Wallet className="w-4 h-4" /> Payroll
              </TplTabsTrigger>
              <TplTabsTrigger value="docs" variant="underline" count={6} className="group">
                <FileText className="w-4 h-4" /> Documents
              </TplTabsTrigger>
            </TplTabsList>
            <TplTabsContent value="overview">
              <p className="text-[13px] text-foreground">Profile overview — identity, role, department, status.</p>
            </TplTabsContent>
            <TplTabsContent value="attendance">
              <p className="text-[13px] text-foreground">Attendance register for the selected employee.</p>
            </TplTabsContent>
            <TplTabsContent value="leave">
              <p className="text-[13px] text-foreground">3 pending leave requests (count badge).</p>
            </TplTabsContent>
            <TplTabsContent value="payroll">
              <p className="text-[13px] text-foreground">Payslips and YTD summary.</p>
            </TplTabsContent>
            <TplTabsContent value="docs">
              <p className="text-[13px] text-foreground">Employee documents requiring verification.</p>
            </TplTabsContent>
          </TplTabs>
        </PreviewFrame>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <PreviewFrame title="Pill tabs · Approvals">
            <TplTabs defaultValue="pending">
              <TplTabsList variant="pill">
                <TplTabsTrigger value="pending" variant="pill" count={12} className="group">Pending</TplTabsTrigger>
                <TplTabsTrigger value="approved" variant="pill">Approved</TplTabsTrigger>
                <TplTabsTrigger value="rejected" variant="pill">Rejected</TplTabsTrigger>
              </TplTabsList>
              <TplTabsContent value="pending" className="mt-3">
                <p className="text-xs text-muted-foreground">Leave, expense, and salary revision approvals.</p>
              </TplTabsContent>
              <TplTabsContent value="approved" className="mt-3">
                <p className="text-xs text-muted-foreground">Recently approved items.</p>
              </TplTabsContent>
              <TplTabsContent value="rejected" className="mt-3">
                <p className="text-xs text-muted-foreground">Rejected with reason codes.</p>
              </TplTabsContent>
            </TplTabs>
          </PreviewFrame>

          <PreviewFrame title="Segment · Attendance period">
            <TplTabs defaultValue="day">
              <TplTabsList variant="segment">
                <TplTabsTrigger value="day" variant="segment">Day</TplTabsTrigger>
                <TplTabsTrigger value="week" variant="segment">Week</TplTabsTrigger>
                <TplTabsTrigger value="month" variant="segment">Month</TplTabsTrigger>
              </TplTabsList>
              <TplTabsContent value="day" className="mt-3 text-xs text-muted-foreground">Today&apos;s punch register.</TplTabsContent>
              <TplTabsContent value="week" className="mt-3 text-xs text-muted-foreground">Weekly hours summary.</TplTabsContent>
              <TplTabsContent value="month" className="mt-3 text-xs text-muted-foreground">Monthly attendance sheet.</TplTabsContent>
            </TplTabs>
          </PreviewFrame>
        </div>
      </SectionBlock>

      <SectionBlock title="Real HRMS examples">
        <PreviewFrame title="Scrollable + sticky tabs chrome">
          <div className="sticky top-0 z-[1] bg-white border border-border rounded-[10px] overflow-hidden">
            <TplTabs defaultValue="directory">
              <TplTabsList variant="underline" className="px-1">
                {[
                  { id: "directory", label: "Directory", icon: Users },
                  { id: "leave", label: "Leave", icon: CalendarDays },
                  { id: "payroll", label: "Payroll", icon: Wallet },
                  { id: "recruit", label: "Recruitment", icon: Briefcase },
                  { id: "settings", label: "Settings", icon: Settings },
                  { id: "approvals", label: "Approvals", icon: CheckSquare },
                ].map((t) => (
                  <TplTabsTrigger key={t.id} value={t.id} variant="underline" className="group">
                    <t.icon className="w-4 h-4" /> {t.label}
                  </TplTabsTrigger>
                ))}
              </TplTabsList>
              <TplTabsContent value="directory" className="p-3 m-0">
                <p className="text-xs text-muted-foreground">Sticky tab bar above long employee grids.</p>
              </TplTabsContent>
              <TplTabsContent value="leave" className="p-3 m-0 text-xs text-muted-foreground">Leave inbox</TplTabsContent>
              <TplTabsContent value="payroll" className="p-3 m-0 text-xs text-muted-foreground">Payroll cycles</TplTabsContent>
              <TplTabsContent value="recruit" className="p-3 m-0 text-xs text-muted-foreground">Candidates pipeline</TplTabsContent>
              <TplTabsContent value="settings" className="p-3 m-0 text-xs text-muted-foreground">HR settings</TplTabsContent>
              <TplTabsContent value="approvals" className="p-3 m-0 text-xs text-muted-foreground">Approval queue</TplTabsContent>
            </TplTabs>
          </div>
        </PreviewFrame>
      </SectionBlock>

      <ErpUseCase
        title="ERP transaction tabs"
        description="Sales order / invoice detail tabs (Lines, Tax, Dispatch, Audit) should follow the same height and active indicator. Apply only when redesigning those modules — do not change global Tabs defaults from Template."
      />

      <SectionBlock title="Accordion" subtitle="HR FAQ / policy sections">
        <div className="space-y-2">
          {[
            { title: "How do I apply for leave?", content: "Open Leave → Apply, select type and dates, submit for manager approval." },
            { title: "When is payroll processed?", content: "Payroll cut-off is the 25th; payslips publish on the last working day." },
            { title: "Where are offer letters stored?", content: "Document Center → HR Letters. Verified letters are downloadable by the employee." },
          ].map((item, idx) => (
            <div key={item.title} className="border border-border rounded-[12px] overflow-hidden bg-white">
              <button
                onClick={() => setExpandedAccordion(expandedAccordion === idx ? -1 : idx)}
                className="w-full px-4 h-11 flex items-center justify-between hover:bg-muted/20 transition-colors"
              >
                <p className="text-sm font-medium text-foreground text-left">{item.title}</p>
                <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", expandedAccordion === idx && "rotate-180")} />
              </button>
              {expandedAccordion === idx && (
                <div className="px-4 py-3 bg-muted/10 border-t border-border">
                  <p className="text-xs text-foreground">{item.content}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </SectionBlock>

      <BestPractices items={[
        "Height 40–44px, px-4–5, text-sm font-medium.",
        "Active: brand text + brand-50 tint + 2px bottom bar.",
        "Use counts for queues (approvals, leave, documents).",
        "Prefer horizontal scroll over wrapping many tabs.",
      ]} />

      <DoDont
        dos={["Show clear selected background + indicator", "Support icons + counts", "Keep animation short (150ms colors)"]}
        donts={["Don't rely on underline alone without tint", "Don't use tiny 28px consumer tabs", "Don't mutate shared components/ui/tabs defaults for Template demos"]}
      />

      <TokenUsage tokens={[
        { token: "h-10 / h-11", use: "Tab trigger height" },
        { token: "text-sm font-medium", use: "Tab label" },
        { token: "text-brand-700 bg-brand-50/60", use: "Active underline tab" },
        { token: "after:h-0.5 after:bg-brand-600", use: "Active indicator bar" },
        { token: "rounded-[10px]", use: "Pill / segment chrome" },
      ]} />

      <AccessibilityNotes items={[
        "Use role=tablist / tab / tabpanel (Radix provides this).",
        "Count badges need accessible text (e.g. \"3 pending\").",
        "Keyboard arrows should move between tabs.",
      ]} />

      <ProductionNotes items={[
        "TplTabs lives under app/(app)/template/_components — Template only.",
        "components/ui/tabs remains the production default (backward compatible).",
        "ERP transaction tabs should adopt this pattern via explicit redesign tasks.",
      ]} />
    </SectionShell>
  );
}
