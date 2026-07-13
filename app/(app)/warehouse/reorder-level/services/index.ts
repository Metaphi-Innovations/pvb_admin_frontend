import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import { WarehouseService } from "@/services/warehouse.service";
import { ReorderFormData, ReorderLevel, ReorderSummary } from "../types";

type ListParams = {
  page: number;
  pageSize: number;
  search: string;
  ordering?: string;
  reorder_type?: "OVERALL" | "WAREHOUSE";
  warehouse_id?: string;
  filters?: Record<string, unknown>;
  signal?: AbortSignal;
};

type ExportParams = {
  search: string;
  ordering?: string;
  reorder_type?: "OVERALL" | "WAREHOUSE";
  warehouse_id?: string;
  export_type?: "csv" | "excel";
  filters?: Record<string, unknown>;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "");
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const n = Number(value.trim());
    return Number.isFinite(n) ? n : 0;
  }
  // Prisma Decimal-like objects
  if (value && typeof value === "object" && "toString" in value) {
    const n = Number(String(value));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  return String(value ?? "").toLowerCase() === "true";
}

function normalizeStockStatus(value: unknown): "In Stock" | "Low Stock" {
  const str = asString(value).trim().toLowerCase();
  return str === "low stock" ? "Low Stock" : "In Stock";
}

function mapItem(raw: Record<string, unknown>, idx: number): ReorderLevel {
  const createdBy = (raw.created_by_user ?? {}) as Record<string, unknown>;
  const updatedBy = (raw.updated_by_user ?? {}) as Record<string, unknown>;
  // List API returns flat fields; Get-by-ID returns nested master_item / warehouse
  const masterItem = (raw.master_item ?? {}) as Record<string, unknown>;
  const categoryObj = (masterItem.category ?? {}) as Record<string, unknown>;
  const warehouse = (raw.warehouse ?? {}) as Record<string, unknown>;

  const productName = asString(raw.product_name || masterItem.product_name);
  const productCode = asString(raw.product_code || masterItem.product_code || masterItem.sku);
  const categoryName = asString(raw.category_name || categoryObj.categoryName);
  const unitName = asString(raw.unit_name || masterItem.unit);
  const warehouseName = asString(raw.warehouse_name || warehouse.warehouse_name) || "N/A";
  const warehouseId = asString(raw.warehouse_id || warehouse.warehouse_id) || null;

  return {
    id: asString(raw.reorder_level_id),
    srNo: toNumber(raw.sr_no) || idx + 1,
    productId: asString(raw.master_item_id || masterItem.product_id),
    product: productName,
    productCode,
    sku: productCode,
    category: categoryName,
    unit: unitName,
    warehouseId,
    warehouse: warehouseName,
    reorderType: (asString(raw.reorder_type) as "OVERALL" | "WAREHOUSE") || "WAREHOUSE",
    reorderLevelQty: toNumber(raw.reorder_level),
    currentStock: toNumber(raw.available_stock),
    reservedStock: toNumber(raw.reserved_stock),
    status: normalizeStockStatus(raw.status),
    remark: asString(raw.remark),
    isActive: toBoolean(raw.is_active),
    createdBy: asString(createdBy.username || createdBy.first_name),
    updatedBy: asString(updatedBy.username || updatedBy.first_name),
    createdDate: asString(raw.created_at).slice(0, 10),
    updatedDate: asString(raw.updated_at).slice(0, 10),
  };
}

function buildQuery(params: Record<string, string | undefined>): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (!val) return;
    query.set(key, val);
  });
  return query.toString();
}

function buildListFilters(filters: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!filters) return {};

  const mapped: Record<string, unknown> = {};
  Object.entries(filters).forEach(([key, val]) => {
    const value = Array.isArray(val) ? val[0] : val;
    if (value === undefined || value === null || value === "") return;

    if (key === "product") mapped.product_name = value;
    else if (key === "productCode") mapped.product_code = value;
    else if (key === "category") mapped.category_name = value;
    else if (key === "unit") mapped.unit_name = value;
    else if (key === "warehouse") mapped.warehouse_name = value;
    else if (key === "createdBy") mapped.created_by_user = value;
    else if (key === "updatedBy") mapped.updated_by_user = value;
    else if (key === "activeStatus") mapped.is_active = String(value) === "active";
    else if (key === "status") {
      // Backend computes status as "in stock" | "low stock"
      const normalized = String(value).trim().toLowerCase().replace(/_/g, " ");
      if (normalized === "in stock" || normalized === "low stock") {
        mapped.status = normalized;
      }
    }
  });

  return mapped;
}

export const ReorderLevelService = {
  async list(params: ListParams): Promise<{ items: ReorderLevel[]; total: number }> {
    const query = buildQuery({
      page: String(params.page),
      pageSize: String(params.pageSize),
      search: params.search || "",
      ordering: params.ordering || "",
      reorder_type: params.reorder_type || "WAREHOUSE",
      warehouse_id: params.warehouse_id || undefined,
    });

    const response = await axiosInstance.post(
      `${API_ENDPOINTS.WAREHOUSE.REORDER_LEVEL.LIST}?${query}`,
      { filters: buildListFilters(params.filters) },
      { signal: params.signal },
    );

    const payload = response.data as Record<string, unknown>;
    const data = Array.isArray(payload.data) ? payload.data : [];
    const items = data.map((row, idx) => mapItem((row ?? {}) as Record<string, unknown>, idx));
    const totalRecords = Number(payload.totalRecords ?? payload.count);

    return {
      items,
      total: Number.isFinite(totalRecords) ? totalRecords : items.length,
    };
  },

  async summary(params: { reorder_type?: "OVERALL" | "WAREHOUSE"; warehouse_id?: string }): Promise<ReorderSummary> {
    const query = buildQuery({
      reorder_type: params.reorder_type || "WAREHOUSE",
      warehouse_id: params.warehouse_id || undefined,
    });

    const response = await axiosInstance.get(`${API_ENDPOINTS.WAREHOUSE.REORDER_LEVEL.SUMMARY}?${query}`);
    const data = (response.data as Record<string, unknown>).data as Record<string, unknown> | undefined;
    return {
      total: toNumber(data?.total),
      inStock: toNumber(data?.inStock),
      lowStock: toNumber(data?.lowStock),
    };
  },

  async getById(id: string): Promise<ReorderLevel> {
    const response = await axiosInstance.get(API_ENDPOINTS.WAREHOUSE.REORDER_LEVEL.DETAILS(id));
    const data = (response.data as Record<string, unknown>).data as Record<string, unknown> | undefined;
    if (!data) {
      throw new Error("Reorder level not found.");
    }
    return mapItem(data, 0);
  },

  async create(payload: ReorderFormData): Promise<void> {
    await axiosInstance.post(API_ENDPOINTS.WAREHOUSE.REORDER_LEVEL.CREATE, payload);
  },

  async update(id: string, payload: { reorder_level: number; remark?: string; is_active?: boolean }): Promise<void> {
    await axiosInstance.put(API_ENDPOINTS.WAREHOUSE.REORDER_LEVEL.UPDATE(id), payload);
  },

  async toggleStatus(id: string): Promise<void> {
    await axiosInstance.patch(API_ENDPOINTS.WAREHOUSE.REORDER_LEVEL.TOGGLE_STATUS(id));
  },

  async delete(id: string): Promise<void> {
    await axiosInstance.delete(API_ENDPOINTS.WAREHOUSE.REORDER_LEVEL.DELETE(id));
  },

  async export(params: ExportParams): Promise<void> {
    const query = buildQuery({
      export_type: params.export_type || "excel",
      search: params.search || "",
      ordering: params.ordering || "",
      reorder_type: params.reorder_type || "WAREHOUSE",
      warehouse_id: params.warehouse_id || undefined,
    });

    const response = await axiosInstance.post(
      `${API_ENDPOINTS.WAREHOUSE.REORDER_LEVEL.EXPORT}?${query}`,
      { filters: buildListFilters(params.filters) },
      { responseType: "blob" },
    );

    const blob = response.data as Blob;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;

    const disposition = String(response.headers?.["content-disposition"] || "");
    const matched = disposition.match(/filename="?([^"]+)"?/i);
    link.download = matched?.[1] || "reorder_level_report.xlsx";

    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  async filterDropdown(
    field: "product_name" | "product_code" | "category_name" | "unit_name" | "warehouse_name",
    params?: { reorder_type?: "OVERALL" | "WAREHOUSE"; warehouse_id?: string },
  ): Promise<Array<{ label: string; value: string }>> {
    const query = buildQuery({
      field,
      reorder_type: params?.reorder_type || "WAREHOUSE",
      warehouse_id: params?.warehouse_id || undefined,
    });
    const response = await axiosInstance.get(`${API_ENDPOINTS.WAREHOUSE.REORDER_LEVEL.FILTER}?${query}`);
    const data = Array.isArray((response.data as Record<string, unknown>).data)
      ? ((response.data as Record<string, unknown>).data as Array<Record<string, unknown>>)
      : [];

    if (field === "product_name") {
      return data.map((item) => ({ value: asString(item.product_name), label: asString(item.product_name) }));
    }
    if (field === "product_code") {
      return data.map((item) => ({ value: asString(item.product_code), label: asString(item.product_code) }));
    }
    if (field === "category_name") {
      return data.map((item) => ({ value: asString(item.categoryName), label: asString(item.categoryName) }));
    }
    if (field === "warehouse_name") {
      return data.map((item) => ({ value: asString(item.warehouse_name), label: asString(item.warehouse_name) }));
    }
    return data.map((item) => ({ value: asString(item.unit_name), label: asString(item.unit_name) }));
  },

  async productDropdown(): Promise<
    Array<{ value: string; label: string; productCode: string; category: string; unit: string }>
  > {
    const response = await axiosInstance.get(API_ENDPOINTS.MASTER.PRODUCT.DROPDOWN);
    const data = Array.isArray((response.data as Record<string, unknown>).data)
      ? ((response.data as Record<string, unknown>).data as Array<Record<string, unknown>>)
      : [];

    return data.map((item) => ({
      value: asString(item.product_id),
      label: asString(item.product_name),
      productCode: asString(item.product_code),
      category: asString((item.category as Record<string, unknown> | undefined)?.categoryName),
      unit: asString(item.unit),
    }));
  },

  async warehouseDropdown(): Promise<Array<{ value: string; label: string }>> {
    const items = await WarehouseService.dropdown();
    return items.map((item) => ({
      value: item.warehouse_id,
      label: item.warehouse_name,
    }));
  },
};

export function toOrdering(key: string, direction: "asc" | "desc" | "none"): string {
  if (!key || direction === "none") return "";
  const map: Record<string, string> = {
    product: "product_name",
    productCode: "product_code",
    category: "category_name",
    unit: "unit_name",
    warehouse: "warehouse_name",
    reorderLevelQty: "reorder_level",
    currentStock: "available_stock",
    reservedStock: "reserved_stock",
    status: "status",
    createdDate: "created_at",
    updatedDate: "updated_at",
  };
  const field = map[key];
  if (!field) return "";
  return direction === "desc" ? `-${field}` : field;
}
