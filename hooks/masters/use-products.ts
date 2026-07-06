"use client";

import { useQuery } from "@tanstack/react-query";
import { ProductDropdownService } from "@/services/product-dropdown.service";

export const productKeys = {
  all: ["masters", "products"] as const,
  dropdown: () => [...productKeys.all, "dropdown"] as const,
};

export function useProductDropdown() {
  return useQuery({
    queryKey: productKeys.dropdown(),
    queryFn: () => ProductDropdownService.dropdown(),
    staleTime: 30_000,
  });
}
