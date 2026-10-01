"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { DashboardTabId } from "@/components/dashboard/mock-data";

interface DashboardTabsProps {
  tabs: { id: DashboardTabId; label: string }[];
  active: DashboardTabId;
  onChange: (id: DashboardTabId) => void;
}

/** Compact pill tabs — same density as ERP listing status pills */
export function DashboardTabs({ tabs, active, onChange }: DashboardTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Dashboard views"
      className="flex items-center gap-1 overflow-x-auto rounded-xl border border-border bg-white shadow-sm p-1"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              "h-7 px-3 text-xs font-medium rounded-lg whitespace-nowrap transition-colors",
              isActive
                ? "bg-brand-600 text-white"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
