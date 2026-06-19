"use client";

import {
  CheckCircle2,
  Clock,
  FileCheck2,
  FileText,
  IndianRupee,
  ShoppingCart,
  Truck,
  XCircle,
} from "lucide-react";
import {
  type PRListingKpis,
  type POListingKpis,
  formatPoValueKpi,
} from "@/lib/procurement/listing-kpis";
import { ProcCompactKpi, ProcCompactKpiGrid } from "../analytics/ProcCompactKpi";

export function PRListingKpiRow({ kpis }: { kpis: PRListingKpis }) {
  return (
    <ProcCompactKpiGrid cols={5}>
      <ProcCompactKpi label="Total PR" value={kpis.total} icon={FileText} accent="brand" />
      <ProcCompactKpi label="Pending Approval" value={kpis.pendingApproval} icon={Clock} accent="amber" />
      <ProcCompactKpi label="Approved" value={kpis.approved} icon={CheckCircle2} accent="green" />
      <ProcCompactKpi label="Rejected" value={kpis.rejected} icon={XCircle} accent="red" />
      <ProcCompactKpi label="Closed" value={kpis.closed} icon={FileCheck2} accent="slate" />
    </ProcCompactKpiGrid>
  );
}

export function POListingKpiRow({ kpis }: { kpis: POListingKpis }) {
  return (
    <ProcCompactKpiGrid cols={6}>
      <ProcCompactKpi label="Total PO" value={kpis.total} icon={FileText} accent="brand" />
      <ProcCompactKpi label="Open PO" value={kpis.openPo} icon={ShoppingCart} accent="navy" />
      <ProcCompactKpi label="Partial Receipt" value={kpis.partialReceived} icon={Truck} accent="amber" />
      <ProcCompactKpi label="Fully Received" value={kpis.fullyReceived} icon={CheckCircle2} accent="blue" />
      <ProcCompactKpi label="Closed" value={kpis.closedPo} icon={FileCheck2} accent="green" />
      <ProcCompactKpi
        label="Total PO Value"
        value={formatPoValueKpi(kpis.totalPoValue)}
        icon={IndianRupee}
        accent="purple"
      />
    </ProcCompactKpiGrid>
  );
}
