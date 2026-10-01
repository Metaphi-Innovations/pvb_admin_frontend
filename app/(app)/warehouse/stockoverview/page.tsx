"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Boxes, ClipboardList, Package, RotateCcw, Reply, XCircle,
} from "lucide-react";
import { TabsContent } from "@/components/ui/tabs";
import { ListingContainer } from "@/components/layout/ListingContainer";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { MiniKPICard } from "@/components/ui/KPICard";
import { DailyLogsTab } from "./components/DailyLogsTab";
import { QcPassedListing } from "./qc-passed/QcPassedListing";
import { SalesReturnStockListing } from "./sales-return/SalesReturnStockListing";
import { SampleReturnStockListing } from "./sample-return/SampleReturnStockListing";
import { RejectedListing } from "./rejected/RejectedListing";
import {
  getQcPassedStockRecords,
  getRejectedStockRecords,
  getSalesReturnStockRecords,
  getSampleReturnStockRecords,
} from "./mock-data";
import { WAREHOUSE_OPTIONS } from "./constants";

const ALL_WAREHOUSES = [{ label: "All Warehouses", value: "All" }, ...WAREHOUSE_OPTIONS];

export default function StockOverviewPage() {
  const [activeTab, setActiveTab] = useState("daily-logs");
  const [selectedWarehouse, setSelectedWarehouse] = useState("All");
  const [qcPassed, setQcPassed] = useState<ReturnType<typeof getQcPassedStockRecords>>([]);
  const [rejected, setRejected] = useState<ReturnType<typeof getRejectedStockRecords>>([]);
  const [salesReturnStock, setSalesReturnStock] = useState<ReturnType<typeof getSalesReturnStockRecords>>([]);
  const [sampleReturnStock, setSampleReturnStock] = useState<ReturnType<typeof getSampleReturnStockRecords>>([]);

  const reload = useCallback(() => {
    setQcPassed(getQcPassedStockRecords());
    setRejected(getRejectedStockRecords());
    setSalesReturnStock(getSalesReturnStockRecords());
    setSampleReturnStock(getSampleReturnStockRecords());
  }, []);

  useEffect(() => {
    reload();
    window.addEventListener("focus", reload);
    return () => window.removeEventListener("focus", reload);
  }, [reload]);

  const filterByWarehouse = <T extends { warehouse: string }>(records: T[]) => {
    if (selectedWarehouse === "All") return records;
    return records.filter((r) => r.warehouse === selectedWarehouse);
  };

  const qcPassedForWarehouse = useMemo(() => filterByWarehouse(qcPassed), [qcPassed, selectedWarehouse]);
  const rejectedForWarehouse = useMemo(() => filterByWarehouse(rejected), [rejected, selectedWarehouse]);
  const salesReturnForWarehouse = useMemo(() => filterByWarehouse(salesReturnStock), [salesReturnStock, selectedWarehouse]);
  const sampleReturnForWarehouse = useMemo(() => filterByWarehouse(sampleReturnStock), [sampleReturnStock, selectedWarehouse]);

  const metrics = useMemo(() => {
    const totalInventory = qcPassedForWarehouse.reduce((sum, r) => sum + r.availableQuantity, 0);
    const totalSalesReturn = salesReturnForWarehouse.reduce((sum, r) => sum + r.availableQuantity, 0);
    const totalSampleReturn = sampleReturnForWarehouse.reduce((sum, r) => sum + r.availableQuantity, 0);
    const totalRejected = rejectedForWarehouse.reduce((sum, r) => sum + r.rejectedQuantity, 0);

    return { totalInventory, totalSalesReturn, totalSampleReturn, totalRejected };
  }, [qcPassedForWarehouse, salesReturnForWarehouse, sampleReturnForWarehouse, rejectedForWarehouse]);

  const showWarehouseFilter = activeTab !== "daily-logs";

  return (
    <ListingContainer
      title="Stock Overview"
      titleIcon={Boxes}
      metrics={
        activeTab === "daily-logs" ? null : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MiniKPICard label="Inventory Qty" value={metrics.totalInventory.toLocaleString()} icon={Package} accent />
            <MiniKPICard label="Sales Return Stock" value={metrics.totalSalesReturn.toLocaleString()} icon={RotateCcw} />
            <MiniKPICard label="Sample Return Stock" value={metrics.totalSampleReturn.toLocaleString()} icon={Reply} />
            <MiniKPICard label="Rejected Qty" value={metrics.totalRejected.toLocaleString()} icon={XCircle} />
          </div>
        )
      }
      tabs={[
        { value: "daily-logs", label: "Daily Logs", icon: ClipboardList },
        { value: "inventory", label: "Inventory", icon: Package },
        { value: "sales-return", label: "Sales Return Stock", icon: RotateCcw },
        { value: "sample-return", label: "Sample Return Stock", icon: Reply },
        { value: "rejected", label: "Rejected Inventory", icon: XCircle },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      actions={
        showWarehouseFilter ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Warehouse:</span>
            <AutocompleteSelect
              options={ALL_WAREHOUSES}
              value={selectedWarehouse}
              onChange={setSelectedWarehouse}
              placeholder="Select warehouse..."
              searchPlaceholder="Search warehouse..."
              className="h-9 w-[200px] text-xs rounded-lg border-border bg-white focus:ring-1 focus:ring-brand-500"
            />
          </div>
        ) : null
      }
    >
      <TabsContent value="daily-logs" className="mt-0 outline-none">
        <DailyLogsTab />
      </TabsContent>

      <TabsContent value="inventory" className="mt-0 outline-none">
        <QcPassedListing qcPassedForWarehouse={qcPassedForWarehouse} />
      </TabsContent>

      <TabsContent value="sales-return" className="mt-0 outline-none">
        <SalesReturnStockListing records={salesReturnForWarehouse} />
      </TabsContent>

      <TabsContent value="sample-return" className="mt-0 outline-none">
        <SampleReturnStockListing records={sampleReturnForWarehouse} />
      </TabsContent>

      <TabsContent value="rejected" className="mt-0 outline-none">
        <RejectedListing rejectedForWarehouse={rejectedForWarehouse} />
      </TabsContent>
    </ListingContainer>
  );
}
