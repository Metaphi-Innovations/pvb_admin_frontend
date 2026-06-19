"use client";

import { CheckCircle2, Clock, Truck } from "lucide-react";
import type { GrnListingKpis } from "./grn-listing-kpis";
import {
  ProcCompactKpi,
  ProcCompactKpiGrid,
} from "@/app/(app)/procurement/components/analytics/ProcCompactKpi";

export function GrnListingKpiRow({ kpis }: { kpis: GrnListingKpis }) {
  return (
    <ProcCompactKpiGrid>
      <ProcCompactKpi label="Pending Receipt" value={kpis.pendingReceipt} icon={Clock} accent="amber" />
      <ProcCompactKpi label="Partial Receipt" value={kpis.partialReceipt} icon={Truck} accent="blue" />
      <ProcCompactKpi label="Completed Receipt" value={kpis.completedReceipt} icon={CheckCircle2} accent="green" />
    </ProcCompactKpiGrid>
  );
}
