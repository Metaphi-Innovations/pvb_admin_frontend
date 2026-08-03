"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { ListingContainer } from "@/components/layout/ListingContainer";
import { Truck, FileText, CheckCircle2, Clock, Package, RotateCcw, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { MiniKPICard } from "@/components/ui/KPICard";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { getDispatches } from "./services";
import { DispatchListing } from "./DispatchListing";
import { axiosInstance as api } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";

export default function DispatchManagementPage() {
  const router = useRouter();
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("All");
  const [warehouses, setWarehouses] = useState<{value: string, label: string}[]>([]);

  useEffect(() => {
    async function fetchWarehouses() {
      try {
        const response = await api.get(API_ENDPOINTS.MASTER.WAREHOUSE.DROPDOWN);
        const opts = (response.data?.data || []).map((w: any) => ({
          value: w.warehouse_id || w.id || w.value,
          label: w.warehouse_name || w.name || w.label
        }));
        setWarehouses(opts);
      } catch (err) {
        console.error("Failed to fetch warehouses", err);
      }
    }
    fetchWarehouses();
  }, []);

  return (
    <ListingContainer
      title="Dispatch Management"
      titleIcon={Truck}
      actions={
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Warehouse:</span>
          <AutocompleteSelect
            options={[
              { value: "All", label: "All Warehouses" },
              ...warehouses
            ]}
            value={selectedWarehouse}
            onChange={setSelectedWarehouse}
            placeholder="All Warehouses"
            searchPlaceholder="Search warehouse..."
            className="h-9 w-[200px] text-xs py-1.5 px-3 rounded-lg border-border focus:ring-1 focus:ring-brand-500 bg-white shadow-none focus:outline-none"
          />
        </div>
      }
    >
      <DispatchListing selectedWarehouse={selectedWarehouse} />
    </ListingContainer>
  );
}
