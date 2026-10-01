"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Settings,
  CheckCircle2,
  CircleDashed,
  ArrowRight,
  Building2,
  Clock,
  Lightbulb,
  PanelLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HrPageShell } from "../components/HrPageShell";
import { hrBreadcrumb } from "@/lib/hr/hr-nav";
import {
  SETTINGS_GROUPS,
  getSettingsProgress,
} from "./_components/settings-catalog";
import {
  getSettingsFocusArea,
  getSettingsOverviewRecommendations,
  type OverviewRecommendation,
} from "./_components/settings-overview-completeness";

const RECENT_PLACEHOLDERS = [
  {
    label: "Complete HR Settings frozen",
    meta: "All 10 core sections CLOSED · Planned items excluded from core %",
  },
  {
    label: "Organization Setup frozen",
    meta: "Company · Branches · Departments · Designations · Types · Statuses",
  },
  {
    label: "Reimbursement Settings frozen",
    meta: "Travel Policy core · Expense Categories future",
  },
];

export default function SettingsLandingClient() {
  const progress = useMemo(() => getSettingsProgress(), []);
  const [recommendations, setRecommendations] = useState<OverviewRecommendation[]>([]);
  const [focusArea, setFocusArea] = useState("Organization Setup");

  useEffect(() => {
    setRecommendations(getSettingsOverviewRecommendations(3));
    setFocusArea(getSettingsFocusArea());
  }, []);

  const corePct =
    progress.coreTotalCount === 0
      ? 100
      : Math.round((progress.coreReadyCount / progress.coreTotalCount) * 100);

  return (
    <HrPageShell
      breadcrumbs={hrBreadcrumb({ label: "Settings" }, { label: "Overview" })}
      title="Settings Overview"
      description="Configure HR masters from the left sidebar. Core foundation readiness is separate from future/planned work."
      icon={Settings}
      badge={
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-full">
          Core {progress.coreReadyCount}/{progress.coreTotalCount} ready
        </span>
      }
    >
      <div className="space-y-3 max-w-[960px]">
        <div className="flex items-start gap-2 rounded-[12px] border border-border bg-white px-3 py-2.5 shadow-sm">
          <div className="w-7 h-7 rounded-md bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
            <PanelLeft className="w-3.5 h-3.5 text-brand-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-foreground">Use the Settings sidebar to navigate</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
              Open live configuration pages from the left rail. Future/planned items are kept out of the sidebar
              until implemented so core readiness stays accurate.
            </p>
          </div>
        </div>

        <section className="rounded-[12px] border border-border bg-white shadow-sm p-3">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-2.5">
            <div>
              <h2 className="text-sm font-bold text-foreground">Core Settings progress</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Implemented screens only — future work does not reduce this score
              </p>
            </div>
            <p className="text-sm font-bold text-brand-700 tabular-nums">{corePct}%</p>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-brand-600 transition-all"
              style={{ width: `${corePct}%` }}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-3">
            <div className="rounded-[10px] border border-border bg-muted/20 px-2.5 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Core Settings</p>
              <p className="text-base font-bold text-foreground tabular-nums mt-0.5">
                {progress.coreReadyCount} / {progress.coreTotalCount} Ready
              </p>
            </div>
            <div className="rounded-[10px] border border-border bg-muted/20 px-2.5 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Future / Planned</p>
              <p className="text-base font-bold text-foreground tabular-nums mt-0.5">
                {progress.futureCount} Planned
              </p>
            </div>
            <div className="rounded-[10px] border border-border bg-muted/20 px-2.5 py-2 col-span-2 sm:col-span-1">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Focus area</p>
              <p className="text-[13px] font-semibold text-foreground mt-0.5">{focusArea}</p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          <section className="lg:col-span-3 rounded-[12px] border border-border bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/20">
              <h2 className="text-sm font-bold text-foreground">Category status</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Core screens per category — open pages from the sidebar
              </p>
            </div>
            <ul className="divide-y divide-border">
                  {SETTINGS_GROUPS.map((group) => {
                const core = group.items.filter((i) => i.status === "available");
                const future = group.items.filter((i) => i.status === "coming_soon").length;
                const ready = core.length;
                const total = core.length;
                const live = ready > 0;
                const frozen =
                  group.id === "organization" ||
                  group.id === "onboarding" ||
                  group.id === "attendance" ||
                  group.id === "leave" ||
                  group.id === "payroll" ||
                  group.id === "statutory" ||
                  group.id === "tax" ||
                  group.id === "letters" ||
                  group.id === "notifications" ||
                  group.id === "reimbursement";
                const firstHref = core.find((i) => i.href)?.href;
                const Icon = group.icon;
                return (
                  <li
                    key={group.id}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/15 transition-colors"
                  >
                    <div
                      className={cn(
                        "w-7 h-7 rounded-md flex items-center justify-center shrink-0 border",
                        live ? "bg-brand-50 border-brand-100" : "bg-muted/40 border-border",
                      )}
                    >
                      <Icon
                        className={cn("w-3.5 h-3.5", live ? "text-brand-600" : "text-muted-foreground")}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-foreground truncate">{group.label}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{group.description}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {frozen && live ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          CLOSED {ready}/{total}
                        </span>
                      ) : live ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          {ready}/{total}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground bg-muted border border-border px-1.5 py-0.5 rounded-full">
                          <CircleDashed className="w-3 h-3" />
                          Soon
                        </span>
                      )}
                      {future > 0 && (
                        <span className="text-[10px] text-muted-foreground tabular-nums">{future} planned</span>
                      )}
                      {firstHref && (
                        <Link
                          href={firstHref}
                          className="text-[11px] font-medium text-brand-700 hover:underline inline-flex items-center gap-0.5"
                        >
                          Open
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <div className="lg:col-span-2 space-y-4">
            <section className="rounded-[12px] border border-border bg-white shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center gap-2">
                <Lightbulb className="w-3.5 h-3.5 text-brand-600" />
                <h2 className="text-sm font-bold text-foreground">Recommended next</h2>
              </div>
              {recommendations.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-[13px] font-semibold text-foreground">No open configuration gaps</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Seeded masters look complete. Review sidebar pages as needed.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {recommendations.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="flex items-start gap-2.5 px-4 py-3 hover:bg-brand-50/40 transition-colors group"
                      >
                        <Building2 className="w-3.5 h-3.5 text-brand-600 mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-foreground group-hover:text-brand-700">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                            {item.description}
                          </p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-brand-500 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-[12px] border border-border bg-white shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <h2 className="text-sm font-bold text-foreground">Recent activity</h2>
              </div>
              <ul className="divide-y divide-border">
                {RECENT_PLACEHOLDERS.map((row) => (
                  <li key={row.label} className="px-4 py-2.5">
                    <p className="text-[12px] font-medium text-foreground">{row.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{row.meta}</p>
                  </li>
                ))}
              </ul>
              <div className="px-4 py-2 border-t border-border bg-muted/10">
                <p className="text-[10px] text-muted-foreground">
                  Activity feed will connect to audit APIs later.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </HrPageShell>
  );
}
