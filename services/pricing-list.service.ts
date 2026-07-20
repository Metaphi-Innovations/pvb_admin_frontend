import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";

export interface PricingListParams {
  page: number;
  pageSize: number;
  search: string;
  ordering?: string;
  status: "all" | "active" | "inactive";
  apiFilters?: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface PricingExportParams {
  search: string;
  status: "all" | "active" | "inactive";
  ordering?: string;
  apiFilters?: Record<string, unknown>;
}

export interface PricingCreatePayload {
  product_id: string;
  state_name: string;
  customer_type_id: string;
  cost_price?: number | null;
  dealer_price: number;
  is_active?: boolean;
}

export interface PricingUpdatePayload extends PricingCreatePayload {}

export interface PricingListRecord {
  id: number;
  pricingUuid: string;
  productUuid: string;
  productCode: string;
  sku: string;
  productName: string;
  supplierName: string;
  supplierCode: string;
  segment: string;
  category: string;
  baseUnit: string;
  mou: string;
  unit: string;
  uom: string;
  packSize: string;
  unitsPerCase: number;
  hsnCode: string;
  gstPct: string;
  productDealerPrice: number;
  customerType: string;
  customerTypeId: string;
  state: string;
  effectiveFrom: string;
  effectiveTo: string;
  priceListName: string;
  costPrice: number;
  mrp: number;
  distributorPrice: number;
  dealerPrice: number;
  retailPrice: number;
  farmerPrice: number;
  specialPrice: number;
  discountType: "";
  discountValue: number;
  netSellingPrice: number;
  status: "active" | "inactive";
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PricingListResult {
  items: PricingListRecord[];
  total: number;
}

export interface PricingSummary {
  totalRecords: number;
  activeRecords: number;
  inactiveRecords: number;
  uniqueStates: number;
  bulkPriceLists: number;
}

export interface PricingProductDropdownItem {
  product_id: string;
  product_name: string;
  product_code: string;
}

export interface PricingFilterOption {
  label: string;
  value: string;
}

export type PricingFilterField =
  | "state_name"
  | "dealer_price"
  | "is_active"
  | "product__product_name"
  | "product__product_code"
  | "product__sku"
  | "product__supplier_code"
  | "product__supplier__supplier_name"
  | "product__category__categoryName"
  | "product__segment__segment_name"
  | "product__pack_size"
  | "product__unit"
  | "product__mou"
  | "product__mrp"
  | "product__gst_rate__gstPercentage"
  | "product__hsn__hsnCode"
  | "customer_type__customer_type_name"
  | "created_by_user__username"
  | "updated_by_user__username";

const SORT_FIELD_MAP: Record<string, string> = {
  productCode: "product__product_code",
  productName: "product__product_name",
  sku: "product__sku",
  state: "state_name",
  customerType: "customer_type__customer_type_name",
  dealerPrice: "dealer_price",
  costPrice: "cost_price",
  status: "is_active",
  createdAt: "created_at",
  updatedAt: "updated_at",
  createdBy: "created_by_user__username",
  updatedBy: "updated_by_user__username",
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

function asString(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "");
}

function toNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function toStatus(value: unknown): "active" | "inactive" {
  return value === true || String(value).toLowerCase() === "active" ? "active" : "inactive";
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

function readNestedName(obj: unknown, ...keys: string[]): string {
  if (!obj || typeof obj !== "object") return "";
  const record = obj as Record<string, unknown>;
  for (const key of keys) {
    const val = asString(record[key]).trim();
    if (val) return val;
  }
  return "";
}

function mapItem(raw: Record<string, unknown>, fallbackIndex: number): PricingListRecord {
  const srNo = Number(raw.sr_no);
  const product = (raw.product ?? {}) as Record<string, unknown>;
  const customerType = (raw.customer_type ?? {}) as Record<string, unknown>;
  const dealerPrice = toNumber(raw.dealer_price);

  return {
    id: Number.isFinite(srNo) && srNo > 0 ? srNo : fallbackIndex + 1,
    pricingUuid: asString(raw.id),
    productUuid: asString(raw.product_id),
    productCode: asString(product.product_code),
    sku: asString(product.sku),
    productName: asString(product.product_name),
    supplierName: readNestedName(product.supplier, "supplier_name"),
    supplierCode: asString(product.supplier_code),
    segment: readNestedName(product.segment, "segment_name"),
    category: readNestedName(product.category, "categoryName"),
    baseUnit: asString(product.unit),
    mou: asString(product.mou),
    unit: asString(product.unit),
    uom: asString(product.packing_unit),
    packSize: asString(product.pack_size),
    unitsPerCase: toNumber(product.unit_per_packing) || 1,
    hsnCode: readNestedName(product.hsn, "hsnCode"),
    gstPct: readNestedName(product.gst_rate, "gstPercentage"),
    productDealerPrice: dealerPrice,
    customerType: asString(customerType.customer_type_name),
    customerTypeId: asString(raw.customer_type_id),
    state: asString(raw.state_name),
    effectiveFrom: formatDate(raw.created_at),
    effectiveTo: "",
    priceListName: "",
    costPrice: toNumber(raw.cost_price),
    mrp: toNumber(product.mrp),
    distributorPrice: dealerPrice,
    dealerPrice,
    retailPrice: dealerPrice,
    farmerPrice: 0,
    specialPrice: 0,
    discountType: "",
    discountValue: 0,
    netSellingPrice: dealerPrice,
    status: toStatus(raw.is_active),
    createdBy: toDisplayName(raw.created_by_user),
    updatedBy: toDisplayName(raw.updated_by_user),
    createdAt: formatDate(raw.created_at),
    updatedAt: formatDate(raw.updated_at),
  };
}

function mapDetail(raw: Record<string, unknown>): PricingListRecord {
  return mapItem(raw, -1);
}

function normalizeFilterValue(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  if (typeof raw === "object" && raw !== null && "toString" in raw) {
    const text = String((raw as { toString: () => string }).toString()).trim();
    if (text && text !== "[object Object]") return text;
  }
  return String(raw).trim();
}

function mapFilterOptions(
  data: unknown[],
  fieldName: PricingFilterField,
): PricingFilterOption[] {
  const options: PricingFilterOption[] = [];
  const seen = new Set<string>();

  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const record = row as Record<string, unknown>;
    const raw = record[fieldName];
    const value = normalizeFilterValue(raw);
    if (!value || seen.has(value)) continue;
    seen.add(value);

    if (fieldName === "is_active") {
      const active = raw === true || value.toLowerCase() === "true";
      options.push({
        label: active ? "Active" : "Inactive",
        value: active ? "active" : "inactive",
      });
      continue;
    }

    options.push({ label: value, value });
  }

  return options.sort((a, b) => a.label.localeCompare(b.label));
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

function toBackendFilters(apiFilters?: Record<string, unknown>): Record<string, unknown> {
  if (!apiFilters) return {};
  const filters = { ...apiFilters };

  if (typeof filters.is_active === "boolean") {
    return filters;
  }

  const status = filters.status ?? filters.is_active;
  if (status !== undefined) {
    delete filters.status;
    const token = Array.isArray(status) ? String(status[0]) : String(status);
    const normalized = token.trim().toLowerCase();
    if (normalized === "active") filters.is_active = true;
    else if (normalized === "inactive") filters.is_active = false;
  }

  return filters;
}

function mapSummary(data: Record<string, unknown>): PricingSummary {
  return {
    totalRecords: toNumber(data.totalRecords),
    activeRecords: toNumber(data.activeRecords),
    inactiveRecords: toNumber(data.inactiveRecords),
    uniqueStates: toNumber(data.uniqueStates),
    bulkPriceLists: toNumber(data.bulkPriceLists),
  };
}

export const PricingListService = {
  async list(params: PricingListParams): Promise<PricingListResult> {
    const ordering = encodeURIComponent(params.ordering ?? "");
    const backendFilters = toBackendFilters(params.apiFilters);

    const response = await axiosInstance.post(
      `${API_ENDPOINTS.MASTER.PRICING.LIST}?page=${params.page}&limit=${params.pageSize}&search=${encodeURIComponent(params.search)}&ordering=${ordering}`,
      { filters: backendFilters },
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

  async getSummary(signal?: AbortSignal): Promise<PricingSummary> {
    const response = await axiosInstance.get(
      API_ENDPOINTS.MASTER.PRICING.SUMMARY,
      { signal },
    );

    const payload = response.data as Record<string, unknown>;
    const data = payload.data;

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an object.");
    }

    return mapSummary(data as Record<string, unknown>);
  },

  async view(id: string): Promise<PricingListRecord> {
    const response = await axiosInstance.get(API_ENDPOINTS.MASTER.PRICING.VIEW(id));
    const payload = response.data as Record<string, unknown>;
    const data = payload.data;

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an object.");
    }

    return mapDetail(data as Record<string, unknown>);
  },

  async create(payload: PricingCreatePayload): Promise<void> {
    const response = await axiosInstance.post(
      API_ENDPOINTS.MASTER.PRICING.CREATE,
      payload,
    );

    const body = response.data as Record<string, unknown>;
    if (!body.success) {
      throw new Error(asString(body.message) || "Failed to create pricing record.");
    }
  },

  async update(id: string, payload: PricingUpdatePayload): Promise<void> {
    const response = await axiosInstance.put(
      API_ENDPOINTS.MASTER.PRICING.UPDATE(id),
      payload,
    );

    const body = response.data as Record<string, unknown>;
    if (!body.success) {
      throw new Error(asString(body.message) || "Failed to update pricing record.");
    }
  },

  async updateStatus(id: string, isActive: boolean): Promise<void> {
    const response = await axiosInstance.patch(
      API_ENDPOINTS.MASTER.PRICING.STATUS_UPDATE(id),
      { is_active: isActive },
    );

    const body = response.data as Record<string, unknown>;
    if (!body.success) {
      throw new Error(asString(body.message) || "Failed to update pricing status.");
    }
  },

  async export(params: PricingExportParams): Promise<void> {
    const ordering = encodeURIComponent(params.ordering ?? "");
    const backendFilters = toBackendFilters(params.apiFilters);

    const response = await axiosInstance.post(
      `${API_ENDPOINTS.MASTER.PRICING.EXPORT}?search=${encodeURIComponent(params.search)}&ordering=${ordering}`,
      { filters: backendFilters },
      { responseType: "blob" },
    );

    const blob = response.data as Blob;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `product_pricing_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  async getFilterDropdown(
    fieldName: PricingFilterField,
    signal?: AbortSignal,
  ): Promise<PricingFilterOption[]> {
    const response = await axiosInstance.get(
      API_ENDPOINTS.MASTER.PRICING.FILTER_DROPDOWN,
      {
        params: { field_name: fieldName },
        signal,
      },
    );

    const payload = response.data as Record<string, unknown>;
    const data = payload.data;
    if (!Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an array.");
    }

    return mapFilterOptions(data, fieldName);
  },

  async getProductDropdown(signal?: AbortSignal): Promise<PricingProductDropdownItem[]> {
    const response = await axiosInstance.get(
      API_ENDPOINTS.MASTER.PRICING.PRODUCT_DROPDOWN,
      { signal },
    );

    const payload = response.data as Record<string, unknown>;
    const data = payload.data;
    if (!Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an array.");
    }

    return data.map((row) => {
      const record = (row ?? {}) as Record<string, unknown>;
      return {
        product_id: asString(record.product_id),
        product_name: asString(record.product_name),
        product_code: asString(record.product_code),
      };
    });
  },

  extractErrorMessage,
};
