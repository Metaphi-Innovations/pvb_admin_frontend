"use client";

import { useQuery } from "@tanstack/react-query";
import { SupplierService } from "@/services/supplier.service";

export const supplierKeys = {
  all: ["masters", "suppliers"] as const,
  dropdown: (search?: string) => [...supplierKeys.all, "dropdown", search || ""] as const,
  detail: (id: string) => [...supplierKeys.all, "detail", id] as const,
};

export function useSupplierDropdown(search?: string) {
  return useQuery({
    queryKey: supplierKeys.dropdown(search),
    queryFn: () => SupplierService.dropdown(search),
    staleTime: 30_000,
  });
}

export function useSupplierDetail(id: string | null | undefined) {
  return useQuery({
    queryKey: supplierKeys.detail(id ?? ""),
    queryFn: () => SupplierService.view(id!),
    enabled: Boolean(id),
  });
}
