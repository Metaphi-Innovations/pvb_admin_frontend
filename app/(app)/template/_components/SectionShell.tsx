"use client";

import React from "react";
import { Check, X, Info, AlertTriangle, Accessibility, Factory } from "lucide-react";
import { cn } from "@/lib/utils";

/** Template-only section page shell. Not used outside /template. */
export function SectionShell({
  overview,
  children,
}: {
  overview: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-8 max-w-[1100px]">
      <div className="rounded-[14px] border border-border bg-white p-4 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
          Overview
        </p>
        <p className="text-[13px] text-foreground leading-relaxed">{overview}</p>
        <p className="text-[11px] text-muted-foreground mt-2">
          HRMS is the primary focus of this Design System. Existing ERP modules must not change unless
          explicitly tasked. Patterns here are reference for future work.
        </p>
      </div>
      {children}
    </div>
  );
}

export function SectionBlock({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <div>
        <h3 className="text-sm font-semibold text-navy-700">{title}</h3>
        {subtitle && (
          <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
      {children}
    </section>
  );
}

export function PreviewFrame({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-[14px] border border-border bg-white shadow-sm overflow-hidden", className)}>
      {title && (
        <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center justify-between">
          <p className="text-[11px] font-semibold text-foreground">{title}</p>
          <span className="text-[10px] text-muted-foreground font-medium">Live mock · no API</span>
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

export function DoDont({
  dos,
  donts,
}: {
  dos: string[];
  donts: string[];
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="rounded-[12px] border border-emerald-200 bg-emerald-50/50 p-3.5">
        <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5 mb-2">
          <Check className="w-3.5 h-3.5" /> Do
        </p>
        <ul className="space-y-1.5">
          {dos.map((d) => (
            <li key={d} className="text-[12px] text-emerald-800/90 leading-snug flex gap-2">
              <span className="text-emerald-500 mt-0.5">•</span>
              <span>{d}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-[12px] border border-red-200 bg-red-50/50 p-3.5">
        <p className="text-xs font-semibold text-red-700 flex items-center gap-1.5 mb-2">
          <X className="w-3.5 h-3.5" /> Don&apos;t
        </p>
        <ul className="space-y-1.5">
          {donts.map((d) => (
            <li key={d} className="text-[12px] text-red-800/90 leading-snug flex gap-2">
              <span className="text-red-400 mt-0.5">•</span>
              <span>{d}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function BestPractices({ items }: { items: string[] }) {
  return (
    <div className="rounded-[12px] border border-navy-100 bg-navy-50/40 p-3.5">
      <p className="text-xs font-semibold text-navy-700 flex items-center gap-1.5 mb-2">
        <Info className="w-3.5 h-3.5" /> Best practices
      </p>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item} className="text-[12px] text-navy-800/80 leading-snug flex gap-2">
            <span className="text-navy-400 mt-0.5">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TokenUsage({ tokens }: { tokens: { token: string; use: string }[] }) {
  return (
    <div className="rounded-[12px] border border-border bg-muted/20 overflow-hidden">
      <div className="px-3.5 py-2 border-b border-border">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Token usage
        </p>
      </div>
      <div className="divide-y divide-border/60">
        {tokens.map((t) => (
          <div key={t.token} className="flex items-start gap-3 px-3.5 py-2">
            <code className="text-[11px] font-mono font-semibold text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded-[6px] shrink-0">
              {t.token}
            </code>
            <span className="text-[12px] text-muted-foreground">{t.use}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AccessibilityNotes({ items }: { items: string[] }) {
  return (
    <div className="rounded-[12px] border border-border bg-white p-3.5">
      <p className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-2">
        <Accessibility className="w-3.5 h-3.5 text-brand-600" /> Accessibility
      </p>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item} className="text-[12px] text-muted-foreground leading-snug flex gap-2">
            <span>•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProductionNotes({ items }: { items: string[] }) {
  return (
    <div className="rounded-[12px] border border-amber-200 bg-amber-50/40 p-3.5">
      <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5 mb-2">
        <Factory className="w-3.5 h-3.5" /> Production notes
      </p>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item} className="text-[12px] text-amber-900/80 leading-snug flex gap-2">
            <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ErpUseCase({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[12px] border border-border bg-white p-3.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
        ERP use case
      </p>
      <p className="text-xs font-semibold text-foreground">{title}</p>
      <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">{description}</p>
    </div>
  );
}

export function HrmsExampleLabel({ children }: { children?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] bg-brand-50 border border-brand-200 text-[10px] font-semibold text-brand-700">
      HRMS example
      {children}
    </span>
  );
}
