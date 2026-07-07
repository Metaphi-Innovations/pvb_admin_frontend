"use client";

import { useQuery } from "@tanstack/react-query";
import { WarehouseService } from "@/services/warehouse.service";

export const warehouseKeys = {
  all: ["masters", "warehouses"] as const,
  dropdown: (state?: string) => [...warehouseKeys.all, "dropdown", state || ""] as const,
};

export function useWarehouseDropdown(state?: string) {
  return useQuery({
    queryKey: warehouseKeys.dropdown(state),
    queryFn: () => WarehouseService.dropdown(state),
    staleTime: 30_000,
  });
}
