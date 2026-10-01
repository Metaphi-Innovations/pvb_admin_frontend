"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  GST_REPORT_NAV_ITEMS,
  buildGstReportFilterQuery,
  type GstReportFilters,
} from "@/lib/accounts/gst-report-filters";

export function GstReportNavTabs({ filters }: { filters: GstReportFilters }) {
  const pathname = usePathname();
  const qs = buildGstReportFilterQuery(filters);

  return (
    <div className="flex items-end gap-0 border-b border-border overflow-x-auto">
      {GST_REPORT_NAV_ITEMS.map((tab) => {
        const active =
          tab.id === "overview"
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        const href = qs ? `${tab.href}?${qs}` : tab.href;
        return (
          <Link
            key={tab.id}
            href={href}
            className={cn(
              "relative px-4 py-2 text-xs transition-colors whitespace-nowrap",
              "border-b-2 -mb-px",
              active
                ? "border-brand-600 bg-brand-50 text-brand-700 font-bold"
                : "border-transparent bg-white text-muted-foreground font-medium hover:text-foreground hover:bg-muted/30",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
