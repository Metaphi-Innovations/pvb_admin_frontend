"use client";

import React from "react";
import {
  SectionShell, SectionBlock, PreviewFrame, DoDont, BestPractices,
  TokenUsage, AccessibilityNotes, ProductionNotes, ErpUseCase,
} from "../_components/SectionShell";

const RADIUS = [
  { name: "Sidebar / Nav", value: "10px", token: "rounded-[10px]", use: "App rail buttons, sidebar items, tabs chrome" },
  { name: "Inputs", value: "10px", token: "rounded-[10px]", use: "Text fields, selects, search" },
  { name: "Buttons", value: "10px", token: "rounded-[10px]", use: "Primary / secondary actions" },
  { name: "Dropdowns", value: "12px", token: "rounded-[12px]", use: "Menus, popovers, filter panels" },
  { name: "Tables", value: "12px", token: "rounded-[12px]", use: "Datagrid containers" },
  { name: "Cards", value: "14px", token: "rounded-[14px]", use: "KPI cards, profile panels, preview frames" },
  { name: "Dialogs", value: "18px", token: "rounded-[18px] / rounded-2xl", use: "Modals only — not everyday surfaces" },
  { name: "Pills", value: "9999px", token: "rounded-full", use: "Status chips, avatars" },
];

export default function BorderRadiusSection() {
  return (
    <SectionShell overview="Template border radius is intentionally restrained. Stop over-rounding every surface. Use 10px for interactive chrome, 12px for tables/menus, 14px for cards, and reserve 18px for dialogs only.">
      <SectionBlock title="Tokens" subtitle="Canonical radii for /template HRMS + ERP reference">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {RADIUS.map((item) => (
            <div key={item.name} className="border border-border rounded-[14px] p-3.5 bg-white shadow-sm flex gap-3">
              <div
                className="w-16 h-16 bg-brand-500 flex-shrink-0"
                style={{ borderRadius: item.value === "9999px" ? "9999px" : item.value }}
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">{item.name}</p>
                <p className="text-[11px] font-mono text-brand-700 mt-0.5">{item.value} · {item.token}</p>
                <p className="text-[11px] text-muted-foreground mt-1.5">{item.use}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionBlock>

      <SectionBlock title="Real HRMS usage">
        <PreviewFrame title="Employee card vs dialog">
          <div className="flex flex-wrap gap-4 items-start">
            <div className="rounded-[14px] border border-border p-3 w-56 shadow-sm">
              <p className="text-xs font-semibold">Priya Sharma</p>
              <p className="text-[11px] text-muted-foreground">HRBP · Card 14px</p>
              <button className="mt-2 h-8 px-3 text-xs rounded-[10px] bg-brand-600 text-white">View</button>
            </div>
            <div className="rounded-[12px] border border-border overflow-hidden w-64">
              <div className="bg-muted/40 px-3 py-2 text-[11px] font-semibold">Table 12px</div>
              <div className="px-3 py-2 text-[11px] border-t border-border">EMP-1042 · Active</div>
            </div>
            <div className="rounded-[18px] border border-border p-4 w-52 shadow-modal bg-white">
              <p className="text-xs font-semibold">Confirm leave</p>
              <p className="text-[11px] text-muted-foreground mt-1">Dialog 18px only</p>
            </div>
          </div>
        </PreviewFrame>
      </SectionBlock>

      <SectionBlock title="Table / form / workspace">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[12px]">
          <div className="rounded-[12px] border border-border p-3 bg-muted/20">
            <p className="font-semibold text-foreground">Table</p>
            <p className="text-muted-foreground mt-1">Container 12px. Cells stay square.</p>
          </div>
          <div className="rounded-[14px] border border-border p-3 bg-muted/20">
            <p className="font-semibold text-foreground">Form card</p>
            <p className="text-muted-foreground mt-1">Card 14px · inputs 10px.</p>
          </div>
          <div className="rounded-[10px] border border-border p-3 bg-muted/20">
            <p className="font-semibold text-foreground">Workspace nav</p>
            <p className="text-muted-foreground mt-1">Sidebar items 10px.</p>
          </div>
        </div>
      </SectionBlock>

      <ErpUseCase
        title="Sales invoice listing"
        description="Use 12px on the invoice table shell and 10px on Export / New Invoice. Do not apply dialog radius to listing cards. Existing modules stay as-is until redesigned."
      />

      <BestPractices items={[
        "Match radius to role: chrome → 10, data → 12, surfaces → 14, overlays → 18.",
        "Never mix 18–20px radius on buttons, inputs, and sidebars.",
        "Status pills may use rounded-full; containers must not.",
      ]} />

      <DoDont
        dos={["Use 10px for buttons, inputs, tabs", "Reserve 18px for modals", "Keep table corners at 12px"]}
        donts={["Do not use 18–20px on every card", "Do not invent one-off radii", "Do not change global Tailwind radius tokens from Template demos"]}
      />

      <TokenUsage tokens={RADIUS.map((r) => ({ token: r.token, use: r.use }))} />

      <AccessibilityNotes items={[
        "Radius does not replace focus rings — keep ring-brand-300 on inputs.",
        "Circular avatars need text alternatives (initials or name).",
      ]} />

      <ProductionNotes items={[
        "These radii are Template reference standards for new HRMS work.",
        "Do not globally rewrite rounded-xl across production modules from this page.",
      ]} />
    </SectionShell>
  );
}
