"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { DashPanel } from "@/components/dashboard/DashPrimitives";
import { ModuleSummaryStrip } from "@/components/dashboard/DashboardShared";
import { useDashboardFilters } from "@/components/dashboard/DashboardFilterContext";
import type { DashboardTabId } from "@/components/dashboard/mock-data";

export function OverviewDashboard({ onOpenTab }: { onOpenTab: (tab: DashboardTabId) => void }) {
  const { data } = useDashboardFilters();

  return (
    <div className="space-y-3">
      <DashPanel title="Operational Summary" subtitle="Cross-module attention counts" bodyClassName="p-2.5">
        <ModuleSummaryStrip
          items={data.overviewSummary.map((k) => ({
            id: k.id,
            label: k.label,
            value: k.value,
            accent: k.accent,
            filterKey: k.targetTab,
          }))}
          onSelect={(tab) => onOpenTab(tab as DashboardTabId)}
        />
      </DashPanel>

      <DashPanel title="Pending Work by Module" subtitle="Click a module to open its dashboard" bodyClassName="p-2.5">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
          {data.pendingByModule.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onOpenTab(m.id)}
              className="rounded-xl border border-border bg-white p-3 text-left hover:bg-muted/30 transition-colors shadow-sm"
            >
              <p className="text-xs font-semibold text-navy-700">{m.title}</p>
              <p className="text-xl font-bold tabular-nums text-foreground mt-1">{m.pending}</p>
              <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{m.hint}</p>
            </button>
          ))}
        </div>
      </DashPanel>

      <DashPanel title="Critical Exceptions" subtitle="Only items that need intervention" bodyClassName="p-0">
        <div className="overflow-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="px-3 py-2 text-left text-xs font-semibold">Exception</th>
                <th className="px-3 py-2 text-right text-xs font-semibold">Count</th>
                <th className="px-3 py-2 text-left text-xs font-semibold">Severity</th>
                <th className="px-3 py-2 text-left text-xs font-semibold">Hint</th>
              </tr>
            </thead>
            <tbody>
              {data.criticalExceptions.map((ex) => (
                <tr
                  key={ex.id}
                  onClick={() => onOpenTab(ex.targetTab)}
                  className="border-b border-border/60 cursor-pointer hover:bg-muted/20"
                >
                  <td className="px-3 py-2 text-xs font-semibold text-brand-700">{ex.label}</td>
                  <td className="px-3 py-2 text-xs text-right font-bold tabular-nums">{ex.count}</td>
                  <td className="px-3 py-2 text-xs">
                    <span
                      className={cn(
                        "inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold border",
                        ex.severity === "critical"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : ex.severity === "warning"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-sky-50 text-sky-700 border-sky-200",
                      )}
                    >
                      {ex.severity}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{ex.hint}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashPanel>
    </div>
  );
}
