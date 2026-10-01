"use client";

import React from "react";
import { Copy, Check } from "lucide-react";
import {
  SectionShell, SectionBlock, PreviewFrame, DoDont, BestPractices,
  TokenUsage, AccessibilityNotes, ProductionNotes, ErpUseCase,
} from "../_components/SectionShell";

export default function ColorSection() {
  const [copied, setCopied] = React.useState<string | null>(null);

  const colors = {
    brand: [
      { name: "50",  hex: "#FFF3E8", use: "Lightest tint backgrounds" },
      { name: "100", hex: "#FFE4C4", use: "Light backgrounds, hover tints" },
      { name: "200", hex: "#FFCB90", use: "Hover states, subtle accents" },
      { name: "300", hex: "#FFAA55", use: "Borders, visual accents" },
      { name: "400", hex: "#FF8C2A", use: "Muted primary elements" },
      { name: "500", hex: "#F47920", use: "Logo orange — primary brand" },
      { name: "600", hex: "#D96A10", use: "Primary CTA buttons, active states" },
      { name: "700", hex: "#B85508", use: "Hover on active, active links" },
      { name: "800", hex: "#94400A", use: "Dark text on light brand bg" },
      { name: "900", hex: "#6B2D07", use: "Very dark backgrounds" },
      { name: "950", hex: "#3D1503", use: "Text on brand-colored surfaces" },
    ],
    navy: [
      { name: "50",  hex: "#EEF2FF", use: "Lightest navy tint" },
      { name: "100", hex: "#D8E2FF", use: "Light navy backgrounds" },
      { name: "200", hex: "#B8C9FF", use: "Navy borders" },
      { name: "300", hex: "#8AAEFF", use: "Navy accents" },
      { name: "400", hex: "#5C8EEE", use: "Navy interactive elements" },
      { name: "500", hex: "#3A6DD8", use: "Navy primary" },
      { name: "600", hex: "#2451B7", use: "Navy CTA, secondary actions" },
      { name: "700", hex: "#1A3A96", use: "Logo navy — page titles, headings" },
      { name: "800", hex: "#153080", use: "Dark navy" },
      { name: "900", hex: "#0F2266", use: "Darkest navy" },
    ],
    leaf: [
      { name: "300", hex: "#7CC87C", use: "Leaf accent borders" },
      { name: "400", hex: "#50AF50", use: "Leaf interactive" },
      { name: "500", hex: "#33913A", use: "Leaf primary" },
      { name: "600", hex: "#267A2E", use: "Logo leaf — active/approved states" },
      { name: "700", hex: "#1A5F22", use: "Hover on leaf elements" },
    ],
    semantic: [
      { name: "Success", hex: "#267A2E", use: "Success / approved states" },
      { name: "Warning", hex: "#92400e", use: "Warning states" },
      { name: "Error",   hex: "#991b1b", use: "Error / rejected states" },
      { name: "Info",    hex: "#1A3A96", use: "Information / draft states" },
      { name: "Neutral", hex: "#6b7280", use: "Disabled, neutral text" },
    ],
  };

  const copyColor = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopied(hex);
    setTimeout(() => setCopied(null), 2000);
  };

  function SwatchGrid({
    prefix,
    items,
  }: {
    prefix?: string;
    items: { name: string; hex: string; use: string }[];
  }) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {items.map((color) => (
          <button
            key={color.hex + color.name}
            type="button"
            className="text-left bg-muted/40 rounded-[12px] p-3 hover:bg-muted/60 transition-colors group"
            onClick={() => copyColor(color.hex)}
          >
            <div className="flex items-center gap-3 mb-1.5">
              <div className="w-10 h-10 rounded-[10px] border border-border shadow-sm" style={{ backgroundColor: color.hex }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">
                  {prefix ? `${prefix}-${color.name}` : color.name}
                </p>
                <p className="text-xs text-muted-foreground font-mono">{color.hex}</p>
              </div>
              {copied === color.hex ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">{color.use}</p>
          </button>
        ))}
      </div>
    );
  }

  return (
    <SectionShell overview="Dharitri Sutra uses a three-palette system: brand orange (action), navy (structure), and leaf green (success). Template examples default to HRMS contexts — employee status, leave, payroll — without changing production module colors.">
      <SectionBlock title="Tokens" subtitle="Brand · Navy · Leaf · Semantic">
        <div className="space-y-6">
          <div>
            <h4 className="text-xs font-semibold text-foreground mb-3">Brand (primary)</h4>
            <SwatchGrid prefix="brand" items={colors.brand} />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-foreground mb-1">Navy — headings & structure</h4>
            <p className="text-[11px] text-muted-foreground mb-3">Page titles, section labels, secondary actions.</p>
            <SwatchGrid prefix="navy" items={colors.navy} />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-foreground mb-1">Leaf — success / active</h4>
            <p className="text-[11px] text-muted-foreground mb-3">Approved, present, verified, profile complete.</p>
            <SwatchGrid prefix="leaf" items={colors.leaf} />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-foreground mb-3">Semantic</h4>
            <SwatchGrid items={colors.semantic} />
          </div>
        </div>
      </SectionBlock>

      <SectionBlock title="Usage">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[12px]">
          <div className="rounded-[14px] border border-border p-3 bg-white">
            <p className="font-semibold text-brand-700">brand-600</p>
            <p className="text-muted-foreground mt-1">CTA, active nav, selected tabs</p>
          </div>
          <div className="rounded-[14px] border border-border p-3 bg-white">
            <p className="font-semibold text-navy-700">navy-700</p>
            <p className="text-muted-foreground mt-1">Employee name, page titles</p>
          </div>
          <div className="rounded-[14px] border border-border p-3 bg-white">
            <p className="font-semibold text-leaf-700">leaf-600</p>
            <p className="text-muted-foreground mt-1">Present, approved, verified</p>
          </div>
        </div>
      </SectionBlock>

      <SectionBlock title="Real HRMS example">
        <PreviewFrame title="Leave status chips">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Pending
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Approved
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Rejected
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 font-medium border border-brand-200">
              Active filter
            </span>
          </div>
        </PreviewFrame>
      </SectionBlock>

      <ErpUseCase
        title="Invoice / order status"
        description="Same semantic mapping: draft→slate, pending→amber, approved→emerald, overdue→red. Apply only when redesigning that module."
      />

      <BestPractices items={[
        "Always use Tailwind tokens — never hardcode hex in JSX.",
        "Reserve brand orange for actions; use leaf for success status.",
        "Navy for hierarchy, not for every button.",
      ]} />

      <DoDont
        dos={["Use bg-brand-600 for primary CTA", "Use text-navy-700 for employee/page titles", "Use emerald/leaf for approved/present"]}
        donts={["Don't use bg-orange-600 — use brand-*", "Don't mix emerald and brand for the same active meaning", "Don't change global tokens from Template demos"]}
      />

      <TokenUsage tokens={[
        { token: "bg-brand-600", use: "Primary CTA / active states" },
        { token: "text-navy-700", use: "Titles and identity headers" },
        { token: "bg-leaf-600 / emerald-*", use: "Success and approved" },
        { token: "bg-brand-50", use: "Selected rows, filter chips" },
      ]} />

      <AccessibilityNotes items={[
        "Never convey status by color alone — pair with text or a status pill.",
        "Ensure brand-600 on white meets contrast for button labels.",
      ]} />

      <ProductionNotes items={[
        "Template reference only. Existing ERP pages keep their current color usage until explicitly redesigned.",
        "Do not edit tailwind.config.js from this Template task.",
      ]} />
    </SectionShell>
  );
}
