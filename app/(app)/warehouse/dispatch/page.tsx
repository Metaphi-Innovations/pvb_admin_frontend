"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { ListingContainer } from "@/components/layout/ListingContainer";
import { Truck, FileText, CheckCircle2, Clock, Package, RotateCcw, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { MiniKPICard } from "@/components/ui/KPICard";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { Button } from "@/components/ui/button";

import { DispatchRecord } from "./types";
import { getDispatchesByWarehouse } from "./services";
import { WAREHOUSE_OPTIONS } from "./constants";
import { DispatchListing } from "./DispatchListing";

export default function DispatchManagementPage() {
  const router = useRouter();

  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("All");
  const [rawDispatches, setRawDispatches] = useState<DispatchRecord[]>([]);

  const reload = useCallback(() => {
    setRawDispatches(getDispatchesByWarehouse(selectedWarehouse));
  }, [selectedWarehouse]);

  useEffect(() => {
    reload();
  }, [reload]);

  // KPIs
  const stats = useMemo(() => {
    const all = rawDispatches;
    return {
      total: all.length,
      pending: all.filter(d => d.deliveryStatus === "Pending Dispatch").length,
      inTransit: all.filter(d => d.deliveryStatus === "In Transit").length,
      delivered: all.filter(d => d.deliveryStatus === "Delivered").length,
      returned: all.filter(d => d.deliveryStatus === "Returned").length,
      cancelled: all.filter(d => d.deliveryStatus === "Cancelled").length,
    };
  }, [rawDispatches]);

  return (
    <ListingContainer
      title="Dispatch Management"
      titleIcon={Truck}
      metrics={
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <MiniKPICard label="Total Dispatches" value={stats.total} icon={Truck} accent={true} />
          <MiniKPICard label="Pending Dispatch" value={stats.pending} icon={Clock} accent={false} />
          <MiniKPICard label="In Transit" value={stats.inTransit} icon={Package} accent={false} />
          <MiniKPICard label="Delivered" value={stats.delivered} icon={CheckCircle2} accent={false} />
          <MiniKPICard label="Returned" value={stats.returned} icon={RotateCcw} accent={false} />
          <MiniKPICard label="Cancelled" value={stats.cancelled} icon={XCircle} accent={false} />
        </div>
      }
    >
      <DispatchListing 
        rawDispatches={rawDispatches} 
        selectedWarehouse={selectedWarehouse}
        setSelectedWarehouse={setSelectedWarehouse}
        reload={reload} 
      />
    </ListingContainer>
  );
}
