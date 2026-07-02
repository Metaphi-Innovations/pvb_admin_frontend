"use client";

import { CheckCircle2, Clock, ClipboardList, Package } from "lucide-react";
import type { GrnListingKpis } from "../grn-listing-kpis";
import { MiniKPICard } from "@/components/ui/KPICard";

export function GrnListingKpiRow({ kpis }: { kpis: GrnListingKpis }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <MiniKPICard label="Pending QC" value={kpis.pendingQc} icon={Clock} accent />
      <MiniKPICard label="QC In Progress" value={kpis.qcInProgress} icon={ClipboardList} />
      <MiniKPICard label="QC Completed" value={kpis.qcCompleted} icon={CheckCircle2} />
      <MiniKPICard label="Total GRNs" value={kpis.totalGrns} icon={Package} />
    </div>
  );
}
