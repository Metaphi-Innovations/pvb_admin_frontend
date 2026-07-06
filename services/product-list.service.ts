import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";

// ---------------------------------------------------------------------------
// Parameter / payload types
// ---------------------------------------------------------------------------

export interface ProductListParams {
  page: number;
  pageSize: number;
  search: string;
  ordering?: string;
  status: "all" | "active" | "inactive";
  apiFilters?: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface ProductExportParams {
  search: string;
  status: "all" | "active" | "inactive";
  ordering?: string;
  apiFilters?: Record<string, unknown>;
}

export interface ProductCreatePayload {
  product_name: string;
  description?: string | null;
  [key: string]: unknown;
}

export interface ProductUpdatePayload {
  product_name?: string;
  description?: string | null;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Response shape (list / detail record)
// ---------------------------------------------------------------------------

export interface ProductListRecord {
  id: number;
  productUuid: string;
  productCode: string;
  productName: string;
  sku: string;
  supplierCode: string;
  supplier: string;
  hsnCode: string;
  category: string;
  subCategory: string;
  segment: string;
  packSize: number | null;
  baseUnit: string;
  mrp: number | null;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface ProductListResult {
  items: ProductListRecord[];
  total: number;
}

// ---------------------------------------------------------------------------
// Sort-key → API ordering field map
// ---------------------------------------------------------------------------

const SORT_KEY_TO_ORDERING: Record<string, string> = {
  productCode: "productCode",
  productName: "productName",
  sku: "sku",
  supplierCode: "supplierCode",
  supplier: "supplier",
  hsnCode: "hsnCode",
  category: "category",
  packSize: "packSize",
  baseUnit: "baseUnit",
  mrp: "mrp",
  status: "isActive",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
};

const SORT_FIELD_MAP: Record<string, string> = {
  productCode: "product_code",
  productName: "product_name",
  sku: "sku",
  supplierCode: "supplier_code",
  supplier: "supplier__supplier_name",
  hsnCode: "hsn_id",
  category: "category__categoryName",
  packSize: "pack_size",
  baseUnit: "unit",
  mrp: "mrp",
  status: "status",
};

const FILTER_FIELD_MAP: Record<string, string> = {
  productCode: "product_code",
  hsnCode: "hsn_id",
};

export function sortStateToOrdering(
  key: string,
  direction: "asc" | "desc" | "none",
): string {
  if (!key || direction === "none") return "";
  const field = SORT_FIELD_MAP[key];
  if (!field) return "";
  return direction === "desc" ? `-${field}` : field;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function asString(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "");
}

function toStatus(value: unknown): "active" | "inactive" {
  return value === true ? "active" : "inactive";
}

function toDisplayName(user: unknown): string {
  if (!user || typeof user !== "object") return "";
  const record = user as Record<string, unknown>;
  const username = asString(record.username).trim();
  if (username) return username;
  const first = asString(record.first_name).trim();
  const last = asString(record.last_name).trim();
  return `${first} ${last}`.trim();
}

function formatDate(value: unknown): string {
  const raw = asString(value);
  return raw ? raw.slice(0, 10) : "";
}

function toNullableNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function mapItem(
  raw: Record<string, unknown>,
  fallbackIndex: number,
): ProductListRecord {
  const srNo = Number(raw.sr_no);
  return {
    id: Number.isFinite(srNo) && srNo > 0 ? srNo : fallbackIndex + 1,
    productUuid: asString(raw.product_id),
    productCode: asString(raw.product_code),
    productName: asString(raw.product_name),
    sku: asString(raw.sku),
    supplierCode: asString(raw.supplier_code),
    supplier: asString(raw.supplier_name ?? raw.supplier),
    hsnCode: asString(raw.hsn_code),
    category: asString(raw.category_name ?? raw.category),
    subCategory: asString(raw.sub_category_name ?? raw.sub_category),
    segment: asString(raw.segment_name ?? raw.segment),
    packSize: toNullableNumber(raw.pack_size),
    baseUnit: asString(raw.base_unit),
    mrp: toNullableNumber(raw.mrp),
    status: toStatus(raw.is_active),
    createdAt: formatDate(raw.created_at),
    updatedAt: formatDate(raw.updated_at),
    createdBy: toDisplayName(raw.created_by_user),
    updatedBy: toDisplayName(raw.updated_by_user),
  };
}

function mapDetail(raw: Record<string, unknown>): ProductListRecord {
  const srNo = Number(raw.sr_no);
  return {
    id: Number.isFinite(srNo) && srNo > 0 ? srNo : 0,
    productUuid: asString(raw.product_id),
    productCode: asString(raw.product_code),
    productName: asString(raw.product_name),
    sku: asString(raw.sku),
    supplierCode: asString(raw.supplier_code),
    supplier: asString(raw.supplier_name ?? raw.supplier),
    hsnCode: asString(raw.hsn_code),
    category: asString(raw.category_name ?? raw.category),
    subCategory: asString(raw.sub_category_name ?? raw.sub_category),
    segment: asString(raw.segment_name ?? raw.segment),
    packSize: toNullableNumber(raw.pack_size),
    baseUnit: asString(raw.base_unit),
    mrp: toNullableNumber(raw.mrp),
    status: toStatus(raw.is_active),
    createdAt: formatDate(raw.created_at),
    updatedAt: formatDate(raw.updated_at),
    createdBy: toDisplayName(raw.created_by_user),
    updatedBy: toDisplayName(raw.updated_by_user),
  };
}

function extractErrorMessage(error: unknown, fallback: string): string {
  const err = error as {
    response?: { data?: { message?: string; error?: string } };
    message?: string;
  };
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallback
  );
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const ProductListService = {
  async list(params: ProductListParams): Promise<ProductListResult> {
    const ordering = encodeURIComponent(params.ordering ?? "");

    const response = await axiosInstance.post(
      `${API_ENDPOINTS.MASTER.PRODUCT.LIST}?page=${params.page}&limit=${params.pageSize}&search=${encodeURIComponent(params.search)}&ordering=${ordering}`,
      { filters: params.apiFilters ?? {} },
      { signal: params.signal },
    );

    const payload = response.data as Record<string, unknown>;
    const data = payload.data;

    if (!Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an array.");
    }

    const items = data.map((row, idx) =>
      mapItem((row ?? {}) as Record<string, unknown>, idx),
    );

    const totalRecords = Number(payload.totalRecords ?? payload.count);
    const total = Number.isFinite(totalRecords) ? totalRecords : items.length;

    return { items, total };
  },

  async view(id: string): Promise<ProductListRecord> {
    const response = await axiosInstance.get(
      API_ENDPOINTS.MASTER.PRODUCT.VIEW(id),
    );
    const payload = response.data as Record<string, unknown>;
    const data = payload.data;

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an object.");
    }

    return mapDetail(data as Record<string, unknown>);
  },

  async previewNumber(): Promise<string> {
    const response = await axiosInstance.get(
      API_ENDPOINTS.MASTER.PRODUCT.PREVIEW_NUMBER,
    );
    const payload = response.data as Record<string, unknown>;
    const data = payload.data as Record<string, unknown> | undefined;
    return asString(data?.product_code);
  },

  async create(payload: ProductCreatePayload): Promise<void> {
    const response = await axiosInstance.post(
      API_ENDPOINTS.MASTER.PRODUCT.CREATE,
      payload,
    );

    const body = response.data as Record<string, unknown>;
    if (!body.success) {
      throw new Error(asString(body.message) || "Failed to create product.");
    }
  },

  async update(id: string, payload: ProductUpdatePayload): Promise<void> {
    const response = await axiosInstance.put(
      API_ENDPOINTS.MASTER.PRODUCT.UPDATE(id),
      payload,
    );

    const body = response.data as Record<string, unknown>;
    if (!body.success) {
      throw new Error(asString(body.message) || "Failed to update product.");
    }
  },

  async updateStatus(id: string, isActive: boolean): Promise<void> {
    const response = await axiosInstance.patch(
      API_ENDPOINTS.MASTER.PRODUCT.STATUS_UPDATE(id),
      { is_active: isActive },
    );

    const body = response.data as Record<string, unknown>;
    if (!body.success) {
      throw new Error(
        asString(body.message) || "Failed to update product status.",
      );
    }
  },

  async export(params: ProductExportParams): Promise<void> {
    const ordering = encodeURIComponent(params.ordering ?? "");

    const response = await axiosInstance.post(
      `${API_ENDPOINTS.MASTER.PRODUCT.EXPORT}?search=${encodeURIComponent(params.search)}&ordering=${ordering}`,
      { filters: params.apiFilters ?? {} },
      { responseType: "blob" },
    );

    const blob = response.data as Blob;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `products_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  extractErrorMessage,
};
