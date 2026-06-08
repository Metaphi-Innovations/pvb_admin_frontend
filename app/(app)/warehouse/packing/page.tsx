"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ListingContainer } from "@/components/layout/ListingContainer";
import { Boxes, Package, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { MiniKPICard } from "@/components/ui/KPICard";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { SalesOrderRecord, PackingRecord } from "./types";
import { getSalesOrders, getPackingRecordsList } from "./services";
import { WAREHOUSE_OPTIONS } from "./constants";

import { ReadyPackingListing } from "./ready/ReadyPackingListing";
import { DonePackingListing } from "./done/DonePackingListing";

export default function PackingManagementPage() {
  // Tab State & Warehouse filter
  const [activeTab, setActiveTab] = useState("ready-for-packing");
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("All");

  // Raw mock lists
  const [rawOrders, setRawOrders] = useState<SalesOrderRecord[]>([]);
  const [rawPackings, setRawPackings] = useState<PackingRecord[]>([]);

  // Load lists on mount
  useEffect(() => {
    setRawOrders(getSalesOrders("All"));
    setRawPackings(getPackingRecordsList("All"));
  }, []);

  // Filter based on selected warehouse
  const ordersForWarehouse = useMemo(() => {
    if (selectedWarehouse === "All") return rawOrders;
    return rawOrders.filter(o => o.warehouse === selectedWarehouse);
  }, [rawOrders, selectedWarehouse]);

  const packingsForWarehouse = useMemo(() => {
    if (selectedWarehouse === "All") return rawPackings;
    return rawPackings.filter(p => p.warehouse === selectedWarehouse);
  }, [rawPackings, selectedWarehouse]);

  // KPIs
  const stats = useMemo(() => {
    const totalOrdersCount = ordersForWarehouse.length;
    const highUrgentCount = ordersForWarehouse.filter(o => o.priority === "High" || o.priority === "Urgent").length;
    const completedPackingsCount = packingsForWarehouse.length;
    const totalQtyPacked = packingsForWarehouse.reduce((acc, curr) => acc + curr.packedQuantity, 0);

    return {
      totalOrdersCount,
      highUrgentCount,
      completedPackingsCount,
      totalQtyPacked,
    };
  }, [ordersForWarehouse, packingsForWarehouse]);

  return (
    <ListingContainer
      title="Packing Management"
      titleIcon={Boxes}
      metrics={
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MiniKPICard label="Orders to Pack" value={stats.totalOrdersCount} icon={Package} accent={true} />
          <MiniKPICard label="High/Urgent Priority" value={stats.highUrgentCount} icon={AlertTriangle} accent={false} />
          <MiniKPICard label="Completed Packings" value={stats.completedPackingsCount} icon={CheckCircle2} accent={false} />
          <MiniKPICard label="Total Packed Qty" value={stats.totalQtyPacked} icon={Boxes} accent={false} />
        </div>
      }
    >
      {/* Tabs and Inline Warehouse Selector */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
          <TabsList className="bg-muted/50 p-0.5 border border-border/60 rounded-xl inline-flex">
            <TabsTrigger
              value="ready-for-packing"
              className="text-xs font-semibold px-4 py-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-brand-700"
            >
              <Clock className="w-3.5 h-3.5 mr-1.5" />
              Ready For Packing
            </TabsTrigger>
            <TabsTrigger
              value="packing-done"
              className="text-xs font-semibold px-4 py-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-brand-700"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              Packing Done
            </TabsTrigger>
          </TabsList>

          {/* Warehouse Dropdown inline with tabs */}
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

        {/* TAB 1: Ready For Packing */}
        <TabsContent value="ready-for-packing" className="mt-0 outline-none">
          <ReadyPackingListing ordersForWarehouse={ordersForWarehouse} />
        </TabsContent>

        {/* TAB 2: Packing Done */}
        <TabsContent value="packing-done" className="mt-0 outline-none">
          <DonePackingListing packingsForWarehouse={packingsForWarehouse} />
        </TabsContent>
      </Tabs>
    </ListingContainer>
  );
}
