"use client";

import React, { useEffect, useState } from "react";
import { Boxes } from "lucide-react";
import { ListingContainer } from "@/components/layout/ListingContainer";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { WarehouseService } from "@/services/warehouse.service";

export function PackingListingLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [warehouseOptions, setWarehouseOptions] = useState<{ value: string; label: string }[]>([
    { value: "All", label: "All Warehouses" },
  ]);

  useEffect(() => {
    async function loadWarehouses() {
      try {
        const data = await WarehouseService.dropdown();
        setWarehouseOptions([
          { value: "All", label: "All Warehouses" },
          ...data.map((w) => ({ value: w.warehouse_id, label: w.warehouse_name })),
        ]);
      } catch (err) {
        console.error("Failed to load warehouses", err);
      }
    }
    loadWarehouses();
  }, []);

  const activeTab = pathname.includes("/warehouse/packing/purchase-return")
    ? "purchase-return"
    : pathname.includes("/warehouse/packing/stock-transfer")
    ? "stock-transfer"
    : pathname.includes("/warehouse/packing/sample")
    ? "sample"
    : "sales";

  const selectedWarehouse = searchParams.get("warehouse") || "All";

  const handleWarehouseChange = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("warehouse", val);
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <ListingContainer
      title="Packing Management"
      titleIcon={Boxes}
      actions={
        <div className="flex items-center gap-2 bg-white px-1.5 py-1.5 rounded-lg border border-border">
          <span className="text-[11px] text-muted-foreground font-semibold pl-1.5">Warehouse:</span>
          <AutocompleteSelect
            options={warehouseOptions}
            value={selectedWarehouse}
            onChange={handleWarehouseChange}
            placeholder="All Warehouses"
            searchPlaceholder="Search warehouse..."
            className="h-7 w-[180px] text-xs py-1 px-2 border-0 bg-white focus:ring-0 shadow-none focus:outline-none"
          />
        </div>
      }
      tabs={[
        { value: "sales", label: "Normal Sales" },
        { value: "sample", label: "Sample" },
        { value: "stock-transfer", label: "Stock Transfer" },
        { value: "purchase-return", label: "Purchase Return" },
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
