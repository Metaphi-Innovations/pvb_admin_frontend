"use client";

import Link from "next/link";
import {
  ArrowLeftRight,
  BarChart3,
  CalendarRange,
  FileSpreadsheet,
  FileText,
  Scale,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  GST_REPORT_NAV_CARDS,
  buildGstReportHref,
  type GstReportFilters,
} from "@/lib/accounts/gst-report-filters";

const CARD_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  gstr1: FileText,
  gstr3b: FileSpreadsheet,
  gstr2a: ArrowLeftRight,
  gstr2b: ArrowLeftRight,
  "annual-computation": CalendarRange,
};

const CARD_DESCRIPTIONS: Record<string, string> = {
  gstr1: "Outward supplies — B2B, B2C, HSN, credit/debit notes",
  gstr3b: "Monthly return summary — tax liability and ITC",
  gstr2a: "Reconcile purchase ITC with GSTR-2A portal data",
  gstr2b: "Reconcile ITC with auto-drafted GSTR-2B statement",
  "annual-computation": "Month-wise annual GST computation summary",
};

export function GstReportNavCards({ filters }: { filters: GstReportFilters }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {GST_REPORT_NAV_CARDS.map((card) => {
        const Icon = CARD_ICONS[card.id] ?? BarChart3;
        return (
          <Link
            key={card.id}
            href={buildGstReportHref(card.href, filters)}
            className={cn(
              "group rounded-xl border border-border bg-white p-4 shadow-sm",
              "hover:border-brand-300 hover:bg-brand-50/40 transition-colors",
            )}
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-100 transition-colors">
                <Icon className="w-4 h-4 text-brand-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground group-hover:text-brand-700 transition-colors">
                  {card.label}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                  {CARD_DESCRIPTIONS[card.id] ?? "View report"}
                </p>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export function GstReportSectionHeading({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 pb-2 border-b border-border">
      <Scale className="w-3.5 h-3.5 text-muted-foreground" />
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
