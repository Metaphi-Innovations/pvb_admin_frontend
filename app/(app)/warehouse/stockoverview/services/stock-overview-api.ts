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
  /** Qty on lots past expiry (excluded from available_qty). */
  expired_qty: number;
  cp: string;
  stock_value: string;
  /** Packing meta for stacked Available Qty (Case / Unit · Kg|Ltr). */
  unit_per_packing?: number | null;
  quantity_type?: string | null;
  pack_size?: number | null;
  net_weight?: number | null;
  unit?: string | null;
};

export type RejectedListRow = {
  id: string;
  product_name: string;
  sku: string;
  uom: string;
  warehouse_name: string;
  batch_no: string;
  rejected_qty: number;
  reject_reason: string;
  reject_type?: string;
  qc_number: string;
  inspection_date: string | null;
  status: string;
  lifecycle_status?: string;
  source_status?: string;
  source_type?: string;
  /** Packing meta for stacked Rejected Qty (same as Inventory / Returns). */
  unit_per_packing?: number | null;
  quantity_type?: string | null;
  pack_size?: number | null;
  net_weight?: number | null;
  unit?: string | null;
};

export type ReturnStockListRow = {
  id: string;
  product_name: string;
  sku: string;
  uom: string;
  /** Original accepted qty into sellable (base_qty). */
  received_qty: number;
  available_qty: number;
  /** Packed case rows with available > 0 (CASE lots only). */
  available_cases?: number | null;
  reserved_qty: number;
  cp: string;
  stock_value: string;
  warehouse_name: string;
  warehouse_id?: string;
  product_id?: string;
  batch_no: string;
  manufacture_date?: string | null;
  expiry_date: string | null;
  /** Return document reference */
  return_no: string;
  customer_name: string;
  return_date: string | null;
  status: string;
  lifecycle_status?: string;
  source_status?: string;
  source_type?: string;
  /** Packing meta for stacked Available Qty (same as Inventory). */
  unit_per_packing?: number | null;
  quantity_type?: string | null;
  pack_size?: number | null;
  net_weight?: number | null;
  unit?: string | null;
};

export type MoveToRejectedPayload = {
  sellable_item_id?: string;
  product_id?: string;
  warehouse_id?: string;
  batch_no?: string;
  expiry_date?: string | null;
  /** Base/unit qty for PIECE lots. */
  qty?: number;
  /** Whole case count for CASE lots. */
  cases?: number;
  reject_reason?: string;
};

export type MoveToRejectedResult = {
  rejected_id: string;
  reject_type: string;
  qty: number;
  cases?: number | null;
  batch_no: string;
  product_name: string;
  warehouse_name: string;
  document_no: string;
};

export type DailyLogListRow = {
  id: string;
  product_code: string;
  product_name: string;
  hsn: string;
  scientific_name: string;
  opening_qty: number;
  day_in: number | string;
  day_out: number | string;
  closing_qty: number;
  batch_no: string;
  manufacture_date: string | null;
  expiry_date: string | null;
  warehouse_name: string;
  cp: number;
  valuation: number;
  status: string;
  lifecycle_status?: string;
  unit_per_packing?: number | null;
  quantity_type?: string | null;
  pack_size?: number | null;
  net_weight?: number | null;
  unit?: string | null;
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

export type InventoryBatchBreakdownRow = {
  sku: string;
  warehouse_id: string;
  warehouse_name: string;
  batch_no: string;
  manufacture_date: string | null;
  expiry_date: string | null;
  received_qty: number;
  available_qty: number;
  near_expiry_qty: number;
  expired_qty: number;
  /** Packed case rows with remaining available (CASE lots only). */
  available_cases?: number | null;
  quantity_type?: string | null;
  status: "Available" | "Near Expiry" | "Expired" | string;
  /** @deprecated use status */
  condition?: string;
};

/** Product-level inventory view (Inventory tab). Present when `batches` is set. */
export type InventoryProductDetails = {
  id: string;
  product: {
    product_name: string;
    product_code: string;
    sku: string | null;
    uom?: string;
  };
  warehouse: {
    warehouse_name: string;
    warehouse_code: string;
  };
  available_qty: number;
  fresh_available_qty: number;
  near_expiry_qty: number;
  expired_qty: number;
  cp: string;
  stock_value: string;
  near_expiry_days: number;
  unit_per_packing?: number | null;
  quantity_type?: string | null;
  pack_size?: number | null;
  net_weight?: number | null;
  unit?: string | null;
  batches: InventoryBatchBreakdownRow[];
};

/** Legacy single-batch detail (Sales/Sample Return view links). */
export type InventoryDetails = {
  id: string;
  product: {
    product_name: string;
    product_code: string;
    sku: string | null;
    uom?: string;
  };
  warehouse: {
    warehouse_name: string;
    warehouse_code: string;
  };
  batch_no: string;
  status: string;
  lifecycle_status?: string;
  source_status?: string;
  source_type?: string;
  available_qty: number;
  reserved_qty: number;
  manufacture_date: string | null;
  expiry_date: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  /** Set for product breakdown responses. */
  batches?: InventoryBatchBreakdownRow[];
  fresh_available_qty?: number;
  near_expiry_qty?: number;
  expired_qty?: number;
  cp?: string;
  stock_value?: string;
  near_expiry_days?: number;
  unit_per_packing?: number | null;
  quantity_type?: string | null;
  pack_size?: number | null;
  net_weight?: number | null;
  unit?: string | null;
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
  reject_reason: string | null;
  reject_type?: string;
  status: string;
  lifecycle_status?: string;
  source_status?: string;
  source_type?: string;
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

async function downloadCsvBlob(
  response: { data: Blob; headers?: { [key: string]: unknown } },
  fallback: string,
): Promise<void> {
  const blob = response.data;
  const contentType = String(blob.type || response.headers?.["content-type"] || "");
  if (contentType.includes("application/json")) {
    const text = await blob.text();
    let message = "Export failed.";
    try {
      const json = JSON.parse(text) as { message?: string };
      if (json.message) message = json.message;
    } catch {
      /* ignore parse errors */
    }
    throw new Error(message);
  }

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const disposition = String(response.headers?.["content-disposition"] || "");
  link.download = parseFilenameFromDisposition(disposition, fallback);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function listExportQuery(params: {
  search?: string;
  ordering?: string;
  warehouse_id?: string;
}): { warehouseId: string; query: string } {
  const warehouseId = params.warehouse_id && params.warehouse_id !== "All" ? params.warehouse_id : "all";
  return {
    warehouseId,
    query: buildQuery({
      search: params.search || "",
      ordering: params.ordering || "",
      warehouse_id: warehouseId,
    }),
  };
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
    else if (key === "source_status" || key === "sourceStatus") mapped.source_status = value;
    else if (key === "reject_type" || key === "rejectType") mapped.reject_type = value;
    else if (key === "source_type" || key === "sourceType") mapped.source_type = value;
    else if (key === "product_code" || key === "productCode") mapped.product_code = value;
    else if (key === "sku") mapped.sku = value;
    else if (key === "uom" || key === "unit") mapped.uom = value;
    else if (key === "hsn") mapped.hsn = value;
    else if (key === "scientific_name" || key === "scientificName") mapped.scientific_name = value;
    else if (key === "category") mapped.category = value;
    else if (key === "customer" || key === "customer_name") mapped.customer_name = value;
    else if (key === "return_no" || key === "returnNo" || key === "salesReturnNo" || key === "sampleReturnNo") {
      mapped.return_no = value;
    }
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
    productName: "product_name",
    productCode: "product_code",
    product_code: "product_code",
    sku: "sku",
    uom: "uom",
    availableQuantity: "available_qty",
    availableQty: "available_qty",
    available_qty: "available_qty",
    received_qty: "received_qty",
    receivedQty: "received_qty",
    expired_qty: "expired_qty",
    expiredQty: "expired_qty",
    reservedQuantity: "reserved_qty",
    reserved_qty: "reserved_qty",
    costPrice: "cp",
    cp: "cp",
    stockValue: "stock_value",
    stock_value: "stock_value",
    stockValuation: "valuation",
    valuation: "valuation",
    warehouse: "warehouse_name",
    warehouse_name: "warehouse_name",
    batchNumber: "batch_no",
    batch_no: "batch_no",
    status: "status",
    source_status: "source_status",
    sourceStatus: "source_status",
    reject_type: "reject_type",
    rejectType: "reject_type",
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
    mfgDate: "manufacture_date",
    manufacture_date: "manufacture_date",
    hsn: "hsn",
    scientificName: "scientific_name",
    scientific_name: "scientific_name",
    openingQty: "opening_qty",
    opening_qty: "opening_qty",
    dayIn: "day_in",
    day_in: "day_in",
    dayOut: "day_out",
    day_out: "day_out",
    closingQty: "closing_qty",
    closing_qty: "closing_qty",
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

  async moveToRejected(payload: MoveToRejectedPayload): Promise<MoveToRejectedResult> {
    const body: Record<string, unknown> = {};
    if (payload.reject_reason) body.reject_reason = payload.reject_reason;
    if (payload.cases != null) body.cases = payload.cases;
    if (payload.qty != null) body.qty = payload.qty;
    if (payload.sellable_item_id) {
      body.sellable_item_id = payload.sellable_item_id;
    } else {
      body.product_id = payload.product_id;
      body.warehouse_id = payload.warehouse_id;
      body.batch_no = payload.batch_no;
      if (payload.expiry_date !== undefined) body.expiry_date = payload.expiry_date;
    }

    const response = await axiosInstance.post(
      API_ENDPOINTS.WAREHOUSE.STOCK_OVERVIEW.MOVE_TO_REJECTED,
      body,
    );
    const data = ((response.data as Record<string, unknown>)?.data ?? {}) as Record<string, unknown>;
    return {
      rejected_id: asString(data.rejected_id),
      reject_type: asString(data.reject_type),
      qty: toNumber(data.qty),
      cases: data.cases != null ? toNumber(data.cases) : null,
      batch_no: asString(data.batch_no),
      product_name: asString(data.product_name),
      warehouse_name: asString(data.warehouse_name),
      document_no: asString(data.document_no),
    };
  },

  async getInventoryDetails(
    id: string,
    signalOrOpts?: AbortSignal | { signal?: AbortSignal; warehouse_id?: string },
  ): Promise<InventoryDetails> {
    const opts =
      signalOrOpts && typeof signalOrOpts === "object" && "aborted" in signalOrOpts
        ? { signal: signalOrOpts as AbortSignal }
        : (signalOrOpts as { signal?: AbortSignal; warehouse_id?: string } | undefined);

    const qs = new URLSearchParams();
    if (opts?.warehouse_id) qs.set("warehouse_id", opts.warehouse_id);
    const query = qs.toString();
    const url = query
      ? `${API_ENDPOINTS.WAREHOUSE.STOCK_OVERVIEW.INVENTORY_DETAILS(id)}?${query}`
      : API_ENDPOINTS.WAREHOUSE.STOCK_OVERVIEW.INVENTORY_DETAILS(id);

    const response = await axiosInstance.get(url, { signal: opts?.signal });
    const payload = response.data as Record<string, unknown>;
    const data = (payload.data ?? {}) as Record<string, unknown>;
    const product = (data.product ?? {}) as Record<string, unknown>;
    const warehouse = (data.warehouse ?? {}) as Record<string, unknown>;

    const rawBatches = Array.isArray(data.batches) ? data.batches : null;
    const batches: InventoryBatchBreakdownRow[] | undefined = rawBatches
      ? rawBatches.map((row) => {
          const r = row as Record<string, unknown>;
          const status =
            asString(r.status) || asString(r.condition) || "Available";
          return {
            sku: asString(r.sku) || asString(product.sku) || "—",
            warehouse_id: asString(r.warehouse_id),
            warehouse_name: asString(r.warehouse_name),
            batch_no: asString(r.batch_no),
            manufacture_date: r.manufacture_date
              ? asString(r.manufacture_date).slice(0, 10)
              : null,
            expiry_date: r.expiry_date ? asString(r.expiry_date).slice(0, 10) : null,
            received_qty: toNumber(r.received_qty),
            available_qty: toNumber(r.available_qty),
            near_expiry_qty: toNumber(r.near_expiry_qty),
            expired_qty: toNumber(r.expired_qty),
            available_cases:
              r.available_cases != null && r.available_cases !== ""
                ? toNumber(r.available_cases)
                : null,
            quantity_type: r.quantity_type != null ? asString(r.quantity_type) : null,
            status,
            condition: status,
          };
        })
      : undefined;

    return {
      id: asString(data.id),
      product: {
        product_name: asString(product.product_name),
        product_code: asString(product.product_code),
        sku: product.sku == null ? null : asString(product.sku),
        uom: product.uom != null ? asString(product.uom) : undefined,
      },
      warehouse: {
        warehouse_name: asString(warehouse.warehouse_name),
        warehouse_code: asString(warehouse.warehouse_code ?? warehouse.warehouse_id),
      },
      batch_no: asString(data.batch_no),
      status: asString(data.status),
      lifecycle_status: data.lifecycle_status ? asString(data.lifecycle_status) : asString(data.status),
      source_status: data.source_status ? asString(data.source_status) : undefined,
      source_type: data.source_type ? asString(data.source_type) : undefined,
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
      batches,
      fresh_available_qty:
        data.fresh_available_qty != null ? toNumber(data.fresh_available_qty) : undefined,
      near_expiry_qty: data.near_expiry_qty != null ? toNumber(data.near_expiry_qty) : undefined,
      expired_qty: data.expired_qty != null ? toNumber(data.expired_qty) : undefined,
      cp: data.cp != null ? asString(data.cp) : undefined,
      stock_value: data.stock_value != null ? asString(data.stock_value) : undefined,
      near_expiry_days:
        data.near_expiry_days != null ? toNumber(data.near_expiry_days) : undefined,
      unit_per_packing:
        data.unit_per_packing != null ? toNumber(data.unit_per_packing) : null,
      quantity_type: data.quantity_type != null ? asString(data.quantity_type) : null,
      pack_size: data.pack_size != null ? toNumber(data.pack_size) : null,
      net_weight: data.net_weight != null ? toNumber(data.net_weight) : null,
      unit: data.unit != null ? asString(data.unit) : null,
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
      reject_type: data.reject_type ? asString(data.reject_type) : "—",
      status: asString(data.status),
      lifecycle_status: data.lifecycle_status ? asString(data.lifecycle_status) : asString(data.status),
      source_status: data.source_status ? asString(data.source_status) : undefined,
      source_type: data.source_type ? asString(data.source_type) : undefined,
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
      { responseType: "blob", timeout: 120000 },
    );
    await downloadCsvBlob(response, "daily_log.csv");
  },

  async exportInventory(params: Omit<ListBaseParams, "page" | "page_size" | "signal">): Promise<void> {
    const { warehouseId, query } = listExportQuery(params);
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.WAREHOUSE.STOCK_OVERVIEW.INVENTORY_EXPORT}?${query}`,
      {
        warehouse_id: warehouseId,
        filters: buildStockOverviewFilters(params.filters),
      },
      { responseType: "blob", timeout: 120000 },
    );
    await downloadCsvBlob(response, "inventory_stock.csv");
  },

  async exportRejected(params: Omit<ListBaseParams, "page" | "page_size" | "signal">): Promise<void> {
    const { warehouseId, query } = listExportQuery(params);
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.WAREHOUSE.STOCK_OVERVIEW.REJECTED_EXPORT}?${query}`,
      {
        warehouse_id: warehouseId,
        filters: buildStockOverviewFilters(params.filters),
      },
      { responseType: "blob", timeout: 120000 },
    );
    await downloadCsvBlob(response, "rejected_inventory.csv");
  },

  async exportSalesReturn(params: Omit<ListBaseParams, "page" | "page_size" | "signal">): Promise<void> {
    const { warehouseId, query } = listExportQuery(params);
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.WAREHOUSE.STOCK_OVERVIEW.SALES_RETURN_EXPORT}?${query}`,
      {
        warehouse_id: warehouseId,
        filters: buildStockOverviewFilters(params.filters),
      },
      { responseType: "blob", timeout: 120000 },
    );
    await downloadCsvBlob(response, "sales_return_stock.csv");
  },

  async exportSampleReturn(params: Omit<ListBaseParams, "page" | "page_size" | "signal">): Promise<void> {
    const { warehouseId, query } = listExportQuery(params);
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.WAREHOUSE.STOCK_OVERVIEW.SAMPLE_RETURN_EXPORT}?${query}`,
      {
        warehouse_id: warehouseId,
        filters: buildStockOverviewFilters(params.filters),
      },
      { responseType: "blob", timeout: 120000 },
    );
    await downloadCsvBlob(response, "sample_return_stock.csv");
  },
};
