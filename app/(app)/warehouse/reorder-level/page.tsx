"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { ListingContainer } from "@/components/layout/ListingContainer";
import {
  CheckCircle2, Pencil, ShieldAlert, Activity, Layers, BarChart2
} from "lucide-react";
import { useRouter } from "next/navigation";
import { MiniKPICard } from "@/components/ui/KPICard";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ReorderLevel } from "./types";
import { getReordersByWarehouse, getAllReorders, generateStats } from "./services";
import { WAREHOUSE_OPTIONS } from "./constants";

import { WarehouseWiseListing } from "./warehouse-wise/WarehouseWiseListing";
import { ProductOverviewListing } from "./product-overview/ProductOverviewListing";

export default function ReorderLevelPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("warehouse-wise");
  const [selectedWarehouse, setSelectedWarehouse] = useState("Central Warehouse");
  const [allRecords, setAllRecords] = useState<ReorderLevel[]>([]);
  const [warehouseRecords, setWarehouseRecords] = useState<ReorderLevel[]>([]);

  const reload = useCallback(() => {
    setAllRecords(getAllReorders());
    setWarehouseRecords(getReordersByWarehouse(selectedWarehouse));
  }, [selectedWarehouse]);

  useEffect(() => {
    reload();
  }, [reload]);

  const stats = useMemo(() => generateStats(allRecords), [allRecords]);

  return (
    <ListingContainer
      title="Reorder Level Management"
      titleIcon={Activity}
      metrics={
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <MiniKPICard label="Total Configured" value={stats.totalConfigured} icon={Layers} accent={true} />
          <MiniKPICard label="In Stock" value={stats.inStock} icon={CheckCircle2} accent={false} />
          <MiniKPICard label="Low Stock" value={stats.lowStock} icon={ShieldAlert} accent={false} />
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
              options={WAREHOUSE_OPTIONS}
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
      {/* TAB 1: Warehouse Wise */}
      <TabsContent value="warehouse-wise" className="mt-0 outline-none">
        <WarehouseWiseListing 
          warehouseRecords={warehouseRecords} 
          selectedWarehouse={selectedWarehouse} 
          reload={reload} 
        />
      </TabsContent>

      {/* TAB 2: Product Overview */}
      <TabsContent value="product-overview" className="mt-0 outline-none">
        <ProductOverviewListing allRecords={allRecords} />
      </TabsContent>
    </ListingContainer>
  );
}
