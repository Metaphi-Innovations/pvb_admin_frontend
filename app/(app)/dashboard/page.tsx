"use client";

/**
 * Operational Dashboard — redesign.
 * Overview + module tabs; Dashboard-only mock data.
 */

import React, { useCallback, useMemo, useState } from "react";
import { DashboardFilterProvider, useDashboardFilters } from "@/components/dashboard/DashboardFilterContext";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { OverviewDashboard } from "@/components/dashboard/OverviewDashboard";
import { SalesOperationsDashboard } from "@/components/dashboard/SalesOperationsDashboard";
import { ModuleOpsDashboard, SupportListPanel } from "@/components/dashboard/ModuleOpsDashboard";
import {
  DASHBOARD_TABS,
  ROLE_DEFAULT_TAB,
  ROLE_VISIBLE_TABS,
  type DashboardRole,
  type DashboardTabId,
} from "@/components/dashboard/mock-data";

function ModuleSupports({ tab }: { tab: Exclude<DashboardTabId, "overview" | "sales"> }) {
  const { data } = useDashboardFilters();
  const pending = data.pendingByModule.find((m) => m.id === tab)?.pending ?? 0;

  if (tab === "procurement") {
    return (
      <ModuleOpsDashboard
        moduleId="procurement"
        workspaceTitle="Purchase Workspace"
        supportLeft={
          <SupportListPanel
            title="Vendor Performance"
            subtitle="Operational counts — filters workspace via summary"
            rows={[
              { label: "Open POs — SeedCorp", value: 6, hint: "Awaiting receipt" },
              { label: "Delayed vendors", value: 3, hint: "Past promised date" },
              { label: "Partial receipts", value: 5, hint: "Need follow-up" },
            ]}
          />
        }
        supportRight={
          <SupportListPanel
            title="Pending Approvals"
            rows={[
              { label: "PO > threshold", value: 4 },
              { label: "Rate variance", value: 2 },
              { label: "New vendor PO", value: 1 },
            ]}
          />
        }
        fullWidth={
          <SupportListPanel
            title="Purchase Exceptions"
            subtitle="Attention only"
            rows={[
              { label: "Overdue deliveries", value: Math.max(1, Math.round(pending * 0.2)) },
              { label: "Quantity mismatch", value: 2 },
              { label: "Missing invoice link", value: 3 },
            ]}
          />
        }
      />
    );
  }

  if (tab === "warehouse") {
    return (
      <ModuleOpsDashboard
        moduleId="warehouse"
        workspaceTitle="Inventory Workspace"
        supportLeft={
          <SupportListPanel
            title="Low Stock"
            rows={[
              { label: "SKU below reorder", value: 12 },
              { label: "Zero stock SKUs", value: 3 },
            ]}
          />
        }
        supportRight={
          <SupportListPanel
            title="Near Expiry"
            rows={[
              { label: "Within 30 days", value: 7 },
              { label: "Within 60 days", value: 11 },
            ]}
          />
        }
        fullWidth={
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5">
            <SupportListPanel title="Pending GRN" rows={[{ label: "Open GRN", value: 14 }]} />
            <SupportListPanel title="Pending QC" rows={[{ label: "Lots waiting", value: 9 }]} />
            <SupportListPanel title="Pending Dispatch" rows={[{ label: "Packed ready", value: 17 }]} />
            <SupportListPanel title="Stock Transfers" rows={[{ label: "In transit", value: 6 }]} />
          </div>
        }
      />
    );
  }

  if (tab === "returns") {
    return (
      <ModuleOpsDashboard
        moduleId="returns"
        workspaceTitle="Returns Workspace"
        supportLeft={
          <SupportListPanel
            title="Sales Return"
            rows={[
              { label: "Pending approval", value: 5 },
              { label: "CN pending", value: 4 },
            ]}
          />
        }
        supportRight={
          <SupportListPanel
            title="Purchase Return"
            rows={[
              { label: "Pending approval", value: 2 },
              { label: "DN pending", value: 3 },
            ]}
          />
        }
        fullWidth={
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5">
            <SupportListPanel title="Pending Credit Notes" rows={[{ label: "Open CN", value: 5 }]} />
            <SupportListPanel title="Pending Debit Notes" rows={[{ label: "Open DN", value: 3 }]} />
          </div>
        }
      />
    );
  }

  if (tab === "accounts") {
    return (
      <ModuleOpsDashboard
        moduleId="accounts"
        workspaceTitle="Transaction Workspace"
        supportLeft={
          <SupportListPanel
            title="Receivable Summary"
            rows={[
              { label: "Outstanding", value: "₹2.4Cr" },
              { label: "Overdue invoices", value: 14 },
            ]}
          />
        }
        supportRight={
          <SupportListPanel
            title="Payable Summary"
            rows={[
              { label: "Outstanding", value: "₹1.1Cr" },
              { label: "Due this week", value: 8 },
            ]}
          />
        }
        fullWidth={
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5">
            <SupportListPanel title="GST Pending" rows={[{ label: "Returns / docs pending", value: 6 }]} />
            <SupportListPanel title="Bank Reconciliation Pending" rows={[{ label: "Unmatched lines", value: 4 }]} />
          </div>
        }
      />
    );
  }

  // banking
  return (
    <ModuleOpsDashboard
      moduleId="banking"
      workspaceTitle="Bank Transactions"
      supportLeft={
        <SupportListPanel
          title="Pending Reconciliation"
          rows={[
            { label: "Unreconciled entries", value: 8 },
            { label: "Statement lines open", value: 12 },
          ]}
        />
      }
      supportRight={
        <SupportListPanel
          title="Cheque Management"
          rows={[
            { label: "Issued — uncleared", value: 5 },
            { label: "Received — pending deposit", value: 3 },
          ]}
        />
      }
      fullWidth={
        <SupportListPanel
          title="Cash Position"
          rows={[
            { label: "Cash counter", value: "₹12.5L" },
            { label: "Petty cash", value: "₹85,000" },
          ]}
        />
      }
    />
  );
}

function DashboardPageInner() {
  const [role, setRole] = useState<DashboardRole>("admin");
  const [tab, setTab] = useState<DashboardTabId>("overview");

  const visibleTabs = useMemo(
    () => DASHBOARD_TABS.filter((t) => ROLE_VISIBLE_TABS[role].includes(t.id)),
    [role],
  );

  const handleRoleChange = useCallback((next: DashboardRole) => {
    setRole(next);
    setTab(ROLE_DEFAULT_TAB[next]);
  }, []);

  const handleTabChange = useCallback(
    (next: DashboardTabId) => {
      if (ROLE_VISIBLE_TABS[role].includes(next)) setTab(next);
    },
    [role],
  );

  const tabLabel = DASHBOARD_TABS.find((t) => t.id === tab)?.label ?? "Module";

  return (
    <DashboardShell
      tabs={visibleTabs}
      activeTab={tab}
      onTabChange={handleTabChange}
      role={role}
      onRoleChange={handleRoleChange}
      description={
        tab === "overview"
          ? "Cross-module operational visibility — what needs attention?"
          : `${tabLabel} operational workspace`
      }
    >
      {tab === "overview" && <OverviewDashboard onOpenTab={handleTabChange} />}
      {tab === "sales" && <SalesOperationsDashboard />}
      {tab !== "overview" && tab !== "sales" && <ModuleSupports tab={tab} />}
    </DashboardShell>
  );
}

export default function DashboardPage() {
  return (
    <DashboardFilterProvider>
      <DashboardPageInner />
    </DashboardFilterProvider>
  );
}
