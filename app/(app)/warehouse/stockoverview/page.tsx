"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ListingContainer } from "@/components/layout/ListingContainer";
import { Boxes, CalendarDays, CheckCircle2, XCircle, Clock, ShieldAlert } from "lucide-react";
import { MiniKPICard } from "@/components/ui/KPICard";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { QcPassedStockRecord, RejectedStockRecord, GrnPendingStockRecord } from "./types";
import { getQcPassedStockList, getRejectedStockList, getGrnPendingStockList } from "./services";
import { WAREHOUSE_OPTIONS } from "./constants";

import { QcPassedListing } from "./qc-passed/QcPassedListing";
import { RejectedListing } from "./rejected/RejectedListing";
import { GrnPendingListing } from "./grn-pending/GrnPendingListing";

export default function StockOverviewPage() {
  // Tabs state
  const [activeTab, setActiveTab] = useState("qc-passed");
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("All");

  // Raw mock lists
  const [rawQcPassed, setRawQcPassed] = useState<QcPassedStockRecord[]>([]);
  const [rawRejected, setRawRejected] = useState<RejectedStockRecord[]>([]);
  const [rawGrnPending, setRawGrnPending] = useState<GrnPendingStockRecord[]>([]);

  // Load stock lists
  useEffect(() => {
    setRawQcPassed(getQcPassedStockList());
    setRawRejected(getRejectedStockList());
    setRawGrnPending(getGrnPendingStockList());
  }, []);

  // Filter lists based on the selected warehouse dropdown at the top
  const qcPassedForWarehouse = useMemo(() => {
    if (selectedWarehouse === "All") return rawQcPassed;
    return rawQcPassed.filter(item => item.warehouse === selectedWarehouse);
  }, [rawQcPassed, selectedWarehouse]);

  const rejectedForWarehouse = useMemo(() => {
    if (selectedWarehouse === "All") return rawRejected;
    return rawRejected.filter(item => item.warehouse === selectedWarehouse);
  }, [rawRejected, selectedWarehouse]);

  const grnPendingForWarehouse = useMemo(() => {
    if (selectedWarehouse === "All") return rawGrnPending;
    return rawGrnPending.filter(item => item.warehouse === selectedWarehouse);
  }, [rawGrnPending, selectedWarehouse]);

  // Dynamic KPI calculations based on selected warehouse
  const stats = useMemo(() => {
    const totalStock = qcPassedForWarehouse.reduce((acc, curr) => acc + curr.availableQuantity + curr.reservedQuantity, 0);
    const qcPassedQty = qcPassedForWarehouse.reduce((acc, curr) => acc + curr.availableQuantity, 0);
    const rejectedQty = rejectedForWarehouse.reduce((acc, curr) => acc + curr.rejectedQuantity, 0);
    const grnPendingQty = grnPendingForWarehouse.reduce((acc, curr) => acc + curr.receivedQuantity, 0);
    const nearExpiry = qcPassedForWarehouse.filter(r => r.status === "Near Expiry").length;
    const expired = qcPassedForWarehouse.filter(r => r.status === "Expired").length;

    return {
      totalStock,
      qcPassedQty,
      rejectedQty,
      grnPendingQty,
      nearExpiry,
      expired,
    };
  }, [qcPassedForWarehouse, rejectedForWarehouse, grnPendingForWarehouse]);

  return (
    <ListingContainer
      title="Stock Overview Dashboard"
      titleIcon={Boxes}
      metrics={
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <MiniKPICard label="Total Stock" value={stats.totalStock} icon={Boxes} accent={true} />
          <MiniKPICard label="QC Passed Stock" value={stats.qcPassedQty} icon={CheckCircle2} accent={false} />
          <MiniKPICard label="Rejected Stock" value={stats.rejectedQty} icon={XCircle} accent={false} />
          <MiniKPICard label="GRN Pending Stock" value={stats.grnPendingQty} icon={Clock} accent={false} />
          <MiniKPICard label="Near Expiry" value={stats.nearExpiry} icon={CalendarDays} accent={false} />
          <MiniKPICard label="Expired Stock" value={stats.expired} icon={ShieldAlert} accent={false} />
        </div>
      }
    >
      {/* Tabs Container */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
          <TabsList className="bg-muted/50 p-0.5 border border-border/60 rounded-xl inline-flex">
            <TabsTrigger
              value="qc-passed"
              className="text-xs font-semibold px-4 py-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-brand-700"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              QC Passed Stock
            </TabsTrigger>
            <TabsTrigger
              value="rejected"
              className="text-xs font-semibold px-4 py-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-brand-700"
            >
              <XCircle className="w-3.5 h-3.5 mr-1.5" />
              Rejected Stock
            </TabsTrigger>
            <TabsTrigger
              value="grn-pending"
              className="text-xs font-semibold px-4 py-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-brand-700"
            >
              <Clock className="w-3.5 h-3.5 mr-1.5" />
              GRN Pending Stock
            </TabsTrigger>
          </TabsList>

          {/* Warehouse Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Warehouse:</span>
            <AutocompleteSelect
              options={[
                { value: "All", label: "All Warehouses" },
                ...WAREHOUSE_OPTIONS
              ]}
              value={selectedWarehouse}
              onChange={setSelectedWarehouse}
              placeholder="All Warehouses"
              searchPlaceholder="Search warehouse..."
              className="h-9 w-[200px] text-xs py-1.5 px-3 rounded-lg border-border focus:ring-1 focus:ring-brand-500 bg-white shadow-none focus:outline-none"
            />
          </div>
        </div>

        {/* TAB 1: QC Passed Stock */}
        <TabsContent value="qc-passed" className="mt-0 outline-none">
          <QcPassedListing qcPassedForWarehouse={qcPassedForWarehouse} />
        </TabsContent>

        {/* TAB 2: Rejected Stock */}
        <TabsContent value="rejected" className="mt-0 outline-none">
          <RejectedListing rejectedForWarehouse={rejectedForWarehouse} />
        </TabsContent>

        {/* TAB 3: GRN Pending Stock */}
        <TabsContent value="grn-pending" className="mt-0 outline-none">
          <GrnPendingListing grnPendingForWarehouse={grnPendingForWarehouse} />
        </TabsContent>
      </Tabs>
    </ListingContainer>
  );
}
