"use client";

import React from "react";
import { AppLayout, PageShell } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { DashboardFilterBar } from "@/components/dashboard/DashboardFilters";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { useDashboardFilters } from "@/components/dashboard/DashboardFilterContext";
import {
  DASHBOARD_ROLES,
  type DashboardRole,
  type DashboardTabId,
} from "@/components/dashboard/mock-data";

interface DashboardShellProps {
  tabs: { id: DashboardTabId; label: string }[];
  activeTab: DashboardTabId;
  onTabChange: (id: DashboardTabId) => void;
  role: DashboardRole;
  onRoleChange: (role: DashboardRole) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
}

export function DashboardShell({
  tabs,
  activeTab,
  onTabChange,
  role,
  onRoleChange,
  title = "Dashboard",
  description = "Operational command center — what needs attention next?",
  children,
}: DashboardShellProps) {
  const { filters, setFilters, data, refreshing, refresh } = useDashboardFilters();

  return (
    <AppLayout>
      <PageShell className="space-y-3 max-w-[1440px] mx-auto w-full">
        <PageHeader
          title={title}
          description={description}
          breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Dashboard" }]}
          className="mb-0"
          compact
          actions={
            <label className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">Role</span>
              <select
                value={role}
                onChange={(e) => onRoleChange(e.target.value as DashboardRole)}
                className="h-8 px-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400"
              >
                {DASHBOARD_ROLES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
          }
        />

        <DashboardFilterBar
          options={data.filterOptions}
          value={filters}
          onChange={setFilters}
          onRefresh={refresh}
          refreshing={refreshing}
        />

        <DashboardTabs tabs={tabs} active={activeTab} onChange={onTabChange} />

        <div className="space-y-3">{children}</div>
      </PageShell>
    </AppLayout>
  );
}
