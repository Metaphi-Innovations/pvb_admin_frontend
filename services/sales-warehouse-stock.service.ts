import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";

/** Sellable, non-expired base qty keyed by product id. */
export type WarehouseStockMap = Record<string, number>;

export const SalesWarehouseStockService = {
  async getByWarehouse(warehouseId: string, signal?: AbortSignal): Promise<WarehouseStockMap> {
    const response = await axiosInstance.get(API_ENDPOINTS.SALES.WAREHOUSE_STOCK, {
      params: { warehouse_id: warehouseId },
      signal,
    });
    const rows: unknown[] = Array.isArray(response.data?.data) ? response.data.data : [];
    const stock: WarehouseStockMap = {};
    for (const row of rows) {
      const record = (row ?? {}) as Record<string, unknown>;
      const productId = String(record.product_id ?? "");
      const qty = Number(record.available_qty ?? 0);
      if (productId) stock[productId] = Number.isFinite(qty) ? qty : 0;
    }
    return stock;
  },
};
