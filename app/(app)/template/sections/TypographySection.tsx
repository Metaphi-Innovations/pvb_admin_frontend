"use client";

import React from "react";
import {
  SectionShell, SectionBlock, PreviewFrame, DoDont, BestPractices,
  TokenUsage, AccessibilityNotes, ProductionNotes, ErpUseCase,
} from "../_components/SectionShell";

const SCALE = [
  { name: "Page Title", size: "20px", weight: "700", line: "28px", tw: "text-xl font-bold", example: "Employee Directory", usage: "One h1 per page" },
  { name: "Section Title", size: "16px", weight: "600", line: "22px", tw: "text-base font-semibold", example: "Leave balances", usage: "Drawer / workspace section" },
  { name: "Card Title", size: "14px", weight: "600", line: "20px", tw: "text-sm font-semibold", example: "Pending approvals", usage: "KPI / panel headers" },
  { name: "Widget Title", size: "11px", weight: "600", line: "14px", tw: "text-[11px] font-semibold uppercase tracking-wide", example: "ATTENDANCE TODAY", usage: "Dashboard widget labels" },
  { name: "Field Label", size: "12px", weight: "500", line: "16px", tw: "text-xs font-medium", example: "Date of joining", usage: "Form labels" },
  { name: "Table Header", size: "12px", weight: "600", line: "16px", tw: "text-xs font-semibold", example: "Employee ID", usage: "Column headers" },
  { name: "Body", size: "13px", weight: "400", line: "18px", tw: "text-[13px]", example: "Priya Sharma reports to Ananya Deshmukh.", usage: "Default content" },
  { name: "Caption", size: "12px", weight: "400", line: "16px", tw: "text-xs text-muted-foreground", example: "Human Resources · Pune HO", usage: "Subtitles under names" },
  { name: "Helper", size: "11px", weight: "400", line: "14px", tw: "text-[11px] text-muted-foreground", example: "Must be an active employee.", usage: "Form hints" },
  { name: "Badge", size: "11px", weight: "600", line: "14px", tw: "text-[11px] font-semibold", example: "On probation", usage: "Status chips" },
  { name: "KPI Numbers", size: "20–24px", weight: "700", line: "28px", tw: "text-xl / text-2xl font-bold", example: "248", usage: "Dashboard / listing KPIs" },
  { name: "Audit Text", size: "11px", weight: "400", line: "14px", tw: "text-[11px] text-muted-foreground", example: "Updated by HR Admin · 28 Jul 2026", usage: "Record metadata" },
];

export default function TypographySection() {
  return (
    <SectionShell overview="Typography hierarchy keeps dense HRMS screens scannable. Prefer compact enterprise sizes (not marketing display type). Font stack: Plus Jakarta Sans / Inter — not generic system-only UIs.">
      <SectionBlock title="Tokens" subtitle="Canonical type scale for Template / new HRMS work">
        <div className="space-y-2">
          {SCALE.map((item) => (
            <div key={item.name} className="border border-border rounded-[12px] bg-white p-3.5 grid grid-cols-1 md:grid-cols-[140px_1fr_120px] gap-3 items-center">
              <div>
                <p className="text-xs font-semibold text-foreground">{item.name}</p>
                <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{item.size} / {item.weight}</p>
              </div>
              <div className="min-w-0">
                <p
                  className="text-foreground truncate"
                  style={{ fontSize: item.size.includes("–") ? "20px" : item.size, fontWeight: Number(item.weight), lineHeight: item.line }}
                >
                  {item.example}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">{item.usage}</p>
              </div>
              <code className="text-[10px] font-mono text-brand-700 bg-brand-50 px-1.5 py-1 rounded-[6px] justify-self-start md:justify-self-end">
                {item.tw}
              </code>
            </div>
          ))}
        </div>
      </SectionBlock>

      <SectionBlock title="Usage">
        <PreviewFrame title="Employee header hierarchy">
          <div className="space-y-1">
            <p className="text-xl font-bold text-navy-700">Priya Sharma</p>
            <p className="text-xs text-muted-foreground">HR Business Partner · Human Resources</p>
            <p className="font-mono text-xs font-semibold text-brand-700">EMP-1042</p>
            <p className="text-[11px] text-muted-foreground pt-2">Updated by Ananya Deshmukh · 28 Jul 2026</p>
          </div>
        </PreviewFrame>
      </SectionBlock>

      <SectionBlock title="Real HRMS example">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Present today", value: "231" },
            { label: "On leave", value: "12" },
            { label: "Pending approvals", value: "18" },
            { label: "Docs expiring", value: "5" },
          ].map((k) => (
            <div key={k.label} className="rounded-[14px] border border-border bg-white p-3 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{k.label}</p>
              <p className="text-2xl font-bold text-foreground mt-1">{k.value}</p>
            </div>
          ))}
        </div>
      </SectionBlock>

      <ErpUseCase
        title="Sales invoice listing"
        description="Page title for Invoices, table headers at text-xs font-semibold, amounts in body/mono. Same hierarchy — apply only on redesign."
      />

      <BestPractices items={[
        "One page title per view.",
        "Table headers never larger than body.",
        "Codes and IDs use font-mono + brand-700.",
        "Audit text stays muted and 11px.",
      ]} />

      <DoDont
        dos={["Use text-navy-700 for major titles", "Keep labels at text-xs font-medium", "Pair KPI number with muted widget title"]}
        donts={["Don't use 28–32px marketing titles in ERP", "Don't set form labels to text-sm/base", "Don't use text-gray-500 — use text-muted-foreground"]}
      />

      <TokenUsage tokens={SCALE.slice(0, 6).map((s) => ({ token: s.tw, use: s.name }))} />

      <AccessibilityNotes items={[
        "Do not rely on weight alone for hierarchy — size + color also help.",
        "Maintain readable line-height on long form helper text.",
      ]} />

      <ProductionNotes items={[
        "Scale aligns with CLAUDE.md compact ERP type — Template demos use HRMS copy.",
        "Do not change global font tokens from this page.",
      ]} />
    </SectionShell>
  );
}
