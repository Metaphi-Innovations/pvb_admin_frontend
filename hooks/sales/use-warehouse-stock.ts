import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  SalesWarehouseStockService,
  type WarehouseStockMap,
} from "@/services/sales-warehouse-stock.service";
import type { ProductCatalogItem } from "@/app/(app)/sales/orders/orders-data";

export function useWarehouseStock(warehouseId: string | number | null | undefined) {
  const id = warehouseId ? String(warehouseId) : "";
  return useQuery({
    queryKey: ["sales", "warehouse-stock", id],
    queryFn: ({ signal }) => SalesWarehouseStockService.getByWarehouse(id, signal),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

/**
 * Overlays the selected warehouse's sellable stock onto the product catalog.
 * With no warehouse selected the catalog is returned unchanged; while loading or
 * on error every product shows 0 so nothing looks orderable by mistake.
 */
export function useProductsWithWarehouseStock<T extends Pick<ProductCatalogItem, "id" | "stock">>(
  products: T[],
  warehouseId: string | number | null | undefined,
) {
  const stockQuery = useWarehouseStock(warehouseId);
  const stock = warehouseId ? stockQuery.data : undefined;

  const productsWithStock = useMemo(() => {
    if (!warehouseId) return products;
    return products.map((p) => ({ ...p, stock: stock?.[String(p.id)] ?? 0 }));
  }, [products, stock, warehouseId]);

  return {
    products: productsWithStock,
    stock,
    isLoading: stockQuery.isLoading,
    isError: stockQuery.isError,
  };
}

/** Display value for a line's live stock in read-only views. */
export function formatLineStock(
  query: { data?: WarehouseStockMap; isLoading: boolean },
  productId: string | number | null | undefined,
): string {
  if (productId == null || productId === "") return "—";
  if (query.isLoading) return "…";
  if (!query.data) return "—";
  return String(query.data[String(productId)] ?? 0);
}

/** Returns lines with `availableStock` refreshed from `stock`, or null when nothing changed. */
export function withLatestLineStock<
  T extends { productId: string | number | null; availableStock: number },
>(lines: T[], stock: WarehouseStockMap): T[] | null {
  let changed = false;
  const next = lines.map((line) => {
    if (line.productId == null) return line;
    const qty = stock[String(line.productId)] ?? 0;
    if (line.availableStock === qty) return line;
    changed = true;
    return { ...line, availableStock: qty };
  });
  return changed ? next : null;
}
