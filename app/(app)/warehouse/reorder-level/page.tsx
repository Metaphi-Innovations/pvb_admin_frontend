"use client";

import React, { useState, useEffect } from "react";
import { ListingContainer } from "@/components/layout/ListingContainer";
import {
  CheckCircle2, ShieldAlert, Activity, Layers, BarChart2
} from "lucide-react";
import { MiniKPICard } from "@/components/ui/KPICard";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { TabsContent } from "@/components/ui/tabs";

import { ReorderSummary } from "./types";
import { ReorderLevelService } from "./services";

import { WarehouseWiseListing } from "./warehouse-wise/WarehouseWiseListing";
import { ProductOverviewListing } from "./product-overview/ProductOverviewListing";

export default function ReorderLevelPage() {
  const [activeTab, setActiveTab] = useState("warehouse-wise");
  const [selectedWarehouse, setSelectedWarehouse] = useState("All");
  const [warehouseOptions, setWarehouseOptions] = useState<Array<{ value: string; label: string }>>([
    { value: "All", label: "All Warehouses" },
  ]);
  const [summary, setSummary] = useState<ReorderSummary>({ total: 0, inStock: 0, lowStock: 0 });

  useEffect(() => {
    let mounted = true;
    ReorderLevelService.warehouseDropdown()
      .then((items) => {
        if (!mounted) return;
        setWarehouseOptions([{ value: "All", label: "All Warehouses" }, ...items]);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const isOverview = activeTab === "product-overview";
    ReorderLevelService.summary({
      reorder_type: isOverview ? "OVERALL" : "WAREHOUSE",
      warehouse_id: isOverview || selectedWarehouse === "All" ? undefined : selectedWarehouse,
    })
      .then((data) => {
        if (!active) return;
        setSummary(data);
      })
      .catch(() => {
        if (!active) return;
        setSummary({ total: 0, inStock: 0, lowStock: 0 });
      });
    return () => {
      active = false;
    };
  }, [selectedWarehouse, activeTab]);

  return (
    <ListingContainer
      title="Reorder Level Management"
      titleIcon={Activity}
      metrics={
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <MiniKPICard label="Total Configured" value={summary.total} icon={Layers} accent={true} />
          <MiniKPICard label="In Stock" value={summary.inStock} icon={CheckCircle2} accent={false} />
          <MiniKPICard label="Low Stock" value={summary.lowStock} icon={ShieldAlert} accent={false} />
        </div>
      }
      tabs={[
        { value: "warehouse-wise", label: "Warehouse Wise", icon: BarChart2 },
        { value: "product-overview", label: "Product Overview", icon: Layers }
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      actions={
        activeTab === "warehouse-wise" ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Warehouse:</span>
            <AutocompleteSelect
              options={warehouseOptions}
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
      <TabsContent value="warehouse-wise" className="mt-0 outline-none">
        <WarehouseWiseListing
          selectedWarehouseId={selectedWarehouse === "All" ? undefined : selectedWarehouse}
        />
      </TabsContent>

      <TabsContent value="product-overview" className="mt-0 outline-none">
        <ProductOverviewListing />
      </TabsContent>
    </ListingContainer>
  );
}
