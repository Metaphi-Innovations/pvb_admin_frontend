"use client";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PVB HRMS — Standard Information Icon UX (convention)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * WHEN TO USE
 * - Beside settings titles, section headings, policies, and calculations where
 *   an explanation adds value (what / when / which module / business rules).
 * - Do NOT place beside every obvious field label.
 *
 * SHORT vs LONG
 * - mode="popover" — compact click-to-open popover for short explanations.
 * - mode="drawer"  — read-only Sheet for longer copy or live policy/calculation
 *   breakdowns (show actual configured values from canonical settings).
 *
 * DO NOT
 * - Create separate Overview pages or large explanation cards when this icon
 *   is enough.
 * - Hardcode misleading example policy/calculation values — read live config.
 * - Replace the eye (view record) or Edit actions with this icon.
 * - Invent a second info-component family; extend HrInfoHint instead.
 *
 * STYLING
 * - Small circled "i" (lucide Info), compact, accessible (aria-label, keyboard).
 * - Uses existing Tooltip/Popover/Sheet primitives only.
 *
 * First live consumer: Welcome Workflow. Roll out to other Admin HR screens
 * using the same component and content shape.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export type HrInfoHintSection = {
  label: string;
  body: React.ReactNode;
};

export type HrInfoHintContent = {
  /** Drawer / popover title */
  title: string;
  /** One-line summary (popover body or drawer subtitle) */
  summary: string;
  /** What the feature does */
  what?: React.ReactNode;
  /** When it applies */
  when?: React.ReactNode;
  /** Which module / area it affects */
  affects?: React.ReactNode;
  /** Business rules, limitations, or live configured values */
  rules?: React.ReactNode;
  /** Extra labeled blocks (e.g. current setup snapshot) */
  sections?: HrInfoHintSection[];
};

export type HrInfoHintMode = "popover" | "drawer";

function InfoGlyph({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-5 items-center justify-center rounded-full",
        "border border-border bg-white text-muted-foreground",
        "hover:border-brand-300 hover:text-brand-700 hover:bg-brand-50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
        "transition-colors",
        className,
      )}
    >
      <Info className="h-3 w-3" aria-hidden />
    </span>
  );
}

function ContentBlocks({ content }: { content: HrInfoHintContent }) {
  const rows: { label: string; body: React.ReactNode }[] = [];
  if (content.what) rows.push({ label: "What it does", body: content.what });
  if (content.when) rows.push({ label: "When it applies", body: content.when });
  if (content.affects) rows.push({ label: "Affects", body: content.affects });
  if (content.rules) rows.push({ label: "Rules & limits", body: content.rules });
  for (const s of content.sections ?? []) rows.push(s);

  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.label}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {r.label}
          </p>
          <div className="mt-1 text-xs text-foreground leading-snug">{r.body}</div>
        </div>
      ))}
    </div>
  );
}

/**
 * Circled information icon. Click opens a compact popover or a read-only drawer.
 */
export function HrInfoHint({
  mode = "popover",
  content,
  className,
  buttonClassName,
  "aria-label": ariaLabel,
}: {
  mode?: HrInfoHintMode;
  content: HrInfoHintContent;
  className?: string;
  buttonClassName?: string;
  "aria-label"?: string;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const label = ariaLabel ?? `About ${content.title}`;

  if (mode === "drawer") {
    return (
      <span className={cn("inline-flex items-center", className)}>
        <button
          type="button"
          className={cn("inline-flex shrink-0", buttonClassName)}
          aria-label={label}
          onClick={() => setDrawerOpen(true)}
        >
          <InfoGlyph />
        </button>
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent className="max-w-[400px]">
            <SheetHeader>
              <SheetTitle>{content.title}</SheetTitle>
              <SheetDescription>{content.summary}</SheetDescription>
            </SheetHeader>
            <SheetBody className="space-y-4">
              <ContentBlocks content={content} />
            </SheetBody>
          </SheetContent>
        </Sheet>
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn("inline-flex shrink-0", buttonClassName)}
            aria-label={label}
          >
            <InfoGlyph />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-3 space-y-2">
          <p className="text-xs font-semibold text-foreground">{content.title}</p>
          <p className="text-[11px] text-muted-foreground leading-snug">{content.summary}</p>
          {(content.what ||
            content.when ||
            content.affects ||
            content.rules ||
            (content.sections && content.sections.length > 0)) && (
            <div className="pt-1 border-t border-border">
              <ContentBlocks content={content} />
            </div>
          )}
        </PopoverContent>
      </Popover>
    </span>
  );
}

/** Inline heading + info icon (compact section label). */
export function HrInfoHeading({
  children,
  info,
  mode = "popover",
  className,
  as: Tag = "h2",
}: {
  children: React.ReactNode;
  info: HrInfoHintContent;
  mode?: HrInfoHintMode;
  className?: string;
  as?: "h2" | "h3" | "p" | "span";
}) {
  return (
    <div className={cn("flex items-center gap-1.5 min-w-0", className)}>
      <Tag className="text-xs font-semibold text-foreground truncate">{children}</Tag>
      <HrInfoHint mode={mode} content={info} />
    </div>
  );
}
