"use client";

import React, { useCallback, useState, useEffect } from "react";
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
import { StockOverviewApi, type StockOverviewSummary } from "./services/stock-overview-api";

const EMPTY_SUMMARY: StockOverviewSummary = {
  inventoryQty: 0,
  salesReturnStock: 0,
  sampleReturnStock: 0,
  rejectedQty: 0,
};

export default function StockOverviewPage() {
  const [activeTab, setActiveTab] = useState("daily-logs");
  const [selectedWarehouse, setSelectedWarehouse] = useState("All");
  const [warehouseOptions, setWarehouseOptions] = useState<Array<{ label: string; value: string }>>([
    { label: "All Warehouses", value: "All" },
  ]);
  const [summary, setSummary] = useState<StockOverviewSummary>(EMPTY_SUMMARY);
  const [summaryNonce, setSummaryNonce] = useState(0);

  const refreshSummary = useCallback(() => {
    setSummaryNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    let mounted = true;
    StockOverviewApi.warehouseDropdown()
      .then((items) => {
        if (!mounted) return;
        setWarehouseOptions([{ label: "All Warehouses", value: "All" }, ...items]);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (activeTab === "daily-logs") return;
    let active = true;
    StockOverviewApi.summary(selectedWarehouse === "All" ? undefined : selectedWarehouse)
      .then((data) => {
        if (!active) return;
        setSummary(data);
      })
      .catch(() => {
        if (!active) return;
        setSummary(EMPTY_SUMMARY);
      });
    return () => {
      active = false;
    };
  }, [selectedWarehouse, activeTab, summaryNonce]);

  const showWarehouseFilter = activeTab !== "daily-logs";
  const warehouseId = selectedWarehouse === "All" ? undefined : selectedWarehouse;

  return (
    <ListingContainer
      title="Stock Overview"
      titleIcon={Boxes}
      metrics={
        activeTab === "daily-logs" ? null : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MiniKPICard label="Inventory Qty" value={summary.inventoryQty.toLocaleString()} icon={Package} accent />
            <MiniKPICard label="Sales Return Stock" value={summary.salesReturnStock.toLocaleString()} icon={RotateCcw} />
            <MiniKPICard label="Sample Return Stock" value={summary.sampleReturnStock.toLocaleString()} icon={Reply} />
            <MiniKPICard label="Rejected Qty" value={summary.rejectedQty.toLocaleString()} icon={XCircle} />
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
              options={warehouseOptions}
              value={selectedWarehouse}
              onChange={(value) => {
                setSelectedWarehouse(value);
                refreshSummary();
              }}
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
        <QcPassedListing warehouseId={warehouseId} onFiltersApplied={refreshSummary} />
      </TabsContent>

      <TabsContent value="sales-return" className="mt-0 outline-none">
        <SalesReturnStockListing warehouseId={warehouseId} onFiltersApplied={refreshSummary} />
      </TabsContent>

      <TabsContent value="sample-return" className="mt-0 outline-none">
        <SampleReturnStockListing warehouseId={warehouseId} onFiltersApplied={refreshSummary} />
      </TabsContent>

      <TabsContent value="rejected" className="mt-0 outline-none">
        <RejectedListing warehouseId={warehouseId} onFiltersApplied={refreshSummary} />
      </TabsContent>
    </ListingContainer>
  );
}
