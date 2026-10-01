"use client";

import React from "react";
import {
  SectionShell, SectionBlock, PreviewFrame, DoDont, BestPractices,
  TokenUsage, AccessibilityNotes, ProductionNotes, ErpUseCase,
} from "../_components/SectionShell";

const SHADOWS = [
  { name: "None", example: "shadow-none", use: "Flat table cells, inset chrome" },
  { name: "XS / SM", example: "shadow-sm", use: "Table shells, filter bars, sidebars" },
  { name: "Card", example: "shadow-card", use: "KPI cards, employee cards" },
  { name: "MD", example: "shadow-md", use: "Dropdowns, popovers, command palette" },
  { name: "Modal", example: "shadow-modal / shadow-xl", use: "Dialogs, drawers" },
];

export default function ShadowsSection() {
  return (
    <SectionShell overview="Shadows establish restrained elevation for enterprise surfaces. Prefer shadow-sm on data containers; reserve heavier elevation for overlays. Avoid multi-layer glow effects.">
      <SectionBlock title="Tokens">
        <div className="space-y-3">
          {SHADOWS.map((item) => (
            <div key={item.name} className="border border-border rounded-[12px] bg-white p-3.5 flex items-center gap-4">
              <div className={`w-16 h-16 bg-white rounded-[14px] border border-border flex-shrink-0 ${item.example}`} />
              <div>
                <p className="text-xs font-semibold text-foreground">{item.name}</p>
                <p className="text-[11px] font-mono text-brand-700 mt-0.5">{item.example}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{item.use}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionBlock>

      <SectionBlock title="Usage · Real HRMS example">
        <PreviewFrame title="Directory toolbar + employee card">
          <div className="space-y-3">
            <div className="rounded-[12px] border border-border bg-white shadow-sm px-3 py-2.5 flex items-center gap-2">
              <div className="h-8 flex-1 rounded-[10px] bg-muted/40" />
              <div className="h-8 w-20 rounded-[10px] bg-brand-600" />
            </div>
            <div className="rounded-[14px] border border-border bg-white shadow-card p-3 w-56">
              <p className="text-sm font-semibold text-navy-700">Priya Sharma</p>
              <p className="text-[11px] text-muted-foreground">HRBP · EMP-1042</p>
            </div>
          </div>
        </PreviewFrame>
      </SectionBlock>

      <ErpUseCase
        title="Invoice listing"
        description="Table container uses shadow-sm. Confirmation dialogs use shadow-modal. Keep production pages unchanged until redesign."
      />

      <BestPractices items={[
        "One elevation language per surface type.",
        "Hover elevation only on interactive cards, not every row.",
        "Pair border + light shadow — don't rely on shadow alone.",
      ]} />

      <DoDont
        dos={["shadow-sm on tables and toolbars", "shadow-card on KPI / employee cards", "shadow-md on menus"]}
        donts={["Don't stack multiple colored glows", "Don't put shadow-xl on every card", "Don't remove borders and rely only on shadow"]}
      />

      <TokenUsage tokens={SHADOWS.map((s) => ({ token: s.example, use: s.use }))} />

      <AccessibilityNotes items={[
        "Shadows are decorative — focus rings remain required for keyboard users.",
      ]} />

      <ProductionNotes items={[
        "Template documentation only. Do not change global shadow tokens from here.",
      ]} />
    </SectionShell>
  );
}
