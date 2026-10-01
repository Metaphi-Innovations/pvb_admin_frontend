"use client";

import React from "react";
import {
  SectionShell, SectionBlock, PreviewFrame, DoDont, BestPractices,
  TokenUsage, AccessibilityNotes, ProductionNotes, ErpUseCase,
} from "../_components/SectionShell";

const SPACING = [
  { name: "xs", value: "4px", use: "Icon-to-label gap" },
  { name: "sm", value: "8px", use: "Table row vertical padding, badge padding" },
  { name: "md", value: "12px", use: "Form field gaps, KPI grid gap" },
  { name: "lg", value: "16px", use: "Page section spacing, card padding" },
  { name: "xl", value: "20px", use: "Drawer body padding" },
  { name: "2xl", value: "24px", use: "Major panel spacing (sparingly)" },
];

export default function SpacingSection() {
  return (
    <SectionShell overview="Spacing follows a compact 4px grid. Foundation pages stay concise: show tokens, then real HRMS / table / form / workspace usage — not decorative demos.">
      <SectionBlock title="Tokens">
        <div className="space-y-2">
          {SPACING.map((item) => (
            <div key={item.name} className="flex items-center gap-4 border border-border rounded-[12px] bg-white px-3 py-2.5">
              <div className="w-12 shrink-0">
                <p className="text-xs font-semibold text-foreground">{item.name}</p>
                <p className="text-[10px] font-mono text-muted-foreground">{item.value}</p>
              </div>
              <div className="bg-brand-200 h-4 rounded-sm shrink-0" style={{ width: item.value }} />
              <p className="text-[11px] text-muted-foreground">{item.use}</p>
            </div>
          ))}
        </div>
      </SectionBlock>

      <SectionBlock title="Real HRMS usage">
        <PreviewFrame title="Employee workspace rhythm">
          <div className="space-y-3 text-[12px]">
            <div className="rounded-[14px] border border-border p-3">Profile header · card padding 12–16px</div>
            <div className="flex gap-3">
              <div className="w-40 rounded-[10px] border border-border p-2 space-y-1">
                <div className="h-8 rounded-[10px] bg-brand-50" />
                <div className="h-8 rounded-[10px] bg-muted/40" />
                <div className="h-8 rounded-[10px] bg-muted/40" />
              </div>
              <div className="flex-1 rounded-[14px] border border-border p-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-9 rounded-[10px] bg-muted/40" />
                  <div className="h-9 rounded-[10px] bg-muted/40" />
                </div>
                <p className="text-[11px] text-muted-foreground">Form fields: space-y-3 (12px), not space-y-5.</p>
              </div>
            </div>
          </div>
        </PreviewFrame>
      </SectionBlock>

      <SectionBlock title="Table & form">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px]">
          <div className="rounded-[12px] border border-border p-3">
            <p className="font-semibold">Table</p>
            <p className="text-muted-foreground mt-1">Header py-2.5 · row py-2 · cell px-4 · footer py-2.5</p>
          </div>
          <div className="rounded-[12px] border border-border p-3">
            <p className="font-semibold">Form</p>
            <p className="text-muted-foreground mt-1">Between fields space-y-3 · within field space-y-1.5 · page sections space-y-4</p>
          </div>
        </div>
      </SectionBlock>

      <ErpUseCase
        title="Listing pages"
        description="Keep KPI → toolbar → table at space-y-4. Avoid space-y-6/8 which creates excessive scroll depth in ERP screens."
      />

      <BestPractices items={[
        "Default to the compact end of ranges.",
        "Page main remains px-5 py-4.",
        "Employee workspace side nav uses tight py-2 items.",
      ]} />

      <DoDont
        dos={["Use gap-3 for KPI grids", "Use space-y-3 between form fields", "Keep table rows dense"]}
        donts={["Don't use space-y-6 on listing pages", "Don't pad Foundation demos with decorative whitespace", "Don't invent spacing outside the 4px grid"]}
      />

      <TokenUsage tokens={SPACING.map((s) => ({ token: s.name, use: `${s.value} — ${s.use}` }))} />

      <AccessibilityNotes items={[
        "Touch targets for icon buttons should still meet ~36px even when visual padding is compact.",
      ]} />

      <ProductionNotes items={[
        "Template spacing guidance is for new HRMS work. Existing modules keep their current spacing until an explicit redesign.",
      ]} />
    </SectionShell>
  );
}
