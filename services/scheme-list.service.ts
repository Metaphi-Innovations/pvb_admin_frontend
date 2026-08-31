import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";

export type SchemeApiType =
  | "PRODUCT_DISCOUNT"
  | "NEAR_EXPIRY"
  | "CASH_DISCOUNT"
  | "TURNOVER_DISCOUNT"
  | "SPECIAL_SCHEME";

export type SchemeSettlementType = "INVOICE_DISCOUNT" | "CREDIT_NOTE";

export type SchemeApprovalStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED";

export interface SchemeListParams {
  page: number;
  pageSize: number;
  search: string;
  ordering?: string;
  status: "all" | "active" | "inactive";
  apiFilters?: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface SchemeListRecord {
  id: string;
  srNo: number;
  schemeCode: string;
  schemeName: string;
  schemeType: SchemeApiType;
  schemeTypeLabel: string;
  settlementType: SchemeSettlementType;
  settlementTypeLabel: string;
  approvalStatus: SchemeApprovalStatus;
  approvalStatusLabel: string;
  description: string;
  startDate: string;
  endDate: string;
  validityLabel: string;
  customerTypeScope: string;
  customerScope: string;
  stateScope: string;
  productScope: string;
  status: "Active" | "Inactive";
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface SchemeListResult {
  items: SchemeListRecord[];
  total: number;
}

export interface SchemeExportParams {
  search: string;
  status: "all" | "active" | "inactive";
  ordering?: string;
  apiFilters?: Record<string, unknown>;
}

export interface SchemeFilterOption {
  label: string;
  value: string;
}

export type SchemeFilterField =
  | "scheme_code"
  | "scheme_name"
  | "scheme_type"
  | "settlement_type"
  | "approval_status"
  | "description"
  | "is_active"
  | "created_by_user__username"
  | "created_by_user__first_name"
  | "created_by_user__last_name"
  | "updated_by_user__username"
  | "updated_by_user__first_name"
  | "updated_by_user__last_name";

export interface SchemeDropdownItem {
  id: string;
  name: string;
}

export interface SchemeSummary {
  totalRecords: number;
  activeRecords: number;
  inactiveRecords: number;
}

/** Maps UI column keys to backend ORDERING_FIELD_MAP keys. */
const SORT_KEY_TO_ORDERING: Record<string, string> = {
  schemeCode: "schemeCode",
  schemeName: "schemeName",
  schemeType: "schemeType",
  settlementType: "settlementType",
  approvalStatus: "approvalStatus",
  startDate: "startDate",
  endDate: "endDate",
  status: "isActive",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
  createdBy: "createdAt",
  updatedBy: "updatedAt",
};

export const SCHEME_TYPE_LABELS: Record<SchemeApiType, string> = {
  PRODUCT_DISCOUNT: "Product Discount",
  NEAR_EXPIRY: "Near Expiry",
  CASH_DISCOUNT: "Cash Discount",
  TURNOVER_DISCOUNT: "Turnover Discount",
  SPECIAL_SCHEME: "Special Discount",
};

export const SETTLEMENT_TYPE_LABELS: Record<SchemeSettlementType, string> = {
  INVOICE_DISCOUNT: "Invoice Discount",
  CREDIT_NOTE: "Credit Note",
};

export const APPROVAL_STATUS_LABELS: Record<SchemeApprovalStatus, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export function sortStateToOrdering(
  key: string,
  direction: "asc" | "desc" | "none",
): string {
  if (!key || direction === "none") return "";
  const field = SORT_KEY_TO_ORDERING[key];
  if (!field) return "";
  return direction === "desc" ? `-${field}` : field;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "");
}

function toStatus(value: unknown): "Active" | "Inactive" {
  return value === true ? "Active" : "Inactive";
}

function toDisplayName(user: unknown, fallbackName?: unknown): string {
  if (typeof fallbackName === "string" && fallbackName.trim()) {
    return fallbackName.trim();
  }
  if (!user || typeof user !== "object") return "";
  const record = user as Record<string, unknown>;
  const username = asString(record.username).trim();
  if (username) return username;
  const first = asString(record.first_name).trim();
  const last = asString(record.last_name).trim();
  return `${first} ${last}`.trim();
}

function formatDate(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const raw = asString(value).trim();
  if (!raw || raw === "null" || raw === "undefined") return "";
  // ISO or date-only
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return raw.slice(0, 10);
}

function formatValidity(start: string, end: string): string {
  if (!start && !end) return "—";
  if (start && end) return `${start} → ${end}`;
  return start || end;
}

function asSchemeType(value: unknown): SchemeApiType {
  const raw = asString(value);
  if (raw in SCHEME_TYPE_LABELS) return raw as SchemeApiType;
  return "PRODUCT_DISCOUNT";
}

function asSettlementType(value: unknown): SchemeSettlementType {
  const raw = asString(value);
  if (raw in SETTLEMENT_TYPE_LABELS) return raw as SchemeSettlementType;
  return "CREDIT_NOTE";
}

function asApprovalStatus(value: unknown): SchemeApprovalStatus {
  const raw = asString(value);
  if (raw in APPROVAL_STATUS_LABELS) return raw as SchemeApprovalStatus;
  return "APPROVED";
}

function mapListItem(
  raw: Record<string, unknown>,
  fallbackIndex = 0,
): SchemeListRecord {
  const srNo = Number(raw.sr_no);
  const schemeType = asSchemeType(raw.scheme_type);
  const settlementType = asSettlementType(raw.settlement_type);
  const approvalStatus = asApprovalStatus(raw.approval_status);
  const startDate = formatDate(raw.start_date);
  const endDate = formatDate(raw.end_date);

  return {
    id: asString(raw.scheme_id),
    srNo: Number.isFinite(srNo) && srNo > 0 ? srNo : fallbackIndex + 1,
    schemeCode: asString(raw.scheme_code),
    schemeName: asString(raw.scheme_name),
    schemeType,
    schemeTypeLabel: SCHEME_TYPE_LABELS[schemeType],
    settlementType,
    settlementTypeLabel: SETTLEMENT_TYPE_LABELS[settlementType],
    approvalStatus,
    approvalStatusLabel: APPROVAL_STATUS_LABELS[approvalStatus],
    description: asString(raw.description),
    startDate,
    endDate,
    validityLabel: formatValidity(startDate, endDate),
    customerTypeScope: asString(raw.customer_type_scope || "ALL"),
    customerScope: asString(raw.customer_scope || "ALL"),
    stateScope: asString(raw.state_scope || "ALL"),
    productScope: asString(raw.product_scope || "ALL"),
    status: toStatus(raw.is_active),
    createdAt: formatDate(raw.created_at),
    updatedAt: formatDate(raw.updated_at),
    createdBy: toDisplayName(raw.created_by_user, raw.createdByName),
    updatedBy: toDisplayName(raw.updated_by_user, raw.updatedByName),
  };
}

function mapFilterOptions(
  data: unknown[],
  fieldName: SchemeFilterField,
): SchemeFilterOption[] {
  const options: SchemeFilterOption[] = [];
  const seen = new Set<string>();

  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const record = row as Record<string, unknown>;
    const raw = record[fieldName];
    const value = asString(raw).trim();
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

    if (fieldName === "scheme_type") {
      const type = asSchemeType(value);
      options.push({ label: SCHEME_TYPE_LABELS[type], value: type });
      continue;
    }

    if (fieldName === "settlement_type") {
      const type = asSettlementType(value);
      options.push({ label: SETTLEMENT_TYPE_LABELS[type], value: type });
      continue;
    }

    if (fieldName === "approval_status") {
      const status = asApprovalStatus(value);
      options.push({ label: APPROVAL_STATUS_LABELS[status], value: status });
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

export type SchemeCreatePayload = Record<string, unknown>;
export type SchemeUpdatePayload = Record<string, unknown>;

export interface EligibleProductDiscountApiOffer {
  scheme_id: string;
  scheme_code: string;
  scheme_name: string;
  discount_type: "Percentage" | "Flat";
  discount_value: number;
  discount_amount: number;
  final_rate: number;
  start_date: string | null;
  end_date: string | null;
  apply_discount_on: string;
  scheme_snapshot: Record<string, unknown>;
}

export interface EligibleProductDiscountApiResult {
  schemes: EligibleProductDiscountApiOffer[];
  recommended: EligibleProductDiscountApiOffer | null;
}

export interface EligibleProductDiscountParams {
  product_id: string;
  order_date: string;
  unit_price: number;
  customer_id?: string | null;
  customer_type_id?: string | null;
  state_name?: string | null;
  signal?: AbortSignal;
}

export const SchemeListService = {
  async list(params: SchemeListParams): Promise<SchemeListResult> {
    const ordering = encodeURIComponent(params.ordering ?? "");

    const response = await axiosInstance.post(
      `${API_ENDPOINTS.MASTER.SCHEME.LIST}?page=${params.page}&limit=${params.pageSize}&search=${encodeURIComponent(params.search)}&ordering=${ordering}`,
      { filters: params.apiFilters ?? {} },
      { signal: params.signal },
    );

    const payload = response.data as Record<string, unknown>;
    const data = payload.data;

    if (!Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an array.");
    }

    const items = data.map((row, idx) =>
      mapListItem((row ?? {}) as Record<string, unknown>, idx),
    );

    const totalRecords = Number(payload.totalRecords ?? payload.count);
    const total = Number.isFinite(totalRecords) ? totalRecords : items.length;

    return { items, total };
  },

  async view(id: string): Promise<Record<string, unknown>> {
    const response = await axiosInstance.get(API_ENDPOINTS.MASTER.SCHEME.VIEW(id));
    const payload = response.data as Record<string, unknown>;
    const data = payload.data;

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an object.");
    }

    return data as Record<string, unknown>;
  },

  async create(payload: SchemeCreatePayload): Promise<Record<string, unknown>> {
    const response = await axiosInstance.post(
      API_ENDPOINTS.MASTER.SCHEME.CREATE,
      payload,
    );

    const body = response.data as Record<string, unknown>;
    if (!body.success) {
      throw new Error(asString(body.message) || "Failed to create scheme.");
    }
    return (body.data as Record<string, unknown>) ?? {};
  },

  async update(
    id: string,
    payload: SchemeUpdatePayload,
  ): Promise<Record<string, unknown>> {
    const response = await axiosInstance.put(
      API_ENDPOINTS.MASTER.SCHEME.UPDATE(id),
      payload,
    );

    const body = response.data as Record<string, unknown>;
    if (!body.success) {
      throw new Error(asString(body.message) || "Failed to update scheme.");
    }
    return (body.data as Record<string, unknown>) ?? {};
  },

  async updateStatus(id: string, isActive: boolean): Promise<void> {
    const response = await axiosInstance.patch(
      API_ENDPOINTS.MASTER.SCHEME.STATUS_UPDATE(id),
      { is_active: isActive },
    );

    const body = response.data as Record<string, unknown>;
    if (!body.success) {
      throw new Error(asString(body.message) || "Failed to update scheme status.");
    }
  },

  async getFilterDropdown(
    fieldName: SchemeFilterField,
    signal?: AbortSignal,
  ): Promise<SchemeFilterOption[]> {
    const response = await axiosInstance.get(
      API_ENDPOINTS.MASTER.SCHEME.FILTER_DROPDOWN,
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

  async dropdown(signal?: AbortSignal): Promise<SchemeDropdownItem[]> {
    const response = await axiosInstance.get(API_ENDPOINTS.MASTER.SCHEME.DROPDOWN, {
      signal,
    });
    const payload = response.data as Record<string, unknown>;
    const data = payload.data;
    if (!Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an array.");
    }

    return data.map((row) => {
      const record = (row ?? {}) as Record<string, unknown>;
      return {
        id: asString(record.scheme_id),
        name: asString(record.scheme_name),
      };
    });
  },

  async previewNumber(signal?: AbortSignal): Promise<string> {
    const response = await axiosInstance.get(
      API_ENDPOINTS.MASTER.SCHEME.PREVIEW_NUMBER,
      { signal },
    );
    const payload = response.data as Record<string, unknown>;
    const data = (payload.data ?? {}) as Record<string, unknown>;
    return asString(data.scheme_code);
  },

  async eligibleProductDiscount(
    params: EligibleProductDiscountParams,
  ): Promise<EligibleProductDiscountApiResult> {
    const response = await axiosInstance.post(
      API_ENDPOINTS.MASTER.SCHEME.ELIGIBLE_PRODUCT_DISCOUNT,
      {
        product_id: params.product_id,
        order_date: params.order_date,
        unit_price: params.unit_price,
        customer_id: params.customer_id ?? null,
        customer_type_id: params.customer_type_id ?? null,
        state_name: params.state_name ?? null,
      },
      { signal: params.signal },
    );
    const payload = response.data as Record<string, unknown>;
    const data = (payload.data ?? {}) as Record<string, unknown>;
    const schemes = Array.isArray(data.schemes)
      ? (data.schemes as EligibleProductDiscountApiOffer[])
      : [];
    const recommended =
      data.recommended && typeof data.recommended === "object"
        ? (data.recommended as EligibleProductDiscountApiOffer)
        : null;
    return { schemes, recommended };
  },

  async summary(signal?: AbortSignal): Promise<SchemeSummary> {
    const response = await axiosInstance.get(API_ENDPOINTS.MASTER.SCHEME.SUMMARY, {
      signal,
    });
    const payload = response.data as Record<string, unknown>;
    const data = (payload.data ?? {}) as Record<string, unknown>;
    return {
      totalRecords: Number(data.totalRecords ?? 0),
      activeRecords: Number(data.activeRecords ?? 0),
      inactiveRecords: Number(data.inactiveRecords ?? 0),
    };
  },

  async export(params: SchemeExportParams): Promise<void> {
    const ordering = encodeURIComponent(params.ordering ?? "");

    const response = await axiosInstance.post(
      `${API_ENDPOINTS.MASTER.SCHEME.EXPORT}?search=${encodeURIComponent(params.search)}&ordering=${ordering}`,
      { filters: params.apiFilters ?? {} },
      { responseType: "blob" },
    );

    const contentType = String(response.headers["content-type"] ?? "");
    if (contentType.includes("application/json")) {
      const text = await (response.data as Blob).text();
      let message = "No records found to export.";
      try {
        const json = JSON.parse(text) as Record<string, unknown>;
        message = String(json.message ?? message);
      } catch {
        // keep default message
      }
      throw new Error(message);
    }

    const blob = response.data as Blob;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `schemes_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  mapListItem,
  extractErrorMessage,
};
