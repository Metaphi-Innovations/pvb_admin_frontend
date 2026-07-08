import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import { ApiProductAsset } from "@/app/(app)/masters/products/product-data";

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
export interface ProductAsset {
  id?: string;
  assetType: "LINK" | "IMAGE" | string;
  linkUrl?: string;
  imageUrl?: string;
}

export interface ProductImageAsset {
  id?: string;
  imageUrl: string;
}


export interface ProductListRecord {
  id: number;
  productUuid: string;
  productCode: string;
  productName: string;
  sku: string;
  supplierCode: string;
  supplier: string;
  /** UUID of the supplier (for dropdown re-selection on edit) */
  supplierId?: string;
  hsnCode: string;
  /** UUID of the HSN record */
  hsnUuid?: string;
  category: string;
  /** UUID of the category */
  categoryId?: string;
  subCategory: string;
  segment: string;
  /** UUID of the segment */
  segmentId?: string;
  packSize: number | null;
  baseUnit: string;
  mrp: number | null;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  scientificName?: string;
  form?: string;
  formId?: string;
  cfu?: string;
  cfuId?: string;
  authority?: string;
  packagingUnit?: string;
  unitPerCase?: number | null;
  mou?: string;
  grossWeight?: number | null;
  netWeight?: number | null;
  gstRate?: string;
  hsnId?: number | null;
  gstId?: number | null;
  gstUuid?: string;
  assets?: ApiProductAsset[];
  productImages?: ProductImageAsset[];
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

export function mapAssets(raw: unknown): ApiProductAsset[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const a = (item ?? {}) as Record<string, unknown>;
    return {
      product_asset_id: asString(a.id),
      asset_type: asString(a.asset_type) as "MEDIA" | "LINK",
      link_url: asString(a.link_url),
      file_url: asString(a.file_url),
      file_name: asString(a.file_name),
      file_size: asString(a.file_size),
      status: asString(a.status),
    };
  });
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function asString(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "");
}

function toStatus(value: unknown, fallbackValue?: unknown): "active" | "inactive" {
  const primaryVal = value !== undefined && value !== null ? value : fallbackValue;
  const str = String(primaryVal).trim().toLowerCase();
  return str === "active" || str === "true" || primaryVal === true ? "active" : "inactive";
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

/** Safely reads a name string from a field that may be a plain string or a nested object. */
function readNestedName(primary: unknown, ...fallbacks: unknown[]): string {
  if (primary && typeof primary === "object" && !Array.isArray(primary)) {
    const obj = primary as Record<string, unknown>;
    // Try common name keys
    for (const key of ["categoryName", "segment_name", "formulation_name", "cfu_name",
      "supplier_name", "name", "title"]) {
      if (obj[key]) return asString(obj[key]);
    }
    return "";
  }
  if (primary !== null && primary !== undefined && primary !== "") return asString(primary);
  for (const fb of fallbacks) {
    if (fb && typeof fb !== "object") return asString(fb);
  }
  return "";
}

/** Safely reads a UUID from a nested object or a flat id field. */
function readNestedId(nested: unknown, flatId: unknown, ...idKeys: string[]): string {
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    const obj = nested as Record<string, unknown>;
    for (const key of ["id", "category_id", "segment_id", "formulation_id", "cfu_id",
      "supplier_id", "hsn_id", "gst_id", ...idKeys]) {
      if (obj[key]) return asString(obj[key]);
    }
  }
  return asString(flatId);
}

function mapItem(
  raw: Record<string, unknown>,
  fallbackIndex: number,
): ProductListRecord {
  const srNo = Number(raw.sr_no);
  const categoryObj = raw.category as Record<string, unknown> | null | undefined;
  const segmentObj = raw.segment as Record<string, unknown> | null | undefined;
  const supplierObj = raw.supplier as Record<string, unknown> | null | undefined;
  const formulationObj = raw.formulation as Record<string, unknown> | null | undefined;
  const cfuObj = raw.cfu as Record<string, unknown> | null | undefined;
  const hsnObj = raw.hsn as Record<string, unknown> | null | undefined;
  const gstObj = raw.gst_rate as Record<string, unknown> | null | undefined;
  return {
    id: Number.isFinite(srNo) && srNo > 0 ? srNo : fallbackIndex + 1,
    productUuid: asString(raw.product_id),
    productCode: asString(raw.product_code),
    productName: asString(raw.product_name),
    sku: asString(raw.sku),
    supplierCode: asString(raw.supplier_code),
    supplier: readNestedName(supplierObj?.supplier_name ?? supplierObj, raw.supplier_name),
    supplierId: readNestedId(supplierObj, raw.supplier_id),
    hsnCode: asString(raw.hsn_code) || asString(hsnObj?.hsnCode),
    hsnUuid: readNestedId(hsnObj, raw.hsn_id),
    category: readNestedName(categoryObj?.categoryName ?? categoryObj, raw.category_name),
    categoryId: readNestedId(categoryObj, raw.category_id),
    subCategory: asString(raw.sub_category_name ?? raw.sub_category),
    segment: readNestedName(segmentObj?.segment_name ?? segmentObj, raw.segment_name),
    segmentId: readNestedId(segmentObj, raw.segment_id, "segment_id"),
    packSize: toNullableNumber(raw.pack_size),
    baseUnit: asString(raw.base_unit ?? raw.unit),
    mrp: toNullableNumber(raw.mrp),
    status: toStatus(raw.status, raw.is_active),
    createdAt: formatDate(raw.created_at),
    updatedAt: formatDate(raw.updated_at),
    createdBy: toDisplayName(raw.created_by_user),
    updatedBy: toDisplayName(raw.updated_by_user),
    scientificName: asString(raw.scientific_name),
    form: readNestedName(formulationObj?.formulation_name ?? formulationObj, raw.form_name ?? raw.form),
    formId: readNestedId(formulationObj, raw.formulation_id),
    cfu: readNestedName(cfuObj?.cfu_name ?? cfuObj, raw.cfu),
    cfuId: readNestedId(cfuObj, raw.cfu_id, "cfu_id"),
    authority: asString(raw.authority),
    packagingUnit: asString(raw.packing_unit ?? raw.packaging_unit),
    unitPerCase: toNullableNumber(raw.unit_per_packing ?? raw.unit_per_case ?? raw.units_per_case),
    mou: asString(raw.mou),
    grossWeight: toNullableNumber(raw.gross_weight),
    netWeight: toNullableNumber(raw.net_weight ?? raw.net_weight_per_packaging_unit),
    gstRate: gstObj ? `${asString(gstObj.gstPercentage)}%` : asString(raw.gst_rate),
    gstUuid: readNestedId(gstObj, raw.gst_rate_id ?? raw.gst_id),
    hsnId: toNullableNumber(raw.hsn_id),
    gstId: toNullableNumber(raw.gst_id),
    assets: mapAssets(raw.assets),
  };
}

function mapDetail(raw: Record<string, unknown>): ProductListRecord {
  // mapDetail reuses mapItem so nested-object handling is centralised
  const mapped = mapItem(raw, -1);
  mapped.id = Number(raw.sr_no) > 0 ? Number(raw.sr_no) : 0;
  return mapped;
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
    return asString(data?.previewNumber);
  },

  async create(payload: ProductCreatePayload, images: File[] = []): Promise<void> {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (key === "assets") {
        formData.append("assets", JSON.stringify(value));
        return;
      }
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    images.forEach((file) => {
      formData.append("product_image", file);
    });

    const response = await axiosInstance.post(
      API_ENDPOINTS.MASTER.PRODUCT.CREATE,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );

    const body = response.data as Record<string, unknown>;
    if (!body.success) {
      throw new Error(asString(body.message) || "Failed to create product.");
    }
  },

  async update(id: string, payload: ProductUpdatePayload, images: File[] = []): Promise<void> {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (key === "assets") {
        formData.append("assets", JSON.stringify(value));
        return;
      }
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    images.forEach((file) => {
      formData.append("product_image", file);
    });

    const response = await axiosInstance.put(
      API_ENDPOINTS.MASTER.PRODUCT.UPDATE(id),
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
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
