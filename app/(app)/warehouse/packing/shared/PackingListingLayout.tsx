"use client";

import React, { useMemo, useEffect, useState } from "react";
import { Boxes, Package, AlertTriangle, CheckCircle2 } from "lucide-react";
import { ListingContainer } from "@/components/layout/ListingContainer";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { getSalesOrders, getPackingRecordsList } from "../services";
import { SalesOrderRecord, PackingRecord } from "../types";
import { MiniKPICard } from "@/components/ui/KPICard";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { WAREHOUSE_OPTIONS } from "../constants";
import { resolveWarehouseOrderType, matchesOrderTypeFilter } from "@/app/(app)/warehouse/lib/order-document-type";

function countBySource(records: Array<any>, source: string): number {
  return records.filter((item) =>
    matchesOrderTypeFilter(resolveWarehouseOrderType(item), source as any),
  ).length;
}

export function PackingListingLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [rawOrders, setRawOrders] = useState<SalesOrderRecord[]>([]);
  const [rawPackings, setRawPackings] = useState<PackingRecord[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setRawOrders(getSalesOrders("All"));
    setRawPackings(getPackingRecordsList("All"));
  }, []);

  const activeTab = pathname.includes("/warehouse/packing/stock-transfer")
    ? "stock-transfer"
    : pathname.includes("/warehouse/packing/sample")
    ? "sample"
    : "sales";

  const selectedWarehouse = searchParams.get("warehouse") || "All";

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
      "stock-transfer":
        countBySource(ordersForWarehouse, "stock_transfer") +
        countBySource(packingsForWarehouse, "stock_transfer"),
    }),
    [ordersForWarehouse, packingsForWarehouse]
  );

  const handleWarehouseChange = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("warehouse", val);
    router.replace(`${pathname}?${params.toString()}`);
  };

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
        <div className="flex items-center gap-2 bg-white px-1.5 py-1.5 rounded-lg border border-border">
          <span className="text-[11px] text-muted-foreground font-semibold pl-1.5">Warehouse:</span>
          <AutocompleteSelect
            options={[{ value: "All", label: "All Warehouses" }, ...WAREHOUSE_OPTIONS]}
            value={selectedWarehouse}
            onChange={handleWarehouseChange}
            placeholder="All Warehouses"
            searchPlaceholder="Search warehouse..."
            className="h-7 w-[180px] text-xs py-1 px-2 border-0 bg-white focus:ring-0 shadow-none focus:outline-none"
          />
        </div>
      }
      tabs={[
        { value: "sales", label: `Sales (${isMounted ? sourceCounts.sales : 0})` },
        { value: "sample", label: `Sample (${isMounted ? sourceCounts.sample : 0})` },
        { value: "stock-transfer", label: `Stock Transfer (${isMounted ? sourceCounts["stock-transfer"] : 0})` },
      ]}
      activeTab={activeTab}
      onTabChange={(val) => router.push(`/warehouse/packing/${val}`)}
    >
      <div className="space-y-4">
        {children}
      </div>
    </ListingContainer>
  );
}
