"use client";

import { CheckCircle2, Clock, FileText, ShoppingCart, XCircle } from "lucide-react";
import type { PRAnalytics } from "../../analytics/pr-analytics";
import { ProcCompactKpi, ProcCompactKpiGrid } from "./ProcCompactKpi";

export function PRAnalyticsDashboard({ analytics }: { analytics: PRAnalytics }) {
  const { kpis } = analytics;

  return (
    <div className="mb-4">
      <ProcCompactKpiGrid>
        <ProcCompactKpi label="Total PR" value={kpis.total} icon={FileText} accent="brand" />
        <ProcCompactKpi label="Pending Approval" value={kpis.pendingApproval} icon={Clock} accent="amber" />
        <ProcCompactKpi label="Approved PR" value={kpis.approved} icon={CheckCircle2} accent="green" />
        <ProcCompactKpi label="Rejected PR" value={kpis.rejected} icon={XCircle} accent="red" />
        <ProcCompactKpi label="PO Created" value={kpis.poCreated} icon={ShoppingCart} accent="navy" />
      </ProcCompactKpiGrid>
    </div>
  );
}
