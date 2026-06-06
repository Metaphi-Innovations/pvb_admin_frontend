"use client";

import { CheckCircle2, Clock, FileCheck2, FileText, Scissors, Upload } from "lucide-react";
import type { POAnalytics } from "../../analytics/po-analytics";
import { ProcCompactKpi, ProcCompactKpiGrid } from "./ProcCompactKpi";

export function POAnalyticsDashboard({ analytics }: { analytics: POAnalytics }) {
  const { kpis } = analytics;

  return (
    <div className="mb-4">
      <ProcCompactKpiGrid cols={6}>
        <ProcCompactKpi label="Total PO" value={kpis.total} icon={FileText} accent="brand" />
        <ProcCompactKpi label="Pending Approval" value={kpis.pendingApproval} icon={Clock} accent="amber" />
        <ProcCompactKpi label="Approved PO" value={kpis.approved} icon={CheckCircle2} accent="blue" />
        <ProcCompactKpi label="Invoice Uploaded" value={kpis.invoiceUploaded} icon={Upload} accent="green" />
        <ProcCompactKpi label="Short Closed" value={kpis.shortClosed} icon={Scissors} accent="purple" />
        <ProcCompactKpi label="Closed PO" value={kpis.closed} icon={FileCheck2} accent="navy" />
      </ProcCompactKpiGrid>
    </div>
  );
}
