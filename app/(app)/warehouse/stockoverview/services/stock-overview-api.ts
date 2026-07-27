import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import { WarehouseService } from "@/services/warehouse.service";
import type { FilterState } from "@/components/listing/types";

export type StockOverviewTab = "inventory" | "rejected" | "sales_return" | "sample_return";

export type StockOverviewSummary = {
  inventoryQty: number;
  salesReturnStock: number;
  sampleReturnStock: number;
  rejectedQty: number;
};

export type InventoryListRow = {
  id: string;
  product_name: string;
  sku: string;
  uom: string;
  available_qty: number;
  reserved_qty: number;
  cp: string;
  stock_value: string;
  warehouse_name: string;
  batch_no: string;
  status: string;
};

export type RejectedListRow = {
  id: string;
  product_name: string;
  warehouse_name: string;
  batch_no: string;
  rejected_qty: number;
  reject_reason: string;
  qc_number: string;
  inspection_date: string | null;
  status: string;
};

export type ReturnStockListRow = {
  id: string;
  return_no: string;
  product_name: string;
  customer_name: string;
  warehouse_name: string;
  batch_no: string;
  available_qty: number;
  return_date: string | null;
  expiry_date: string | null;
  status: string;
};

export type DailyLogListRow = {
  id: string;
  product_code: string;
  product_name: string;
  hsn: string;
  scientific_name: string;
  category: string;
  pack_size: string;
  opening_qty: number;
  day_in: number | string;
  day_out: number | string;
  closing_qty: number;
  available_qty: number;
  batch_no: string;
  expiry_date: string | null;
  warehouse_name: string;
  cp: number;
  valuation: number;
  status: string;
};

export type DailyLogSummary = {
  openingStockQty: number;
  dayInQty: number;
  dayOutQty: number;
  closingStockQty: number;
  closingStockValue: number;
};

type ListBaseParams = {
  page: number;
  page_size: number;
  search?: string;
  ordering?: string;
  warehouse_id?: string;
  filters?: FilterState;
  signal?: AbortSignal;
};

export type InventoryDetails = {
  id: string;
  product: {
    product_name: string;
    product_code: string;
    sku: string | null;
  };
  warehouse: {
    warehouse_name: string;
    warehouse_code: string;
  };
  batch_no: string;
  status: string;
  available_qty: number;
  reserved_qty: number;
  manufacture_date: string | null;
  expiry_date: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
};

export type RejectedDetails = {
  id: string;
  product: {
    product_name: string;
    product_code: string;
  };
  warehouse: {
    warehouse_name: string;
    warehouse_code: string;
  };
  batch_no: string;
  rejected_qty: number;
  reject_reason: string;
  status: string;
  qc_number: string;
  inspection_date: string | null;
};

type DailyLogFilterParams = {
  search?: string;
  ordering?: string;
  warehouse_id?: string;
  product_id?: string;
  period?: string;
  from_date?: string;
  to_date?: string;
  filters?: FilterState;
  signal?: AbortSignal;
};

type DailyLogListParams = ListBaseParams & {
  period?: string;
  from_date?: string;
  to_date?: string;
  product_id?: string;
};

function parseFilenameFromDisposition(disposition: string | undefined, fallback: string): string {
  if (!disposition) return fallback;
  const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) {
    try {
      return decodeURIComponent(utfMatch[1].trim());
    } catch {
      return utfMatch[1].trim();
    }
  }
  const plainMatch = disposition.match(/filename="?([^";]+)"?/i);
  return plainMatch?.[1]?.trim() || fallback;
}

function asDisplayName(user: unknown): string {
  if (!user || typeof user !== "object") return "";
  const record = user as Record<string, unknown>;
  const username = asString(record.username).trim();
  if (username) return username;
  const first = asString(record.first_name).trim();
  const last = asString(record.last_name).trim();
  return `${first} ${last}`.trim();
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "");
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const n = Number(value.trim());
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function buildQuery(params: Record<string, string | undefined>): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val === undefined || val === null || val === "") return;
    query.set(key, val);
  });
  return query.toString();
}

function scalarFilterValue(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (Array.isArray(value)) {
    const first = value[0];
    return first === undefined || first === null || first === "" ? undefined : String(first);
  }
  if (typeof value === "object" && value !== null && "fromDate" in value) return undefined;
  return String(value);
}

/** Map UI filter keys → API body.filters keys expected by Stock Overview APIs. */
export function buildStockOverviewFilters(filters: FilterState | undefined): Record<string, unknown> {
  if (!filters) return {};
  const mapped: Record<string, unknown> = {};

  Object.entries(filters).forEach(([key, raw]) => {
    if (key === "search") return;
    const value = scalarFilterValue(raw);
    if (value === undefined) return;

    if (key === "product" || key === "product_name" || key === "productName") mapped.product_name = value;
    else if (key === "warehouse" || key === "warehouse_name") mapped.warehouse_name = value;
    else if (key === "batchNumber" || key === "batch_no") mapped.batch_no = value;
    else if (key === "status") mapped.status = value;
    else if (key === "product_code" || key === "productCode") mapped.product_code = value;
    else if (key === "sku") mapped.sku = value;
    else if (key === "uom" || key === "unit") mapped.uom = value;
    else if (key === "hsn") mapped.hsn = value;
    else if (key === "scientific_name" || key === "scientificName") mapped.scientific_name = value;
    else if (key === "category") mapped.category = value;
    else if (key === "customer" || key === "customer_name") mapped.customer_name = value;
  });

  return mapped;
}

function parseListResponse<T>(payload: Record<string, unknown>): { items: T[]; total: number } {
  const data = Array.isArray(payload.data) ? (payload.data as T[]) : [];
  const total = Number(payload.totalRecords ?? payload.count ?? data.length);
  return { items: data, total: Number.isFinite(total) ? total : data.length };
}

function getErrorMessage(err: unknown, fallback: string): string {
  const ax = err as { response?: { data?: { message?: string } }; message?: string };
  return ax?.response?.data?.message || ax?.message || fallback;
}

export function toStockOrdering(key: string, direction: "asc" | "desc" | "none"): string {
  if (!key || direction === "none") return "";
  const map: Record<string, string> = {
    product: "product_name",
    product_name: "product_name",
    sku: "sku",
    uom: "uom",
    availableQuantity: "available_qty",
    available_qty: "available_qty",
    reservedQuantity: "reserved_qty",
    reserved_qty: "reserved_qty",
    costPrice: "cp",
    cp: "cp",
    stockValue: "stock_value",
    stock_value: "stock_value",
    warehouse: "warehouse_name",
    warehouse_name: "warehouse_name",
    batchNumber: "batch_no",
    batch_no: "batch_no",
    status: "status",
    rejectedQuantity: "rejected_qty",
    rejected_qty: "rejected_qty",
    rejectionReason: "reject_reason",
    reject_reason: "reject_reason",
    qcNumber: "qc_number",
    qc_number: "qc_number",
    inspectionDate: "inspection_date",
    inspection_date: "inspection_date",
    salesReturnNo: "return_no",
    sampleReturnNo: "return_no",
    return_no: "return_no",
    customer: "customer_name",
    customer_name: "customer_name",
    returnDate: "return_date",
    return_date: "return_date",
    expiryDate: "expiry_date",
    expiry_date: "expiry_date",
    product_code: "product_code",
    hsn: "hsn",
    scientific_name: "scientific_name",
    category: "category",
    pack_size: "pack_size",
    opening_qty: "opening_qty",
    day_in: "day_in",
    day_out: "day_out",
    closing_qty: "closing_qty",
    valuation: "valuation",
  };
  const field = map[key] || key;
  return direction === "desc" ? `-${field}` : field;
}

export const StockOverviewApi = {
  getErrorMessage,

  async warehouseDropdown(): Promise<Array<{ value: string; label: string }>> {
    const items = await WarehouseService.dropdown();
    return items.map((w) => ({
      value: w.warehouse_id,
      label: w.warehouse_name,
    }));
  },

  async summary(warehouseId?: string): Promise<StockOverviewSummary> {
    const query = buildQuery({
      warehouse_id: warehouseId && warehouseId !== "all" && warehouseId !== "All" ? warehouseId : "all",
    });
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.WAREHOUSE.STOCK_OVERVIEW.SUMMARY}${query ? `?${query}` : ""}`,
      { warehouse_id: warehouseId && warehouseId !== "all" && warehouseId !== "All" ? warehouseId : "all" },
    );
    const data = ((response.data as Record<string, unknown>).data ?? {}) as Record<string, unknown>;
    return {
      inventoryQty: toNumber(data.inventoryQty),
      salesReturnStock: toNumber(data.salesReturnStock),
      sampleReturnStock: toNumber(data.sampleReturnStock),
      rejectedQty: toNumber(data.rejectedQty),
    };
  },

  async filterDropdown(
    tab: StockOverviewTab,
    field_name: string,
    signal?: AbortSignal,
  ): Promise<Array<{ label: string; value: string }>> {
    const query = buildQuery({ tab, field_name });
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.WAREHOUSE.STOCK_OVERVIEW.FILTER}?${query}`,
      { signal },
    );
    const data = Array.isArray((response.data as Record<string, unknown>).data)
      ? ((response.data as Record<string, unknown>).data as Array<Record<string, unknown>>)
      : [];

    return data
      .map((row) => {
        const value = asString(row[field_name] ?? Object.values(row)[0]);
        return value ? { label: value, value } : null;
      })
      .filter((x): x is { label: string; value: string } => Boolean(x));
  },

  async listInventory(params: ListBaseParams): Promise<{ items: InventoryListRow[]; total: number }> {
    const warehouseId = params.warehouse_id && params.warehouse_id !== "All" ? params.warehouse_id : "all";
    const query = buildQuery({
      page: String(params.page),
      page_size: String(params.page_size),
      search: params.search || "",
      ordering: params.ordering || "",
      warehouse_id: warehouseId,
    });
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.WAREHOUSE.STOCK_OVERVIEW.INVENTORY_LIST}?${query}`,
      {
        warehouse_id: warehouseId,
        filters: buildStockOverviewFilters(params.filters),
      },
      { signal: params.signal },
    );
    return parseListResponse<InventoryListRow>(response.data as Record<string, unknown>);
  },

  async listRejected(params: ListBaseParams): Promise<{ items: RejectedListRow[]; total: number }> {
    const warehouseId = params.warehouse_id && params.warehouse_id !== "All" ? params.warehouse_id : "all";
    const query = buildQuery({
      page: String(params.page),
      page_size: String(params.page_size),
      search: params.search || "",
      ordering: params.ordering || "",
      warehouse_id: warehouseId,
    });
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.WAREHOUSE.STOCK_OVERVIEW.REJECTED_LIST}?${query}`,
      {
        warehouse_id: warehouseId,
        filters: buildStockOverviewFilters(params.filters),
      },
      { signal: params.signal },
    );
    return parseListResponse<RejectedListRow>(response.data as Record<string, unknown>);
  },

  async listSalesReturn(params: ListBaseParams): Promise<{ items: ReturnStockListRow[]; total: number }> {
    const warehouseId = params.warehouse_id && params.warehouse_id !== "All" ? params.warehouse_id : "all";
    const query = buildQuery({
      page: String(params.page),
      page_size: String(params.page_size),
      search: params.search || "",
      ordering: params.ordering || "",
      warehouse_id: warehouseId,
    });
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.WAREHOUSE.STOCK_OVERVIEW.SALES_RETURN_LIST}?${query}`,
      {
        warehouse_id: warehouseId,
        filters: buildStockOverviewFilters(params.filters),
      },
      { signal: params.signal },
    );
    return parseListResponse<ReturnStockListRow>(response.data as Record<string, unknown>);
  },

  async listSampleReturn(params: ListBaseParams): Promise<{ items: ReturnStockListRow[]; total: number }> {
    const warehouseId = params.warehouse_id && params.warehouse_id !== "All" ? params.warehouse_id : "all";
    const query = buildQuery({
      page: String(params.page),
      page_size: String(params.page_size),
      search: params.search || "",
      ordering: params.ordering || "",
      warehouse_id: warehouseId,
    });
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.WAREHOUSE.STOCK_OVERVIEW.SAMPLE_RETURN_LIST}?${query}`,
      {
        warehouse_id: warehouseId,
        filters: buildStockOverviewFilters(params.filters),
      },
      { signal: params.signal },
    );
    return parseListResponse<ReturnStockListRow>(response.data as Record<string, unknown>);
  },

  async getInventoryDetails(id: string, signal?: AbortSignal): Promise<InventoryDetails> {
    const response = await axiosInstance.get(
      API_ENDPOINTS.WAREHOUSE.STOCK_OVERVIEW.INVENTORY_DETAILS(id),
      { signal },
    );
    const payload = response.data as Record<string, unknown>;
    const data = (payload.data ?? {}) as Record<string, unknown>;
    const product = (data.product ?? {}) as Record<string, unknown>;
    const warehouse = (data.warehouse ?? {}) as Record<string, unknown>;

    return {
      id: asString(data.id),
      product: {
        product_name: asString(product.product_name),
        product_code: asString(product.product_code),
        sku: product.sku == null ? null : asString(product.sku),
      },
      warehouse: {
        warehouse_name: asString(warehouse.warehouse_name),
        warehouse_code: asString(warehouse.warehouse_code ?? warehouse.warehouse_id),
      },
      batch_no: asString(data.batch_no),
      status: asString(data.status),
      available_qty: toNumber(data.available_qty),
      reserved_qty: toNumber(data.reserved_qty),
      manufacture_date: data.manufacture_date
        ? asString(data.manufacture_date).slice(0, 10)
        : null,
      expiry_date: data.expiry_date ? asString(data.expiry_date).slice(0, 10) : null,
      created_at: data.created_at ? asString(data.created_at) : null,
      updated_at: data.updated_at ? asString(data.updated_at) : null,
      created_by: asDisplayName(data.created_by_user) || null,
      updated_by: asDisplayName(data.updated_by_user) || null,
    };
  },

  async getRejectedDetails(id: string, signal?: AbortSignal): Promise<RejectedDetails> {
    const response = await axiosInstance.get(
      API_ENDPOINTS.WAREHOUSE.STOCK_OVERVIEW.REJECTED_DETAILS(id),
      { signal },
    );
    const payload = response.data as Record<string, unknown>;
    const data = (payload.data ?? {}) as Record<string, unknown>;
    const product = (data.product ?? {}) as Record<string, unknown>;
    const warehouse = (data.warehouse ?? {}) as Record<string, unknown>;

    return {
      id: asString(data.id),
      product: {
        product_name: asString(product.product_name),
        product_code: asString(product.product_code),
      },
      warehouse: {
        warehouse_name: asString(warehouse.warehouse_name),
        warehouse_code: asString(warehouse.warehouse_code ?? warehouse.warehouse_id),
      },
      batch_no: asString(data.batch_no),
      rejected_qty: toNumber(data.rejected_qty),
      reject_reason: asString(data.reject_reason) || "—",
      status: asString(data.status),
      qc_number: asString(data.qc_number) || "—",
      inspection_date: data.inspection_date
        ? asString(data.inspection_date).slice(0, 10)
        : null,
    };
  },

  async listDailyLog(params: DailyLogListParams): Promise<{
    items: DailyLogListRow[];
    total: number;
    summary: DailyLogSummary;
  }> {
    const warehouseId = params.warehouse_id && params.warehouse_id !== "All" ? params.warehouse_id : "all";
    const productId = params.product_id && params.product_id !== "all" ? params.product_id : "all";
    const query = buildQuery({
      page: String(params.page),
      page_size: String(params.page_size),
      search: params.search || "",
      ordering: params.ordering || "",
      warehouse_id: warehouseId,
      product_id: productId,
      period: params.period || "",
      from_date: params.from_date || "",
      to_date: params.to_date || "",
    });
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.WAREHOUSE.STOCK_OVERVIEW.DAILY_LOG_LIST}?${query}`,
      {
        warehouse_id: warehouseId,
        product_id: productId,
        filters: buildStockOverviewFilters(params.filters),
      },
      { signal: params.signal },
    );
    const payload = response.data as Record<string, unknown>;
    const { items, total } = parseListResponse<DailyLogListRow>(payload);
    const summaryRaw = (payload.summary ?? {}) as Record<string, unknown>;
    return {
      items,
      total,
      summary: {
        openingStockQty: toNumber(summaryRaw.openingStockQty),
        dayInQty: toNumber(summaryRaw.dayInQty),
        dayOutQty: toNumber(summaryRaw.dayOutQty),
        closingStockQty: toNumber(summaryRaw.closingStockQty),
        closingStockValue: toNumber(summaryRaw.closingStockValue),
      },
    };
  },

  async dailyLogSummary(params: DailyLogFilterParams): Promise<DailyLogSummary> {
    const warehouseId = params.warehouse_id && params.warehouse_id !== "All" ? params.warehouse_id : "all";
    const productId = params.product_id && params.product_id !== "all" ? params.product_id : "all";
    const query = buildQuery({
      search: params.search || "",
      ordering: params.ordering || "",
      warehouse_id: warehouseId,
      product_id: productId,
      period: params.period || "",
      from_date: params.from_date || "",
      to_date: params.to_date || "",
    });
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.WAREHOUSE.STOCK_OVERVIEW.DAILY_LOG_SUMMARY}?${query}`,
      {
        warehouse_id: warehouseId,
        product_id: productId,
        filters: buildStockOverviewFilters(params.filters),
      },
      { signal: params.signal },
    );
    const payload = response.data as Record<string, unknown>;
    const data = (payload.data ?? payload.summary ?? {}) as Record<string, unknown>;
    return {
      openingStockQty: toNumber(data.openingStockQty),
      dayInQty: toNumber(data.dayInQty),
      dayOutQty: toNumber(data.dayOutQty),
      closingStockQty: toNumber(data.closingStockQty),
      closingStockValue: toNumber(data.closingStockValue),
    };
  },

  async exportDailyLog(params: Omit<DailyLogListParams, "page" | "page_size" | "signal">): Promise<void> {
    const warehouseId = params.warehouse_id && params.warehouse_id !== "All" ? params.warehouse_id : "all";
    const productId = params.product_id && params.product_id !== "all" ? params.product_id : "all";
    const query = buildQuery({
      search: params.search || "",
      ordering: params.ordering || "",
      warehouse_id: warehouseId,
      product_id: productId,
      period: params.period || "",
      from_date: params.from_date || "",
      to_date: params.to_date || "",
    });
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.WAREHOUSE.STOCK_OVERVIEW.DAILY_LOG_EXPORT}?${query}`,
      {
        warehouse_id: warehouseId,
        product_id: productId,
        filters: buildStockOverviewFilters(params.filters),
      },
      { responseType: "blob" },
    );
    const blob = response.data as Blob;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const disposition = String(response.headers?.["content-disposition"] || "");
    link.download = parseFilenameFromDisposition(disposition, "daily_log.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
