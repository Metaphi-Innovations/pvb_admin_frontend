"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ListingContainer } from "@/components/layout/ListingContainer";
import { Boxes, CalendarDays, CheckCircle2, XCircle, Clock, ShieldAlert, Package, IndianRupee } from "lucide-react";
import { MiniKPICard } from "@/components/ui/KPICard";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { QcPassedStockRecord, RejectedStockRecord, GrnPendingStockRecord } from "./types";
import { getQcPassedStockList, getRejectedStockList, getGrnPendingStockList } from "./services";
import { WAREHOUSE_OPTIONS } from "./constants";
import { getInventoryDashboardMetrics } from "@/lib/accounts/inventory-accounting-data";
import { formatMoney } from "@/lib/accounts/money-format";

import { QcPassedListing } from "./qc-passed/QcPassedListing";
import { RejectedListing } from "./rejected/RejectedListing";
import { GrnPendingListing } from "./grn-pending/GrnPendingListing";

export default function StockOverviewPage() {
  const [activeTab, setActiveTab] = useState("qc-passed");
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("All");

  const [rawQcPassed, setRawQcPassed] = useState<QcPassedStockRecord[]>([]);
  const [rawRejected, setRawRejected] = useState<RejectedStockRecord[]>([]);
  const [rawGrnPending, setRawGrnPending] = useState<GrnPendingStockRecord[]>([]);

  useEffect(() => {
    setRawQcPassed(getQcPassedStockList());
    setRawRejected(getRejectedStockList());
    setRawGrnPending(getGrnPendingStockList());
  }, []);

  const qcPassedForWarehouse = useMemo(() => {
    if (selectedWarehouse === "All") return rawQcPassed;
    return rawQcPassed.filter((item) => item.warehouse === selectedWarehouse);
  }, [rawQcPassed, selectedWarehouse]);

  const rejectedForWarehouse = useMemo(() => {
    if (selectedWarehouse === "All") return rawRejected;
    return rawRejected.filter((item) => item.warehouse === selectedWarehouse);
  }, [rawRejected, selectedWarehouse]);

  const grnPendingForWarehouse = useMemo(() => {
    if (selectedWarehouse === "All") return rawGrnPending;
    return rawGrnPending.filter((item) => item.warehouse === selectedWarehouse);
  }, [rawGrnPending, selectedWarehouse]);

  const inventoryMetrics = useMemo(() => getInventoryDashboardMetrics(), []);

  const stats = useMemo(() => {
    const qcPassedQty = qcPassedForWarehouse.reduce((acc, curr) => acc + curr.availableQuantity, 0);
    const rejectedQty = rejectedForWarehouse.reduce((acc, curr) => acc + curr.rejectedQuantity, 0);
    const grnPendingQty = grnPendingForWarehouse.reduce((acc, curr) => acc + curr.receivedQuantity, 0);
    const nearExpiry = qcPassedForWarehouse.filter((r) => r.status === "Near Expiry").length;
    const expired = qcPassedForWarehouse.filter((r) => r.status === "Expired").length;

    return {
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
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <MiniKPICard label="QC Passed Stock" value={stats.qcPassedQty} icon={CheckCircle2} accent />
            <MiniKPICard label="Rejected Stock" value={stats.rejectedQty} icon={XCircle} />
            <MiniKPICard label="GRN Pending Stock" value={stats.grnPendingQty} icon={Clock} />
            <MiniKPICard label="Near Expiry Batches" value={stats.nearExpiry} icon={CalendarDays} />
            <MiniKPICard label="Expired Batches" value={stats.expired} icon={ShieldAlert} />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mt-3 pt-3 border-t border-border/50">
            <MiniKPICard
              label="Total Available Qty"
              value={inventoryMetrics.totalAvailableQty}
              icon={Package}
              accent
            />
            <MiniKPICard
              label="Total Stock Value"
              value={formatMoney(inventoryMetrics.totalInventoryValue)}
              icon={IndianRupee}
            />
            <MiniKPICard
              label="Near Expiry Stock Value"
              value={formatMoney(inventoryMetrics.nearExpiryStockValue)}
              icon={CalendarDays}
            />
            <MiniKPICard
              label="Expired Stock Value"
              value={formatMoney(inventoryMetrics.expiredStockValue)}
              icon={ShieldAlert}
            />
          </div>
        </>
      }
      tabs={[
        { value: "qc-passed", label: "QC Passed Stock", icon: CheckCircle2 },
        { value: "rejected", label: "Rejected Stock", icon: XCircle },
        { value: "grn-pending", label: "GRN Pending Stock", icon: Clock },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      actions={
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Warehouse:</span>
          <AutocompleteSelect
            options={[{ value: "All", label: "All Warehouses" }, ...WAREHOUSE_OPTIONS]}
            value={selectedWarehouse}
            onChange={setSelectedWarehouse}
            placeholder="All Warehouses"
            searchPlaceholder="Search warehouse..."
            className="h-8 w-[180px] text-xs py-1 px-2.5 rounded-lg border-border bg-white"
          />
        </div>
      }
    >
      <TabsContent value="qc-passed" className="mt-0 outline-none">
        <QcPassedListing qcPassedForWarehouse={qcPassedForWarehouse} />
      </TabsContent>

      <TabsContent value="rejected" className="mt-0 outline-none">
        <RejectedListing rejectedForWarehouse={rejectedForWarehouse} />
      </TabsContent>

      <TabsContent value="grn-pending" className="mt-0 outline-none">
        <GrnPendingListing grnPendingForWarehouse={grnPendingForWarehouse} />
      </TabsContent>
    </ListingContainer>
  );
}
