"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ListingContainer } from "@/components/layout/ListingContainer";
import { Boxes, Package, AlertTriangle, CheckCircle2 } from "lucide-react";
import { MiniKPICard } from "@/components/ui/KPICard";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { cn } from "@/lib/utils";

import { SalesOrderRecord, PackingRecord } from "./types";
import { getSalesOrders, getPackingRecordsList } from "./services";
import { WAREHOUSE_OPTIONS } from "./constants";

import { ReadyPackingListing } from "./ready/ReadyPackingListing";
import { DonePackingListing } from "./done/DonePackingListing";
import {
  matchesOrderTypeFilter,
  resolveWarehouseOrderType,
  type OrderTypeFilterTab,
} from "@/app/(app)/warehouse/lib/order-document-type";

type PackingSourceTab = Exclude<OrderTypeFilterTab, "all">;
type PackingStatusTab = "all" | "ready-for-packing" | "packing-done";

const SOURCE_TABS: { id: PackingSourceTab; label: string }[] = [
  { id: "sales", label: "Sales" },
  { id: "sample", label: "Sample" },
  { id: "stock_transfer", label: "Stock Transfer" },
];

const STATUS_TABS: { id: PackingStatusTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "ready-for-packing", label: "Ready For Packing" },
  { id: "packing-done", label: "Packing Done" },
];

function countBySource(
  records: Array<SalesOrderRecord | PackingRecord>,
  source: PackingSourceTab,
): number {
  return records.filter((item) =>
    matchesOrderTypeFilter(resolveWarehouseOrderType(item), source),
  ).length;
}

export default function PackingManagementPage() {
  const [sourceFilter, setSourceFilter] = useState<PackingSourceTab>("sales");
  const [statusTab, setStatusTab] = useState<PackingStatusTab>("all");
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("All");

  const [rawOrders, setRawOrders] = useState<SalesOrderRecord[]>([]);
  const [rawPackings, setRawPackings] = useState<PackingRecord[]>([]);

  useEffect(() => {
    setRawOrders(getSalesOrders("All"));
    setRawPackings(getPackingRecordsList("All"));
  }, []);

  const ordersForWarehouse = useMemo(() => {
    if (selectedWarehouse === "All") return rawOrders;
    return rawOrders.filter((o) => o.warehouse === selectedWarehouse);
  }, [rawOrders, selectedWarehouse]);

  const packingsForWarehouse = useMemo(() => {
    if (selectedWarehouse === "All") return rawPackings;
    return rawPackings.filter((p) => p.warehouse === selectedWarehouse);
  }, [rawPackings, selectedWarehouse]);

  const stats = useMemo(() => {
    const totalOrdersCount = ordersForWarehouse.length;
    const highUrgentCount = ordersForWarehouse.filter(
      (o) => o.priority === "High" || o.priority === "Urgent",
    ).length;
    const completedPackingsCount = packingsForWarehouse.length;
    const totalQtyPacked = packingsForWarehouse.reduce((acc, curr) => acc + curr.packedQuantity, 0);

    return {
      totalOrdersCount,
      highUrgentCount,
      completedPackingsCount,
      totalQtyPacked,
    };
  }, [ordersForWarehouse, packingsForWarehouse]);

  const sourceCounts = useMemo(
    () => ({
      sales: countBySource(ordersForWarehouse, "sales") + countBySource(packingsForWarehouse, "sales"),
      sample: countBySource(ordersForWarehouse, "sample") + countBySource(packingsForWarehouse, "sample"),
      stock_transfer:
        countBySource(ordersForWarehouse, "stock_transfer") +
        countBySource(packingsForWarehouse, "stock_transfer"),
    }),
    [ordersForWarehouse, packingsForWarehouse],
  );

  const statusCounts = useMemo(() => {
    const ready = countBySource(ordersForWarehouse, sourceFilter);
    const done = countBySource(packingsForWarehouse, sourceFilter);
    return {
      all: ready + done,
      "ready-for-packing": ready,
      "packing-done": done,
    };
  }, [ordersForWarehouse, packingsForWarehouse, sourceFilter]);

  const showReady = statusTab === "all" || statusTab === "ready-for-packing";
  const showDone = statusTab === "all" || statusTab === "packing-done";

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
      actions={
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Warehouse:</span>
          <AutocompleteSelect
            options={[{ value: "All", label: "All Warehouses" }, ...WAREHOUSE_OPTIONS]}
            value={selectedWarehouse}
            onChange={setSelectedWarehouse}
            placeholder="All Warehouses"
            searchPlaceholder="Search warehouse..."
            className="h-9 w-[200px] text-xs py-1.5 px-3 rounded-lg border-border focus:ring-1 focus:ring-brand-500 bg-white shadow-none focus:outline-none"
          />
        </div>
      }
    >
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {SOURCE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSourceFilter(tab.id)}
              className={cn(
                "h-8 px-3 text-xs rounded-lg border transition-colors font-medium inline-flex items-center gap-1.5",
                sourceFilter === tab.id
                  ? "bg-brand-600 text-white border-brand-600"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center",
                  sourceFilter === tab.id ? "bg-white/20 text-white" : "bg-muted text-muted-foreground",
                )}
              >
                {sourceCounts[tab.id]}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusTab(tab.id)}
              className={cn(
                "h-8 px-3 text-xs rounded-lg border transition-colors font-medium inline-flex items-center gap-1.5",
                statusTab === tab.id
                  ? "bg-navy-600 text-white border-navy-600"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center",
                  statusTab === tab.id ? "bg-white/20 text-white" : "bg-muted text-muted-foreground",
                )}
              >
                {statusCounts[tab.id]}
              </span>
            </button>
          ))}
        </div>

        {showReady && (
          <ReadyPackingListing ordersForWarehouse={ordersForWarehouse} sourceFilter={sourceFilter} />
        )}

        {showDone && (
          <DonePackingListing packingsForWarehouse={packingsForWarehouse} sourceFilter={sourceFilter} />
        )}
      </div>
    </ListingContainer>
  );
}
