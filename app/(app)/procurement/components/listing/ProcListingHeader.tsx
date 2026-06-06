"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProcListingHeader({
  breadcrumbs,
  title,
  action,
  tabs,
  activeTab,
  onTabChange,
  tabCounts,
}: {
  breadcrumbs: { label: string; href?: string }[];
  title: string;
  action?: React.ReactNode;
  tabs: { id: string; label: string }[];
  activeTab: string;
  onTabChange: (id: string) => void;
  tabCounts?: Record<string, number>;
}) {
  return (
    <div className="bg-white border-b border-[#DDE3EF] shadow-sm">
      <div className="max-w-[1680px] mx-auto px-6 pt-4 pb-0">
        <nav className="flex items-center gap-1 text-[11px] text-[#6B80A0] mb-2">
          {breadcrumbs.map((b, i) => (
            <React.Fragment key={b.label}>
              {i > 0 && <ChevronRight className="w-3 h-3" />}
              {b.href ? (
                <Link href={b.href} className="hover:text-brand-600">
                  {b.label}
                </Link>
              ) : (
                <span className="text-[#3D5473] font-medium">{b.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
        <div className="flex items-center justify-between gap-4 pb-3">
          <h1 className="text-xl font-bold text-[#0A1628] tracking-tight">{title}</h1>
          {action}
        </div>
        <div className="flex items-center gap-0 overflow-x-auto">
          {tabs.map((t) => {
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onTabChange(t.id)}
                className={cn(
                  "px-4 py-2.5 text-[13px] whitespace-nowrap border-b-[2.5px] -mb-px transition-colors",
                  active
                    ? "border-brand-600 text-brand-700 font-bold"
                    : "border-transparent text-[#6B80A0] font-medium hover:text-[#3D5473]",
                )}
              >
                {t.label}
                {tabCounts?.[t.id] != null && (
                  <span
                    className={cn(
                      "ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums",
                      active ? "bg-brand-50 text-brand-700" : "bg-[#F1F5F9] text-[#6B80A0]",
                    )}
                  >
                    {tabCounts[t.id]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
