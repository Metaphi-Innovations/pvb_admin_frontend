"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  Settings,
  CheckCircle2,
  ArrowRight,
  Building2,
  Lightbulb,
  PanelLeft,
  Database,
} from "lucide-react";
import { HrPageShell } from "../components/HrPageShell";
import { hrBreadcrumb } from "@/lib/hr/hr-nav";
import {
  getVisibleSettingsGroups,
  getSettingsProgress,
} from "./_components/settings-catalog";
import {
  DEMO_WORKSPACE_HREF,
  isHrDemoWorkspaceEnabled,
} from "@/app/(app)/hr/demo/demo-workspace-constants";

const RECOMMENDED = [
  {
    title: "Complete Company Profile",
    description: "Legal name, GST, PAN, and address used on HR letters.",
    href: "/hr/settings/organization/company",
  },
  {
    title: "Review Branches",
    description: "Confirm head office and work locations before hiring.",
    href: "/hr/settings/organization/branches",
  },
  {
    title: "Set up Departments",
    description: "Define org structure used across employee records.",
    href: "/hr/settings/organization/departments",
  },
];

export default function SettingsLandingClient() {
  const progress = useMemo(() => getSettingsProgress(), []);
  const groups = useMemo(() => getVisibleSettingsGroups(), []);
  const demoEnabled = isHrDemoWorkspaceEnabled();
  const pct =
    progress.totalCount > 0
      ? Math.round((progress.availableCount / progress.totalCount) * 100)
      : 0;

  return (
    <HrPageShell
      breadcrumbs={hrBreadcrumb({ label: "Settings" }, { label: "Overview" })}
      title="Settings Overview"
      description="Configure organization, attendance, leave, payroll, and other HR masters from the left sidebar."
      icon={Settings}
      badge={
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-full">
          {progress.availableCount} areas configured
        </span>
      }
    >
      <div className="space-y-3 max-w-[960px]">
        {demoEnabled && (
          <Link
            href={DEMO_WORKSPACE_HREF}
            className="flex items-start gap-3 rounded-[12px] border border-brand-200 bg-brand-50/70 px-3 py-3 shadow-sm hover:bg-brand-50 transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
              <Database className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-brand-800">Demo Workspace</p>
              <p className="text-[11px] text-brand-800/80 mt-0.5 leading-snug">
                Seed 50 synthetic employees, attendance, leave, payroll, travel, claims, letters, and
                offboarding for client demos. Manual confirm required — does not overwrite Settings.
              </p>
              <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-brand-700 mt-1.5">
                Open Demo Workspace
                <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </Link>
        )}

        <div className="flex items-start gap-2 rounded-[12px] border border-border bg-white px-3 py-2.5 shadow-sm">
          <div className="w-7 h-7 rounded-md bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
            <PanelLeft className="w-3.5 h-3.5 text-brand-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-foreground">Use the Settings sidebar to navigate</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
              Open Company Profile, Branches, Departments, Attendance, Leave, Payroll, and Travel Policy from the left rail.
              {demoEnabled ? " Demo Workspace is listed under Tools near the top of the sidebar." : ""}
            </p>
          </div>
        </div>

        <section className="rounded-[12px] border border-border bg-white shadow-sm p-3">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-2.5">
            <div>
              <h2 className="text-sm font-bold text-foreground">Configuration coverage</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {progress.categoriesReady} of {progress.categoriesTotal} categories available
              </p>
            </div>
            <p className="text-sm font-bold text-brand-700 tabular-nums">{pct}%</p>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-brand-600 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5 mt-3">
            <div className="rounded-[10px] border border-border bg-muted/20 px-2.5 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Available</p>
              <p className="text-base font-bold text-foreground tabular-nums mt-0.5">{progress.availableCount}</p>
            </div>
            <div className="rounded-[10px] border border-border bg-muted/20 px-2.5 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Focus area</p>
              <p className="text-[13px] font-semibold text-foreground mt-0.5">Organization Setup</p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          <section className="lg:col-span-3 rounded-[12px] border border-border bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/20">
              <h2 className="text-sm font-bold text-foreground">Settings categories</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Summary only — open pages from the sidebar
              </p>
            </div>
            <ul className="divide-y divide-border">
              {groups.map((group) => {
                const ready = group.items.filter((i) => i.status === "available").length;
                const total = group.items.length;
                const firstHref = group.items.find((i) => i.status === "available" && i.href)?.href;
                const Icon = group.icon;
                return (
                  <li
                    key={group.id}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/15 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 border bg-brand-50 border-brand-100">
                      <Icon className="w-3.5 h-3.5 text-brand-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-foreground truncate">{group.label}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{group.description}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                        {ready}/{total}
                      </span>
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
              <ul className="divide-y divide-border">
                {RECOMMENDED.map((item) => (
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
            </section>
          </div>
        </div>
      </div>
    </HrPageShell>
  );
}
