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
import { SalesStyleKpiCard, SalesStyleKpiGrid } from "./SalesStyleKpiRow";

export function PRListingKpiRow({ kpis }: { kpis: PRListingKpis }) {
  return (
    <SalesStyleKpiGrid cols={5}>
      <SalesStyleKpiCard label="Total PR" value={kpis.total} icon={FileText} accent />
      <SalesStyleKpiCard label="Pending Approval" value={kpis.pendingApproval} icon={Clock} />
      <SalesStyleKpiCard label="Approved" value={kpis.approved} icon={CheckCircle2} />
      <SalesStyleKpiCard label="Rejected" value={kpis.rejected} icon={XCircle} />
      <SalesStyleKpiCard label="Closed" value={kpis.closed} icon={FileCheck2} />
    </SalesStyleKpiGrid>
  );
}

export function POListingKpiRow({ kpis }: { kpis: POListingKpis }) {
  return (
    <SalesStyleKpiGrid cols={6}>
      <SalesStyleKpiCard label="Total PO" value={kpis.total} icon={FileText} accent />
      <SalesStyleKpiCard label="Open PO" value={kpis.openPo} icon={ShoppingCart} />
      <SalesStyleKpiCard label="Partial Receipt" value={kpis.partialReceived} icon={Truck} />
      <SalesStyleKpiCard label="Fully Received" value={kpis.fullyReceived} icon={CheckCircle2} />
      <SalesStyleKpiCard label="Closed" value={kpis.closedPo} icon={FileCheck2} />
      <SalesStyleKpiCard
        label="Total PO Value"
        value={formatPoValueKpi(kpis.totalPoValue)}
        icon={IndianRupee}
      />
    </SalesStyleKpiGrid>
  );
}
