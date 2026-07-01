import React from "react";
import { Clock, CheckCircle2, ClipboardCheck } from "lucide-react";
import type { QcListingKpis } from "../qc-listing-kpis";
import { MiniKPICard } from "@/components/ui/KPICard";

export function QcListingKpiRow({ kpis }: { kpis: QcListingKpis }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <MiniKPICard label="Pending QC" value={kpis.pendingQc} icon={Clock} accent />
      <MiniKPICard label="QC Completed" value={kpis.qcCompleted} icon={CheckCircle2} />
      <MiniKPICard label="Total QC" value={kpis.totalQc} icon={ClipboardCheck} />
    </div>
  );
}
